// Resizable panes: a handle at the right edge of a pane changes its width (a CSS variable on the document, so every
// pane of the kind, e.g. the lists of the Roles, Tools, Methodology and Products tabs, has the same width, also after
// a pane is rendered again). The width is remembered in the browser. Drag with the mouse; with the keyboard, focus the
// handle and press ← / → (Shift: larger steps), Home resets the width.

const PREFIX = "mbse-methodology-editor.width.";

function store(key, value) {
    try { value == null ? localStorage.removeItem(PREFIX + key) : localStorage.setItem(PREFIX + key, String(value)); } catch (_) { /* storage unavailable */ }
}

/** The handle of a pane: a vertical separator for the right edge of the pane. */
export function splitterHandle(label) {
    return `<div class="splitter" role="separator" aria-orientation="vertical" tabindex="0" aria-label="${label}" title="${label}: drag, or ← / → (Home resets)"></div>`;
}

/**
 * Makes the panes with a handle (.splitter) inside root resizable.
 * @param {Element} root the element that contains the pane and its handle (also when they are rendered again)
 * @param {{pane: string, variable: string, key: string, min: number, max: function(): number}} options
 *   pane: selector of the pane (the parent of the handle); variable: CSS variable with the width, e.g. "--el-list-width"
 */
export function makeResizable(root, { pane, variable, key, min = 200, max = () => window.innerWidth * 0.6 }) {
    const set = width => {
        const clamped = Math.round(Math.max(min, Math.min(max(), width)));
        document.documentElement.style.setProperty(variable, `${clamped}px`);
        return clamped;
    };
    try { const saved = Number(localStorage.getItem(PREFIX + key)); if (saved) set(saved); } catch (_) { /* storage unavailable */ }
    const handleOf = e => { const h = e.target.closest(".splitter"); return h && root.contains(h) && h.parentElement.matches(pane) ? h : null; };

    root.addEventListener("pointerdown", e => {
        const handle = handleOf(e);
        if (!handle || e.button !== 0) return;
        e.preventDefault();
        // In the pane's own CSS pixels; the pointer moves in screen pixels (they differ under a CSS zoom).
        const pane = handle.parentElement, width = pane.offsetWidth;
        const scale = pane.getBoundingClientRect().width / (width || 1) || 1;
        const start = e.clientX;
        handle.setPointerCapture(e.pointerId);
        handle.classList.add("dragging");
        document.body.classList.add("resizing");
        const move = ev => set(width + (ev.clientX - start) / scale);
        const up = ev => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", up);
            handle.removeEventListener("pointercancel", up);
            handle.classList.remove("dragging");
            document.body.classList.remove("resizing");
            store(key, set(width + (ev.clientX - start) / scale));
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
        handle.addEventListener("pointercancel", up);
    });
    root.addEventListener("keydown", e => {
        const handle = handleOf(e);
        if (!handle) return;
        const width = handle.parentElement.offsetWidth;
        const step = e.shiftKey ? 64 : 16;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            store(key, set(width + (e.key === "ArrowRight" ? step : -step)));
        } else if (e.key === "Home") {
            e.preventDefault();
            document.documentElement.style.removeProperty(variable);
            store(key, null);
        }
    });
}
