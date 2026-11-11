// Text editor for SysML v2 textual notation: a textarea over a highlighting layer,
// with line numbers and diagnostic marks. No dependencies.

import { tokenize, KEYWORDS, offsetOf } from "../text/sysml-text.js";

const TAB = "    ";

function escapeHtml(s) {
    return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/** Highlights the text as HTML. */
function highlight(text) {
    let html = "", at = 0;
    const tokens = tokenize(text);
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        let cls = "";
        if (t.type === "comment" || t.type === "lineComment") cls = "tk-comment";
        else if (t.type === "string") cls = "tk-string";
        else if (t.type === "number") cls = "tk-number";
        else if (t.type === "ident" && !t.quoted && KEYWORDS.has(t.value)) cls = "tk-keyword";
        else if (t.type === "punct" && (t.value === "#" || t.value === "@") && tokens[i + 1] && tokens[i + 1].type === "ident" && tokens[i + 1].start === t.end) {
            html += escapeHtml(text.slice(at, t.start)) + `<span class="tk-meta">${escapeHtml(text.slice(t.start, tokens[i + 1].end))}</span>`;
            at = tokens[i + 1].end;
            i++;
            continue;
        }
        if (!cls) continue;
        html += escapeHtml(text.slice(at, t.start)) + `<span class="${cls}">${escapeHtml(text.slice(t.start, t.end))}</span>`;
        at = t.end;
    }
    return html + escapeHtml(text.slice(at)) + "\n";
}

/** Visual column (0-based) of a 1-based column, with tabs expanded to TAB.length. */
function visualColumn(line, col) {
    let v = 0;
    for (let i = 0; i < col - 1 && i < line.length; i++) v = line[i] === "\t" ? v + TAB.length - (v % TAB.length) : v + 1;
    return v;
}

export class CodeEditor extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("code-editor");
        this.root.innerHTML = `
            <div class="ce-gutter" aria-hidden="true"><div class="ce-gutter-inner"></div></div>
            <div class="ce-body">
                <pre class="ce-highlight" aria-hidden="true"></pre>
                <div class="ce-marks" aria-hidden="true"></div>
                <textarea class="ce-input" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"
                    aria-label="SysML v2 source"></textarea>
            </div>`;
        this.input = this.root.querySelector(".ce-input");
        this.highlightLayer = this.root.querySelector(".ce-highlight");
        this.marksLayer = this.root.querySelector(".ce-marks");
        this.gutter = this.root.querySelector(".ce-gutter-inner");
        this.diagnostics = [];
        this.renderPending = false;

        this.input.addEventListener("input", () => {
            this.scheduleRender();
            this.dispatchEvent(new Event("change"));
        });
        this.input.addEventListener("scroll", () => this.syncScroll());
        this.input.addEventListener("keydown", e => this.onKeyDown(e));
        this.input.addEventListener("keyup", () => this.dispatchEvent(new Event("cursor")));
        this.input.addEventListener("click", () => this.dispatchEvent(new Event("cursor")));
        this.render();
    }

    get value() {
        return this.input.value;
    }

    /** Replaces the text; keeps the scroll position if keepView is set. */
    setValue(text, { readOnly = false, keepView = false } = {}) {
        const { scrollTop, scrollLeft, selectionStart, selectionEnd } = this.input;
        this.input.value = text;
        this.input.readOnly = readOnly;
        this.root.classList.toggle("read-only", readOnly);
        if (keepView) {
            this.input.scrollTop = scrollTop;
            this.input.scrollLeft = scrollLeft;
            this.input.setSelectionRange(Math.min(selectionStart, text.length), Math.min(selectionEnd, text.length));
        } else {
            this.input.scrollTop = 0;
            this.input.scrollLeft = 0;
            this.input.setSelectionRange(0, 0);
        }
        this.render();
    }

    /** @param {{severity, message, startLine, startCol, endLine, endCol}[]} diagnostics of this document */
    setDiagnostics(diagnostics) {
        this.diagnostics = diagnostics;
        this.renderMarks();
    }

    get cursor() {
        const text = this.input.value.slice(0, this.input.selectionStart);
        const line = (text.match(/\n/g) || []).length + 1;
        return { line, col: this.input.selectionStart - text.lastIndexOf("\n") };
    }

    focus() {
        this.input.focus({ preventScroll: true });
    }

    /** Selects a range given as offsets and scrolls it into view. */
    reveal(start, end = start) {
        this.input.focus({ preventScroll: true });
        this.input.setSelectionRange(start, end);
        const line = (this.input.value.slice(0, start).match(/\n/g) || []).length;
        const lineHeight = this.lineHeight();
        const top = line * lineHeight;
        if (top < this.input.scrollTop || top > this.input.scrollTop + this.input.clientHeight - 2 * lineHeight) {
            this.input.scrollTop = Math.max(0, top - this.input.clientHeight / 3);
        }
        this.syncScroll();
        this.dispatchEvent(new Event("cursor"));
    }

    revealLine(line, col = 1) {
        this.reveal(offsetOf(this.input.value, line, col));
    }

    /** Inserts text at the cursor, indented like the current line; undoable where the browser supports it. */
    insertAtCursor(text) {
        if (this.input.readOnly) return;
        const { selectionStart, value } = this.input;
        const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        const indent = /^[ \t]*/.exec(value.slice(lineStart))[0];
        const atLineStart = value.slice(lineStart, selectionStart).trim() === "";
        const indented = text.split("\n").map((l, i) => (i === 0 ? l : indent + l)).join("\n");
        this.replaceSelection((atLineStart ? "" : "\n" + indent) + indented);
    }

    replaceSelection(text) {
        this.input.focus();
        // execCommand keeps the browser's undo history; fall back to setRangeText.
        if (!document.execCommand || !document.execCommand("insertText", false, text)) {
            this.input.setRangeText(text, this.input.selectionStart, this.input.selectionEnd, "end");
            this.input.dispatchEvent(new Event("input"));
        }
    }

    onKeyDown(e) {
        if (this.input.readOnly) return;
        if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) this.outdentSelection();
            else this.replaceSelection(TAB);
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const { selectionStart, value } = this.input;
            const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
            let indent = /^[ \t]*/.exec(value.slice(lineStart))[0];
            if (/\{\s*$/.test(value.slice(lineStart, selectionStart))) indent += TAB;
            e.preventDefault();
            this.replaceSelection("\n" + indent);
        } else if (e.key === "}" && !e.ctrlKey && !e.metaKey) {
            const { selectionStart, value } = this.input;
            const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
            const before = value.slice(lineStart, selectionStart);
            if (/^[ \t]+$/.test(before) && before.endsWith(TAB)) {
                e.preventDefault();
                this.input.setSelectionRange(selectionStart - TAB.length, selectionStart);
                this.replaceSelection("}");
            }
        }
    }

    outdentSelection() {
        const { selectionStart, value } = this.input;
        const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        const remove = /^ {1,4}|^\t/.exec(value.slice(lineStart));
        if (!remove) return;
        this.input.setSelectionRange(lineStart, lineStart + remove[0].length);
        this.replaceSelection("");
    }

    scheduleRender() {
        if (this.renderPending) return;
        this.renderPending = true;
        requestAnimationFrame(() => {
            this.renderPending = false;
            this.render();
        });
    }

    render() {
        const text = this.input.value;
        this.highlightLayer.innerHTML = highlight(text);
        const lines = (text.match(/\n/g) || []).length + 1;
        if (lines !== this.lineCount) {
            this.lineCount = lines;
            let html = "";
            for (let i = 1; i <= lines; i++) html += `<div data-line="${i}">${i}</div>`;
            this.gutter.innerHTML = html;
        }
        this.renderMarks();
        this.syncScroll();
    }

    renderMarks() {
        const lines = this.input.value.split("\n");
        const severityRank = { error: 3, warning: 2, info: 1 };
        const lineSeverity = new Map();
        let html = "";
        for (const d of this.diagnostics) {
            if (!d.startLine || d.startLine > lines.length) continue;
            const severity = severityRank[d.severity] ? d.severity : "info";
            if ((severityRank[lineSeverity.get(d.startLine)] || 0) < severityRank[severity]) lineSeverity.set(d.startLine, severity);
            const lastLine = Math.min(d.endLine || d.startLine, lines.length);
            for (let l = d.startLine; l <= lastLine; l++) {
                const text = lines[l - 1];
                const from = l === d.startLine ? visualColumn(text, d.startCol || 1) : 0;
                let to = l === lastLine ? visualColumn(text, d.endCol || d.startCol || 1) : visualColumn(text, text.length + 1);
                if (to <= from) to = from + 1;
                html += `<div class="ce-mark ${severity}" style="top:calc(${l - 1} * var(--ce-line));left:${from}ch;width:${to - from}ch"></div>`;
            }
        }
        this.marksLayer.innerHTML = html;
        for (const row of this.gutter.children) {
            const severity = lineSeverity.get(Number(row.dataset.line));
            row.className = severity ? "sev-" + severity : "";
            row.title = severity ? this.diagnostics.filter(d => d.startLine === Number(row.dataset.line)).map(d => d.message).join("\n") : "";
        }
    }

    syncScroll() {
        const { scrollTop, scrollLeft } = this.input;
        const transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
        this.highlightLayer.style.transform = transform;
        this.marksLayer.style.transform = transform;
        this.gutter.style.transform = `translateY(${-scrollTop}px)`;
    }

    lineHeight() {
        return parseFloat(getComputedStyle(this.input).lineHeight) || 20;
    }
}
