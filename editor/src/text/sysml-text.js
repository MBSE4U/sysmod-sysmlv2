// Lightweight, comment-aware outline of SysML v2 textual notation.
//
// The editor maps the qualified names of the engine's symbols to the text itself, with this outline.
// The editor needs positions to jump to a declaration, to change the values of elements and to insert
// new elements, so this module finds the declarations in the text. It is not a parser: it tracks
// braces, statements and declared names, which is enough to map a qualified name to its text.

export const KEYWORDS = new Set((
    "about abstract accept action actor after alias all allocate allocation analysis and as assert assign assume at " +
    "attribute bind binding by calc case comment concern connect connection constant constraint crosses decide def " +
    "default defined dependency derived do doc else end entry enum event exhibit exit expose false filter first flow " +
    "for fork frame from hastype if implies import in include individual inout interface istype item join language " +
    "library locale loop merge message meta metadata new nonunique not null objective occurrence of or ordered out " +
    "package parallel part perform port private protected public readonly redefines ref references render rendering " +
    "rep require requirement return satisfy send snapshot specializes stakeholder standard state subject subsets " +
    "succession terminate then timeslice to transition true until use variant variation verification verify via view " +
    "viewpoint when while xor feature type classifier class struct assoc behavior function predicate interaction " +
    "metaclass datatype connector step expr bool inv"
).split(" "));

// Keywords that declare a named element (or a usage) in front of its name.
const DECLARATION_KEYWORDS = new Set((
    "package part occurrence def attribute item port action state constraint requirement calc case analysis " +
    "verification use view viewpoint rendering concern enum metadata ref in out inout interface connection " +
    "allocation flow message individual snapshot timeslice event exhibit perform include subject actor stakeholder " +
    "objective alias frame transition entry exit do feature type classifier class struct datatype function " +
    "predicate behavior step expr abstract variation variant readonly derived constant end assert assume require " +
    "library standard"
).split(" "));

// Statements that never declare a named member.
const UNNAMED_STATEMENTS = new Set(["import", "doc", "comment", "bind", "connect", "first", "then", "succession",
    "satisfy", "verify", "return", "if", "else", "while", "for", "loop", "send", "accept", "assign", "dependency",
    "filter", "expose", "render"]);

/** Splits the text into tokens; comments and strings are kept as single tokens. */
export function tokenize(text) {
    const tokens = [];
    const n = text.length;
    let i = 0;
    while (i < n) {
        const c = text[i];
        if (c === " " || c === "\t" || c === "\r" || c === "\n") { i++; continue; }
        const start = i;
        if (c === "/" && text[i + 1] === "/") {
            while (i < n && text[i] !== "\n") i++;
            tokens.push({ type: "lineComment", start, end: i });
        } else if (c === "/" && text[i + 1] === "*") {
            const close = text.indexOf("*/", i + 2);
            i = close < 0 ? n : close + 2;
            tokens.push({ type: "comment", start, end: i });
        } else if (c === '"' || c === "'") {
            i++;
            while (i < n && text[i] !== c) { if (text[i] === "\\") i++; i++; }
            i = Math.min(n, i + 1);
            tokens.push(c === '"'
                ? { type: "string", start, end: i }
                : { type: "ident", start, end: i, value: text.slice(start + 1, i - 1), quoted: true });
        } else if (/[A-Za-z_]/.test(c)) {
            while (i < n && /[A-Za-z0-9_]/.test(text[i])) i++;
            tokens.push({ type: "ident", start, end: i, value: text.slice(start, i) });
        } else if (/[0-9]/.test(c)) {
            while (i < n && /[0-9.eE]/.test(text[i])) i++;
            tokens.push({ type: "number", start, end: i });
        } else {
            const three = text.substr(i, 3), two = text.substr(i, 2);
            const value = three === ":>>" || three === "::>" ? three
                : ["::", ":>", "->", "==", "!=", "<=", ">=", ".."].includes(two) ? two : c;
            i += value.length;
            tokens.push({ type: "punct", start, end: i, value });
        }
    }
    return tokens;
}

/** Answers the declared name of a statement header, or null for an unnamed statement. */
function declaredName(header) {
    let declared = false;
    for (let k = 0; k < header.length; k++) {
        const t = header[k];
        if (t.type === "punct") {
            if (t.value === "#" || t.value === "@") { k = skipQualifiedName(header, k + 1); declared = true; continue; }
            if (t.value === "<") { while (k < header.length && header[k].value !== ">") k++; continue; }
            if (t.value === ":>>" || t.value === ":>" || t.value === "::>") {
                const next = header[k + 1];
                if (next && next.type === "ident" && (declared || k === 0)) {
                    const end = skipQualifiedName(header, k + 1);
                    return { token: header[end], value: header[end].value };
                }
                return null;
            }
            if (t.value === "~") continue;
            return null; // an expression, a typing or a multiplicity before any name
        }
        if (t.type !== "ident") return null;
        if (!t.quoted && UNNAMED_STATEMENTS.has(t.value) && !declared) return null;
        if (!t.quoted && KEYWORDS.has(t.value)) {
            if (DECLARATION_KEYWORDS.has(t.value)) declared = true;
            continue;
        }
        if (k > 0 && header[k - 1].type === "punct" && header[k - 1].value === "::") continue;
        return declared ? { token: t, value: t.value } : null;
    }
    return null;
}

function skipQualifiedName(header, k) {
    while (k + 2 < header.length && header[k + 1].value === "::" && header[k + 2].type === "ident") k += 2;
    return k;
}

/**
 * Builds the outline of the text: a tree of declarations with their positions.
 * Node: { name, start, nameStart, nameEnd, bodyOpen, bodyClose, end, children, parent }
 * bodyOpen/bodyClose are the offsets of "{" and "}" (null for a declaration ending with ";").
 */
export function buildOutline(text) {
    const root = { name: "", start: 0, end: text.length, bodyOpen: -1, bodyClose: text.length, children: [], parent: null };
    let current = root;
    let header = [];
    let parens = 0;

    const finish = (end, bodyOpen = null) => {
        const named = parens === 0 ? declaredName(header) : null;
        const node = {
            name: named ? named.value : "",
            start: header.length ? header[0].start : end,
            nameStart: named ? named.token.start : null,
            nameEnd: named ? named.token.end : null,
            bodyOpen, bodyClose: null, end,
            children: [], parent: current,
        };
        header = [];
        parens = 0;
        return node;
    };

    for (const t of tokenize(text)) {
        if (t.type === "lineComment") continue;
        if (t.type === "comment") {
            // "doc /* ... */" and "comment /* ... */" end with their comment, not with a semicolon.
            if (header.length && header[0].type === "ident" && (header[0].value === "doc" || header[0].value === "comment")) {
                header = [];
                parens = 0;
            }
            continue;
        }
        if (t.type === "punct") {
            if (t.value === "(") parens++;
            else if (t.value === ")") parens = Math.max(0, parens - 1);
            else if (t.value === "{") {
                const node = finish(null, t.start);
                current.children.push(node);
                current = node;
                continue;
            } else if (t.value === "}") {
                if (current !== root) {
                    current.bodyClose = t.start;
                    current.end = t.end;
                    current = current.parent;
                }
                header = [];
                parens = 0;
                continue;
            } else if (t.value === ";" && parens === 0) {
                const node = finish(t.end);
                if (node.name) current.children.push(node);
                continue;
            }
        }
        header.push(t);
    }
    return root;
}

/** Finds the declaration of a qualified name ("P::M::t::a") in an outline, or null. */
export function locate(outline, qualifiedName) {
    let node = outline;
    for (const segment of splitQualifiedName(qualifiedName)) {
        node = findChild(node, segment);
        if (!node) return null;
    }
    return node === outline ? null : node;
}

function findChild(node, name) {
    for (const child of node.children) {
        if (child.name === name) return child;
    }
    // Unnamed blocks (e.g. expression bodies) do not add a segment to the qualified name.
    for (const child of node.children) {
        if (!child.name) {
            const found = findChild(child, name);
            if (found) return found;
        }
    }
    return null;
}

/** The segments of a qualified name, without the quotes of unrestricted names ('Delivery Drone'). */
export function splitQualifiedName(qualifiedName) {
    return qualifiedName.split("::").filter(s => s.length).map(s => s.replace(/^'([\s\S]*)'$/, "$1"));
}

export function lastSegment(qualifiedName) {
    const segments = splitQualifiedName(qualifiedName);
    return segments[segments.length - 1] || "";
}

/** The indentation (leading whitespace) of the line that contains the offset. */
export function lineIndent(text, offset) {
    const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
    const match = /^[ \t]*/.exec(text.slice(lineStart));
    return match ? match[0] : "";
}

/** Converts an offset to a 1-based line and column. */
export function positionOf(text, offset) {
    let line = 1, lineStart = 0;
    for (let i = 0; i < offset && i < text.length; i++) {
        if (text[i] === "\n") { line++; lineStart = i + 1; }
    }
    return { line, col: offset - lineStart + 1 };
}

/** Converts a 1-based line and column to an offset. */
export function offsetOf(text, line, col) {
    let offset = 0;
    for (let l = 1; l < line; l++) {
        const next = text.indexOf("\n", offset);
        if (next < 0) return text.length;
        offset = next + 1;
    }
    return Math.min(text.length, offset + Math.max(0, col - 1));
}
