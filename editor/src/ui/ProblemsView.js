// List of the diagnostics of all documents. Dispatches "select" with detail { diagnostic }.

function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const ORDER = { error: 0, warning: 1, info: 2 };
const GLYPH = { error: "✗", warning: "!", info: "i" };

export class ProblemsView extends EventTarget {
    constructor(container, counter) {
        super();
        this.root = container;
        this.counter = counter;
        this.diagnostics = [];
        this.root.addEventListener("click", e => {
            const row = e.target.closest("[data-index]");
            if (row) this.dispatchEvent(new CustomEvent("select", { detail: { diagnostic: this.diagnostics[Number(row.dataset.index)] } }));
        });
    }

    /** @param {object[]} diagnostics @param {string[]} libraryNames diagnostics in libraries are listed last */
    show(diagnostics, libraryNames = []) {
        this.diagnostics = [...diagnostics].sort((a, b) =>
            (libraryNames.includes(a.file) - libraryNames.includes(b.file))
            || ((ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3))
            || a.file.localeCompare(b.file) || (a.startLine - b.startLine) || (a.startCol - b.startCol));
        const errors = diagnostics.filter(d => d.severity === "error").length;
        const warnings = diagnostics.filter(d => d.severity === "warning").length;
        this.counter.textContent = errors || warnings ? `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}` : "none found by the SysML check";
        this.counter.className = errors ? "count-error" : warnings ? "count-warning" : "count-ok";
        if (!this.diagnostics.length) {
            this.root.innerHTML = "";
            return;
        }
        this.root.innerHTML = `<ul class="pv-list">${this.diagnostics.map((d, i) => `
            <li><button type="button" class="pv-row" data-index="${i}">
                <span class="pv-sev ${escapeHtml(d.severity)}" aria-label="${escapeHtml(d.severity)}">${GLYPH[d.severity] || "i"}</span>
                <span class="pv-msg">${escapeHtml(d.message)}</span>
                <span class="pv-where">${escapeHtml(d.file || "model")}${d.startLine ? `:${d.startLine}:${d.startCol}` : ""}${d.code ? ` · ${escapeHtml(d.code)}` : ""}</span>
            </button></li>`).join("")}</ul>`;
    }
}
