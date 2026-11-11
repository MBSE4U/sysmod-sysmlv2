// Model editor for SysML v2 textual notation.
//
// A model editor executes the EEE editing commands of the views (matrix, step definition, policy, form):
//   addElement(ownerId, lines)                    insert a declaration into the body of an element
//   setValue(ownerId, feature, valueText | null)  set, change or remove ":>> feature = value;"
//   setValues(ownerId, [[feature, valueText]])    several values in one edit
//   setDoc(id, text)                              set or change the doc comment of an element
//   renameElement(id, newName, scopeId)
//   deleteElement(id)
// and builds the declarations of the EEE elements (roleLines, processStepLines, transitionLines, ...).
//
// This editor answers each command with a list of text edits [{ document, start, end, text }] that the
// workspace applies. A model editor for the SysML v2 API answers the same commands with a commit of
// element changes instead.

import { buildOutline, locate as locateInOutline, lineIndent, tokenize } from "../text/sysml-text.js";

const INDENT = "    ";
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const QUALIFIED_NAME = /^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/;
// A reference: a qualified name or a feature chain, with unrestricted names in quotes, e.g. env.'Model Architecture'.
const SEGMENT = "(?:[A-Za-z_][A-Za-z0-9_]*|'[^'\\r\\n]*')";
const REFERENCE = new RegExp(`^${SEGMENT}(?:::${SEGMENT})*(?:\\.${SEGMENT}(?:::${SEGMENT})*)*$`);

export class ModelEditError extends Error {}

export function checkName(name, what = "name", pattern = NAME) {
    if (!pattern.test(name || "")) throw new ModelEditError(`The ${what} "${name || ""}" is not a valid name (letters, digits, _; no leading digit).`);
}

// ---------- value expressions ----------

/** A string literal. */
export function stringLiteral(text) {
    return `"${String(text).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r?\n/g, " ")}"`;
}

/** A value expression from a list of expressions: "a", "(a, b)", or null for an empty list. */
export function listValue(items) {
    if (!items.length) return null;
    return items.length === 1 ? items[0] : `(${items.join(", ")})`;
}

/** A reference to an element, by a (qualified) name that the engine resolves. */
export function referenceValue(name) {
    checkName(name, "reference", REFERENCE);
    return name;
}

/** A name as it is written in the text: in quotes if it is not a basic name. */
export function quoteName(name) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || /^'.*'$/.test(name) ? name : `'${name.replace(/'/g, "\\'")}'`;
}

/** The declaration of a role, tool, method or product in an MBSE environment (MBSEMethodology). */
export function environmentElementLines(kind, name, doc = "") {
    checkName(name);
    const head = {
        role: `part ${name} : MBSEMethodology::Role :> roles`,
        tool: `part ${name} :> tools`,
        method: `action ${name} : MBSEMethodology::Method`,
        product: `item ${name} : MBSEMethodology::Product`,
    }[kind];
    return [doc ? `${head} { ${docComment(doc, "")} }` : `${head};`];
}

function docComment(text, indent) {
    const lines = String(text).replace(/\*\//g, "* /").split(/\r?\n/);
    if (lines.length === 1) return `doc /* ${lines[0]} */`;
    return `doc\n${indent}/* ${lines.join(`\n${indent} * `)}\n${indent} */`;
}

// ---------- declarations of EEE elements ----------

/** @param {{name: string, role?: string, tool?: string, method?: string}} options references by name */
export function processStepLines({ name, role = "", tool = "", method = "" }) {
    checkName(name);
    const values = [["role", role], ["tool", tool], ["method", method]].filter(([, v]) => v)
        .map(([feature, v]) => `${INDENT}:>> ${feature} = ${referenceValue(v)};`);
    return values.length ? [`#processStep action ${name} {`, ...values, "}"] : [`#processStep action ${name};`];
}

export function transitionLines({ name, source, target, evaluation = "unrated", priority = null }) {
    checkName(name);
    const lines = [`#stepTransition connection ${name} connect ${referenceValue(source)} to ${referenceValue(target)} {`,
        `${INDENT}:>> evaluation = TransitionEvaluation::${evaluation};`];
    if (priority) lines.push(`${INDENT}:>> priority = ${Number(priority)};`);
    lines.push("}");
    return lines;
}

export function measureLines({ name, description = "", transitions = [] }) {
    checkName(name);
    const body = [];
    if (description) body.push(INDENT + docComment(description, INDENT));
    const addressed = listValue(transitions.map(referenceValue));
    if (addressed) body.push(`${INDENT}:>> addressedTransitions = ${addressed};`);
    return body.length ? [`#measure occurrence ${name} {`, ...body.join("\n").split("\n"), "}"] : [`#measure occurrence ${name};`];
}

export function policyRuleLines({ name, tool, method, status }) {
    checkName(name);
    return [`#toolPolicyRule occurrence ${name} {`,
        `${INDENT}:>> tool = ${referenceValue(tool)};`,
        `${INDENT}:>> method = ${referenceValue(method)};`,
        `${INDENT}:>> status = PolicyStatus::${status};`,
        "}"];
}

// ---------- the editor ----------

export class TextModelEditor {
    /**
     * @param {{locate: function(string): object|null, documentText: function(string): string}} source
     *        locate(id) answers the source location of an element, documentText(name) the current text
     */
    constructor({ locate, documentText }) {
        this.locate = locate;
        this.documentText = documentText;
    }

    // ---------- adding ----------

    /** Inserts declarations at the end of the body of an element. */
    addElement(ownerId, lines) {
        return [this.insertIntoBody(ownerId, lines)];
    }

    // ---------- values ----------

    /**
     * Sets the value of a redefined feature of an element: ":>> feature = value;".
     * A null value removes the statement. A new statement is placed after the other value statements of the body.
     */
    setValue(ownerId, feature, valueText) {
        checkName(feature, "feature");
        const owner = this.requireNode(ownerId);
        const text = this.documentText(owner.document);
        const existing = owner.node.children.find(c => c.name === feature && /^\s*(ref\s+|attribute\s+|part\s+|action\s+|item\s+)*:>>/.test(text.slice(c.start, c.nameStart ?? c.start + 3)));
        if (valueText === null || valueText === undefined || valueText === "") {
            if (!existing) return [];
            return this.deleteRange(owner.document, existing.start, existing.end);
        }
        if (existing) {
            const headerEnd = existing.bodyOpen !== null ? existing.bodyOpen : existing.end - 1;
            const header = text.slice(existing.nameEnd, headerEnd);
            const assign = this.topLevelAssignment(header);
            if (assign >= 0) {
                return [{ document: owner.document, start: existing.nameEnd + assign, end: headerEnd, text: `= ${valueText}${existing.bodyOpen !== null ? " " : ""}` }];
            }
            return [{ document: owner.document, start: headerEnd, end: headerEnd, text: ` = ${valueText}` }];
        }
        const statement = `:>> ${feature} = ${valueText};`;
        const values = owner.node.children.filter(c => /^:>>/.test(text.slice(c.start, c.start + 3)));
        if (values.length) {
            const last = values[values.length - 1];
            return [{ document: owner.document, start: last.end, end: last.end, text: "\n" + lineIndent(text, last.start) + statement }];
        }
        const first = owner.node.children[0];
        if (first && owner.node.bodyOpen !== null) {
            return [{ document: owner.document, start: first.start, end: first.start, text: statement + "\n" + lineIndent(text, first.start) }];
        }
        return [this.insertIntoBody(ownerId, [statement])];
    }

    /**
     * Sets several values of an element in one edit: [[feature, valueText | null], ...].
     * Each value is set on the text that the previous ones produced.
     */
    setValues(ownerId, pairs) {
        const { document } = this.requireLocation(ownerId);
        const original = this.documentText(document);
        let text = original;
        for (const [feature, valueText] of pairs) {
            const staged = new TextModelEditor({
                locate: id => {
                    const node = locateInOutline(buildOutline(text), id);
                    return node ? { document, start: node.start, end: node.end, nameStart: node.nameStart, nameEnd: node.nameEnd, bodyOpen: node.bodyOpen, bodyClose: node.bodyClose } : null;
                },
                documentText: () => text,
            });
            text = applyEditsToText(text, staged.setValue(ownerId, feature, valueText));
        }
        if (text === original) return [];
        // One edit for the changed region.
        let start = 0;
        while (start < text.length && start < original.length && text[start] === original[start]) start++;
        let endOriginal = original.length, endText = text.length;
        while (endOriginal > start && endText > start && original[endOriginal - 1] === text[endText - 1]) { endOriginal--; endText--; }
        return [{ document, start, end: endOriginal, text: text.slice(start, endText) }];
    }

    /** Offset of the "=" of a value assignment in a declaration header (after the name), or -1. */
    topLevelAssignment(header) {
        let depth = 0;
        for (const t of tokenize(header)) {
            if (t.type !== "punct") continue;
            if (t.value === "(" || t.value === "[") depth++;
            else if (t.value === ")" || t.value === "]") depth--;
            else if (t.value === "=" && depth === 0) return t.start;
            else if ((t.value === ":" || t.value === ":=") && depth === 0 && header[t.start + 1] === "=") return t.start;
        }
        return -1;
    }

    /** Sets the doc comment of an element: replaces its first doc comment, or inserts one. Empty text removes it. */
    setDoc(id, docText) {
        const { document, node } = this.requireNode(id);
        const text = this.documentText(document);
        const indent = lineIndent(text, node.start) + INDENT;
        if (node.bodyOpen !== null) {
            const firstChild = node.children[0];
            const regionEnd = firstChild ? firstChild.start : node.bodyClose;
            const region = text.slice(node.bodyOpen + 1, regionEnd);
            const match = /\bdoc\s*\/\*[\s\S]*?\*\//.exec(region);
            if (match) {
                const start = node.bodyOpen + 1 + match.index, end = start + match[0].length;
                if (!docText) return this.deleteRange(document, start, end);
                return [{ document, start, end, text: docComment(docText, indent) }];
            }
        }
        if (!docText) return [];
        if (node.bodyOpen !== null) {
            return [{ document, start: node.bodyOpen + 1, end: node.bodyOpen + 1, text: "\n" + indent + docComment(docText, indent) }];
        }
        return [this.insertIntoBody(id, [docComment(docText, indent)])];
    }

    // ---------- changing ----------

    /**
     * Renames an element and the references to it:
     * - every use of the name within the scope (e.g. the package of the element)
     * - qualified references "owner::name" in the given documents
     * Other references, e.g. strings, are not changed; the SysML engine reports the ones that break.
     */
    renameElement(id, newName, scopeId = id, { documents = [] } = {}) {
        checkName(newName);
        const location = this.requireLocation(id);
        const scope = this.requireLocation(scopeId);
        if (scope.document !== location.document) throw new ModelEditError("The rename scope is in another document.");
        const text = this.documentText(location.document);
        const oldName = text.slice(location.nameStart, location.nameEnd);
        if (!oldName) throw new ModelEditError(`The declaration of ${id} has no name to rename.`);

        const edits = new Map();
        const add = (document, start, end) => edits.set(`${document}:${start}`, { document, start, end, text: newName });
        const scopeTokens = tokenize(text.slice(scope.start, scope.end));
        scopeTokens.forEach((t, i) => {
            // Not the name of a redefined feature (":>> role") with the same name as the element.
            const redefinition = i > 0 && scopeTokens[i - 1].value === ":>>";
            if (t.type === "ident" && !t.quoted && t.value === oldName && !redefinition) add(location.document, scope.start + t.start, scope.start + t.end);
        });
        add(location.document, location.nameStart, location.nameEnd);

        const segments = id.split("::");
        const ownerName = segments.length > 1 ? segments[segments.length - 2] : "";
        if (ownerName) {
            for (const document of new Set([location.document, ...documents])) {
                const tokens = tokenize(this.documentText(document));
                for (let i = 2; i < tokens.length; i++) {
                    const t = tokens[i];
                    if (t.type === "ident" && t.value === oldName && tokens[i - 1].value === "::" && tokens[i - 2].value === ownerName) {
                        add(document, t.start, t.end);
                    }
                    // Feature chains in other documents, e.g. env.oldName for an element of an MBSE environment.
                    if (document !== location.document && t.type === "ident" && t.value === oldName && tokens[i - 1].value === ".") {
                        add(document, t.start, t.end);
                    }
                }
            }
        }
        return [...edits.values()];
    }

    // ---------- deleting ----------

    /** Removes the declaration of an element, including its body and its lines. */
    deleteElement(id) {
        const location = this.requireLocation(id);
        return this.deleteRange(location.document, location.start, location.end);
    }

    deleteRange(document, start, end) {
        const text = this.documentText(document);
        const lineStart = text.lastIndexOf("\n", start - 1) + 1;
        if (/^[ \t]*$/.test(text.slice(lineStart, start))) start = lineStart;
        const after = /^[ \t]*(\r?\n)?/.exec(text.slice(end));
        end += after[0].length;
        return [{ document, start, end, text: "" }];
    }

    // ---------- helpers ----------

    requireLocation(id) {
        const location = this.locate(id);
        if (!location) throw new ModelEditError(`The declaration of ${id} was not found in the text.`);
        return location;
    }

    /** The outline node of an element (with its children), in the current text of its document. */
    requireNode(id) {
        const location = this.requireLocation(id);
        const node = locateInOutline(buildOutline(this.documentText(location.document)), id);
        if (!node) throw new ModelEditError(`The declaration of ${id} was not found in the text.`);
        return { document: location.document, node };
    }

    /** Inserts statements at the end of the body of an element, creating the body if it has none. */
    insertIntoBody(ownerId, lines) {
        const location = this.requireLocation(ownerId);
        const text = this.documentText(location.document);
        const indent = lineIndent(text, location.start);
        const inner = indent + INDENT;
        const block = lines.map(l => (l ? inner + l : l)).join("\n");

        if (location.bodyOpen !== null && location.bodyClose !== null) {
            const lineStart = text.lastIndexOf("\n", location.bodyClose - 1) + 1;
            const beforeClose = text.slice(lineStart, location.bodyClose);
            if (/^[ \t]*$/.test(beforeClose) && lineStart > location.bodyOpen) {
                return { document: location.document, start: lineStart, end: lineStart, text: block + "\n" };
            }
            return { document: location.document, start: location.bodyClose, end: location.bodyClose, text: "\n" + block + "\n" + indent };
        }
        // A declaration without a body ends with ";": replace it with a body.
        const semicolon = location.end - 1;
        if (text[semicolon] !== ";") throw new ModelEditError(`The declaration of ${ownerId} has an unexpected form.`);
        return { document: location.document, start: semicolon, end: location.end, text: " {\n" + block + "\n" + indent + "}" };
    }
}

/** Applies edits to a text; edits must not overlap. */
export function applyEditsToText(text, edits) {
    return [...edits].sort((a, b) => b.start - a.start)
        .reduce((current, e) => current.slice(0, e.start) + e.text + current.slice(e.end), text);
}
