// Engine core: the calls to the sysmlv2 WebAssembly module (@sysml/wasm of the Open-MBEE sysml-toolkit).
//
// The module parses and checks SysML v2 against the standard library: syntax, name resolution and semantic
// rules. The editor needs two things from it:
//   - diagnostics with their document and position
//   - the symbols of the user's documents, by qualified name (see analyze()), from which
//     EeeModelBuilder builds the EEE domain model
//
// This module has no DOM or worker dependencies, so the worker and the Node smoke test share it.

export class EngineError extends Error {
    constructor(message, code) {
        super(message);
        this.name = "EngineError";
        this.code = code;
    }
}

/**
 * Evaluates the wasm-bindgen glue (sysmlv2.js, an ES module without imports) and answers its exports.
 * Each call gives a new, uninitialized instance; a trapped instance is replaced by a new one.
 * The glue is evaluated as a function body, so a classic worker (the standalone build) can use it too.
 */
export function loadGlue(text) {
    const body = text
        .replace(/^export\s*\{[^}]*\};?[ \t]*$/m, "")
        .replace(/^export\s+(?=(?:async\s+)?function\b|class\b|const\b|let\b)/gm, "")
        // Only used for the default URL of the module, which the editor always passes.
        .replace(/import\.meta\.url/g, "\"file:///\"");
    if (/^\s*(import|export)\b/m.test(body)) throw new EngineError("the engine's JavaScript has an unexpected format");
    return new Function(`"use strict";\n${body}\nreturn { __wbg_init, Session, PreparedLibrary, lenientSources, version };`)();
}

/**
 * Starts the engine.
 * @param {string} glueText sysmlv2.js
 * @param {WebAssembly.Module|BufferSource} wasm sysmlv2_bg.wasm, compiled or as bytes
 * @param {{libraryBundle: string, libraryPrepared: Uint8Array}} library the standard library (decompressed)
 */
export async function createEngine(glueText, wasm, { libraryBundle, libraryPrepared }) {
    const sysml = loadGlue(glueText);
    await sysml.__wbg_init({ module_or_path: wasm });
    const library = sysml.PreparedLibrary.fromSnapshot(libraryPrepared, libraryBundle);
    return { sysml, library, version: sysml.version() };
}

/** A defect in the engine traps the module instance; it must not be used again. */
export function isTrap(e) {
    return typeof WebAssembly !== "undefined" && e instanceof WebAssembly.RuntimeError;
}

// ---------- positions ----------

const SEVERITIES = { error: "error", warning: "warning", warn: "warning", info: "info", hint: "info" };

/** The engine counts columns in UTF-8 bytes, the editor in UTF-16 code units (both 1-based). */
function charColumn(lineText, byteColumn) {
    let bytes = 0;
    let i = 0;
    while (i < lineText.length && bytes < byteColumn - 1) {
        const cp = lineText.codePointAt(i);
        bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
        i += cp > 0xffff ? 2 : 1;
    }
    return i + 1;
}

/**
 * Maps a line of a repaired text (see lenientSources) back to the original text.
 * @param {{line: number, linesRemoved: number}[]} drops the repairs of the unit, in original lines, ascending
 */
function originalLine(line, drops) {
    let result = line;
    for (const d of drops) {
        if (d.linesRemoved && result >= d.line) result += d.linesRemoved;
    }
    return result;
}

function positions(texts) {
    const lines = new Map();
    const linesOf = name => {
        if (!lines.has(name)) lines.set(name, (texts.get(name) || "").split("\n"));
        return lines.get(name);
    };
    /** Normalizes an engine finding to the editor's diagnostic. */
    return (f, { severity, code, drops = [] } = {}) => {
        const startLine = f.line ? originalLine(f.line, drops) : 0;
        const endLine = f.endLine ? originalLine(f.endLine, drops) : startLine;
        const unitLines = linesOf(f.unit);
        return {
            severity: severity || SEVERITIES[f.severity] || "info",
            message: f.message || "",
            code: code || f.rule || f.stage || "",
            file: f.unit || "",
            startLine,
            startCol: startLine ? charColumn(unitLines[startLine - 1] || "", f.col || 1) : 0,
            endLine,
            endCol: endLine ? charColumn(unitLines[endLine - 1] || "", f.endCol || f.col || 1) : 0,
        };
    };
}

// ---------- symbols ----------

const RELATIONSHIP_KINDS = {
    Subsetting: "subsets", ReferenceSubsetting: "subsets", CrossSubsetting: "subsets",
    Redefinition: "redefines",
    FeatureTyping: "typing", ConjugatedPortTyping: "typing",
    Subclassification: "specializes", Specialization: "specializes",
};

function lastSegment(id) {
    const i = id.lastIndexOf("::");
    return i < 0 ? id : id.slice(i + 2);
}

/** Reads a property that is a reference or a list of references, as element handles. Undeclared: []. */
function referenced(session, element, property) {
    let value;
    try {
        value = JSON.parse(session.property(element, property));
    } catch (_) {
        return [];
    }
    return (Array.isArray(value) ? value : value ? [value] : [])
        .map(ref => ref && ref["@id"] ? session.elementById(ref["@id"]) : undefined)
        .filter(Boolean);
}

function specializationsOf(session, element) {
    return referenced(session, element, "ownedSpecialization").map(relationship => {
        const [general] = referenced(session, relationship, "general");
        return {
            kind: RELATIONSHIP_KINDS[session.metaclass(relationship)] || "specializes",
            targetId: general ? session.qualifiedName(general) || "" : "",
        };
    });
}

function boundText(session, bound) {
    switch (session.metaclass(bound)) {
        case "LiteralInteger": return String(JSON.parse(session.property(bound, "value")));
        case "LiteralInfinity": return "*";
        case "FeatureReferenceExpression": {
            const [referent] = referenced(session, bound, "referent");
            return (referent && session.name(referent)) || "?";
        }
        default: return "?";
    }
}

/** The declared multiplicity as { lower, upper } strings ("0", "1", "*"), or null. */
function multiplicityOf(session, element) {
    const [range] = referenced(session, element, "multiplicity");
    if (!range) return null;
    const bounds = referenced(session, range, "bound").map(b => boundText(session, b));
    if (bounds.length === 0) return null;
    if (bounds.length === 1) return bounds[0] === "*" ? { lower: "0", upper: "*" } : { lower: bounds[0], upper: bounds[0] };
    return { lower: bounds[0], upper: bounds[1] };
}

/** Normalizes an evaluated value: element references become { ref: qualifiedName }, sequences arrays. */
function normalizeValue(value) {
    if (Array.isArray(value)) return value.map(normalizeValue);
    if (value && typeof value === "object") {
        if (value["@indeterminate"]) return undefined;
        if (typeof value.qualifiedName === "string") return { ref: value.qualifiedName };
        return undefined;
    }
    return value;
}

/**
 * The value of a feature with a feature value (e.g. ":>> role = architect;"):
 * { source, value } with the source text of the value expression and its evaluation (undefined if it
 * cannot be evaluated), or null if the feature has no value.
 */
function valueOf(session, element) {
    let source;
    try {
        source = session.valueSource(element);
    } catch (_) {
        return null;
    }
    if (!source) return null;
    try {
        return { source, value: normalizeValue(JSON.parse(session.evaluate(element))) };
    } catch (_) {
        return { source, value: undefined };
    }
}

/** The feature that a feature references by reference subsetting, e.g. a connector end ("connect a to b"). */
function referencedFeatureOf(session, element) {
    const [subsetting] = referenced(session, element, "ownedReferenceSubsetting");
    if (!subsetting) return "";
    const [feature] = referenced(session, subsetting, "referencedFeature");
    return feature ? session.qualifiedName(feature) || "" : "";
}

/**
 * Collects the named elements below the given roots, depth first. Symbol:
 *   { id, name, kind, childIds, specializations: [{kind, targetId}], multiplicity, types,
 *     value, valueText, referencedId, docs }
 * kind      the metaclass in lower camel case (e.g. "partUsage", "connectionUsage")
 * types     the given language types (e.g. "EEE::Role") that the element conforms to, also through a
 *           user-defined keyword (semantic metadata)
 * value     the evaluated feature value, if the element has one: a literal, { ref: qualifiedName }, or an array
 * valueText the source text of the feature value, if the element has one
 * referencedId  the qualified name of the feature that the element references (connector ends)
 * docs      the doc comments of the element
 */
function collectSymbols(session, roots, { limit = 20000, languageTypes = [] } = {}) {
    const symbols = {};
    let truncated = false;
    let count = 0;
    const types = languageTypes.map(name => ({ name, element: session.resolve(name) })).filter(t => t.element);

    const visit = element => {
        const id = session.qualifiedName(element);
        if (!id || symbols[id]) return id;
        if (count >= limit) { truncated = true; return null; }
        count++;
        const metaclass = session.metaclass(element);
        const symbol = {
            id,
            name: session.name(element) || lastSegment(id),
            kind: metaclass.charAt(0).toLowerCase() + metaclass.slice(1),
            childIds: [],
            specializations: specializationsOf(session, element),
            multiplicity: multiplicityOf(session, element),
            types: types.filter(t => session.conformsWithImplied(element, t.element)).map(t => t.name),
        };
        const value = valueOf(session, element);
        if (value) {
            symbol.valueText = value.source;
            if (value.value !== undefined) symbol.value = value.value;
        }
        const referencedId = referencedFeatureOf(session, element);
        if (referencedId) symbol.referencedId = referencedId;
        try {
            const docs = session.docs(element);
            if (docs && docs.length) symbol.docs = [...docs];
        } catch (_) { /* no docs */ }
        symbols[id] = symbol;
        for (const member of session.members(element)) {
            if (session.isLibraryElement(member)) continue;
            const childId = visit(member);
            if (childId && !symbol.childIds.includes(childId)) symbol.childIds.push(childId);
        }
        return id;
    };
    for (const root of roots) visit(root);
    return { symbols, truncated };
}

// ---------- analysis ----------

/**
 * Parses and checks the documents as one model, and collects the symbols of the documents that are not libraries.
 * Documents that do not parse are repaired for the model (members with parse errors are left out),
 * so the views keep working while the user types; the parse errors are reported.
 * @param {{sysml: object, library: object}} engine from createEngine()
 * @param {{name: string, content: string}[]} documents
 * @param {{libraryNames?: string[], languageTypes?: string[]}} options languageTypes: the definitions whose
 *        conformance is reported per symbol (symbol.types), e.g. ["EEE::Role", "EEE::Tool"]
 * @returns {{diagnostics: object[], documentRoots: {document: string, packageIds: string[]}[],
 *            symbols: Object<string, object>, truncated: boolean}}
 */
export function analyze(engine, documents, { libraryNames = [], languageTypes = [] } = {}) {
    const { sysml, library } = engine;
    const texts = new Map(documents.map(d => [d.name, d.content]));
    const diagnostic = positions(texts);
    const diagnostics = [];

    const sources = documents.map(d => ({ name: d.name, text: d.content }));
    const lenient = JSON.parse(sysml.lenientSources(JSON.stringify(sources)));
    const drops = new Map();
    for (const d of lenient.dropped) {
        diagnostics.push(diagnostic(d, { severity: "error", code: "parse" }));
        if (!drops.has(d.unit)) drops.set(d.unit, []);
        drops.get(d.unit).push(d);
    }
    for (const list of drops.values()) list.sort((a, b) => a.line - b.line);
    const unrepaired = new Set();
    for (const u of lenient.unrepaired) {
        unrepaired.add(u.unit);
        diagnostics.push(diagnostic(u, { severity: "error", code: "parse", drops: drops.get(u.unit) }));
    }

    const documentRoots = new Map(documents.map(d => [d.name, []]));
    const result = () => ({
        diagnostics,
        documentRoots: [...documentRoots].map(([document, packageIds]) => ({ document, packageIds })),
        symbols,
        truncated,
    });
    let symbols = {};
    let truncated = false;

    let session;
    try {
        session = sysml.Session.fromSourcesWithPreparedLibrary(
            JSON.stringify(lenient.sources.filter(s => !unrepaired.has(s.name))), library);
    } catch (e) {
        if (isTrap(e)) throw e;
        diagnostics.push({ severity: "error", message: String(e && e.message ? e.message : e), code: "engine", file: "", startLine: 0, startCol: 0, endLine: 0, endCol: 0 });
        return result();
    }
    try {
        for (const f of JSON.parse(session.check())) {
            diagnostics.push(diagnostic(f, { drops: drops.get(f.unit) }));
        }
        const unitNames = new Map(JSON.parse(session.units()).map(u => [u.unit, u.name]));
        const userRoots = [];
        for (const root of session.roots()) {
            const id = session.qualifiedName(root);
            const site = JSON.parse(session.declarationSite(root) || "null");
            const document = site ? unitNames.get(site.unit) : undefined;
            if (!id || !document) continue;
            if (documentRoots.has(document) && !documentRoots.get(document).includes(id)) documentRoots.get(document).push(id);
            if (!libraryNames.includes(document)) userRoots.push(root);
        }
        ({ symbols, truncated } = collectSymbols(session, userRoots, { languageTypes }));
    } finally {
        session.free();
    }
    return result();
}
