// Graphical editor: the EEE Tools Roles Methods Matrix of an EEE check (EEE Steps #1 and #2).
//
// - roles are the rows, tools the columns; the process steps are boxes in the cells, labeled with their method
// - transitions are arrows between the process steps: a change of the column is a method/tool break,
//   a change of the row a human interface
// - the evaluation colors the arrows: bottleneck (red, with its priority), efficient (green), not rated (gray, dashed)
// - a step whose tool/method combination the tool policy forbids has a red corner mark
//
// Editing: double-click an empty cell to add a process step there; drag a step to another cell to change its
// role and tool; select a step and press "Connect" (or C), then click the next step to add a transition;
// double-click or F2 renames, Del deletes. Pan with the mouse, zoom with the wheel.
//
// Events: "select" { id }, "command" { command, id, args }

import { ProcessStep, StepTransition, EVALUATIONS } from "../eee/model.js";
import { policyStatus } from "../eee/EeeAnalyzer.js";

const SVG = "http://www.w3.org/2000/svg";
const HEAD_H = 44, BOX_H = 44, BOX_GAP = 14, CELL_PAD = 16, MIN_COL = 150, MIN_ROW = 76, MAX_BOX = 210;
const NO_ROLE = "\u0000no-role", NO_TOOL = "\u0000no-tool";

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

let measureContext = null;
function textWidth(text, font) {
    if (typeof document === "undefined") return text.length * 7;
    if (!measureContext) measureContext = document.createElement("canvas").getContext("2d");
    measureContext.font = font;
    return measureContext.measureText(text).width;
}

/** Shortens a text to a width, with an ellipsis. */
function fit(text, width, font) {
    if (textWidth(text, font) <= width) return text;
    let s = text;
    while (s.length > 1 && textWidth(s + "…", font) > width) s = s.slice(0, -1);
    return s + "…";
}

const FONT = "600 13px system-ui, sans-serif", SMALL = "11px system-ui, sans-serif", HEAD = "600 12.5px system-ui, sans-serif";

export class MatrixView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("diagram-view", "matrix-view");
        this.root.innerHTML = `
            <div class="dg-toolbar" role="toolbar" aria-label="Matrix">
                <label class="dg-field mx-check-field" hidden>EEE check <select class="mx-check"></select></label>
                <span class="dg-status" aria-live="polite"></span>
                <span class="dg-spacer"></span>
                <span class="dg-actions mx-actions"></span>
                <span class="dg-zoom">
                    <button type="button" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>
                    <button type="button" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>
                    <button type="button" data-zoom="fit" title="Fit to window">Fit</button>
                </span>
            </div>
            <div class="dg-canvas">
                <svg class="dg-svg" role="application" aria-label="Tools Roles Methods Matrix">
                    <defs>
                        ${["bottleneck", "efficient", "unrated", "selected"].map(k => `<marker id="mx-arrow-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="mx-arrowhead ${k}"/></marker>`).join("")}
                    </defs>
                    <g class="dg-viewport"></g>
                </svg>
                <div class="dg-empty" hidden></div>
                <div class="mx-hint" hidden></div>
                <div class="dg-legend" aria-label="Legend">
                    <span><i class="mx-swatch bottleneck"></i>bottleneck</span>
                    <span><i class="mx-swatch efficient"></i>efficient</span>
                    <span><i class="mx-swatch unrated"></i>not rated</span>
                    <span><i class="mx-corner"></i>forbidden by tool policy</span>
                    <span><i class="mx-measure-dot"></i>measures</span>
                    <span class="mx-legend-note">column change = method/tool break · row change = human interface</span>
                </div>
            </div>`;
        this.svg = this.root.querySelector(".dg-svg");
        this.viewport = this.root.querySelector(".dg-viewport");
        this.canvas = this.root.querySelector(".dg-canvas");
        this.transform = { x: 20, y: 20, k: 1 };
        this.needsFit = true;
        this.state = null;
        this.checkId = null;
        this.connectFrom = null;
        this.layout = null;
        this.wire();
    }

    /** @param {{model, analyses: Map, selectedId: string|null, editable: boolean, message?: string}} state */
    show(state) {
        this.state = state;
        const { model } = state;
        const checks = model ? model.checks : [];
        const selectedCheck = model && state.selectedId ? model.checkOf(state.selectedId) : null;
        if (selectedCheck && selectedCheck.id !== this.checkId) { this.checkId = selectedCheck.id; this.needsFit = true; }
        if (!checks.some(c => c.id === this.checkId)) {
            this.checkId = checks.length ? checks[0].id : null;
            this.needsFit = true;
        }
        const check = checks.find(c => c.id === this.checkId) || null;
        if (this.connectFrom && (!model || !(model.get(this.connectFrom) instanceof ProcessStep))) this.connectFrom = null;
        this.renderToolbar(checks, check);

        const empty = this.root.querySelector(".dg-empty");
        if (!check) {
            this.viewport.innerHTML = "";
            empty.hidden = false;
            empty.innerHTML = model
                ? `<p>No EEE check yet.</p><p>Create one with <strong>File ▸ New EEE check</strong>, open a file, or try <strong>Examples</strong>.</p>`
                : `<p>${escapeHtml(state.message || "Waiting for the model check…")}</p>`;
            return;
        }
        empty.hidden = true;
        this.render(check);
        if (this.needsFit) {
            this.needsFit = false;
            requestAnimationFrame(() => this.fit());
        }
    }

    selectCheck(checkId) {
        if (this.checkId === checkId) return;
        this.checkId = checkId;
        this.needsFit = true;
        if (this.state) this.show(this.state);
    }

    // ---------- toolbar ----------

    renderToolbar(checks, check) {
        const field = this.root.querySelector(".mx-check-field");
        field.hidden = checks.length < 2;
        this.root.querySelector(".mx-check").innerHTML = checks.map(c =>
            `<option value="${escapeHtml(c.id)}"${c.id === this.checkId ? " selected" : ""}>${escapeHtml(c.name)}</option>`).join("");
        const status = this.root.querySelector(".dg-status");
        const analysis = check && this.state.analyses ? this.state.analyses.get(check.id) : null;
        if (check && analysis) {
            const bottlenecks = analysis.bottlenecks.length, unrated = check.transitions.filter(t => t.evaluation === "unrated").length;
            status.textContent = `${check.steps.length} steps · ${check.transitions.length} transitions · ${bottlenecks} bottleneck${bottlenecks === 1 ? "" : "s"}${unrated ? ` · ${unrated} not rated` : ""}`;
            status.className = "dg-status";
        } else {
            status.textContent = "";
        }

        const actions = this.root.querySelector(".mx-actions");
        const hint = this.root.querySelector(".mx-hint");
        if (!check || !this.state.editable) { actions.innerHTML = ""; hint.hidden = true; return; }
        const selected = this.state.model.get(this.state.selectedId);
        const inCheck = selected && this.state.model.checkOf(selected.id) === check;
        let html = `<button type="button" data-command="addStep" title="Add a process step">+ Step</button>`;
        if (selected instanceof ProcessStep && inCheck) {
            html += `<button type="button" data-connect class="${this.connectFrom ? "active" : ""}" title="Add a transition from ${escapeHtml(selected.name)}: then click the next process step (C)">→ Connect</button>`;
        }
        if (selected instanceof StepTransition && inCheck) {
            html += `<span class="mx-eval" role="group" aria-label="Evaluation of ${escapeHtml(selected.name)}">${Object.entries(EVALUATIONS).map(([value, e]) =>
                `<button type="button" data-evaluation="${value}" class="eval-${value}${selected.evaluation === value ? " active" : ""}" aria-pressed="${selected.evaluation === value}">${e.label}</button>`).join("")}</span>`;
            if (selected.isBottleneck) {
                html += `<label class="dg-field">Priority <input type="number" min="1" step="1" class="mx-priority" value="${selected.priority ?? ""}" aria-label="Priority of the bottleneck"></label>`;
            }
        }
        actions.innerHTML = html;
        hint.hidden = !this.connectFrom;
        if (this.connectFrom) hint.innerHTML = `Click the process step that follows <strong>${escapeHtml(this.state.model.nameOf(this.connectFrom))}</strong>. Esc cancels.`;
    }

    // ---------- layout ----------

    computeLayout(check) {
        const { model } = this.state;
        const axes = model.matrixAxes(check);
        const rows = axes.roles.map(r => ({ id: r.id, name: r.name }));
        if (axes.hasUnassignedRole) rows.push({ id: NO_ROLE, name: "(no role)", none: true });
        const cols = axes.tools.map(t => ({ id: t.id, name: t.name }));
        if (axes.hasUnassignedTool) cols.push({ id: NO_TOOL, name: "(no tool)", none: true });
        if (!rows.length) rows.push({ id: NO_ROLE, name: "(no role)", none: true });
        if (!cols.length) cols.push({ id: NO_TOOL, name: "(no tool)", none: true });

        const rowOf = s => (model.get(s.roleId) ? s.roleId : NO_ROLE);
        const colOf = s => (model.get(s.toolId) ? s.toolId : NO_TOOL);
        const cells = new Map();
        for (const step of check.steps) {
            const key = `${rowOf(step)}|${colOf(step)}`;
            if (!cells.has(key)) cells.set(key, []);
            cells.get(key).push(step);
        }
        const boxWidth = step => Math.min(MAX_BOX, Math.max(110,
            textWidth(step.name, FONT) + 28, textWidth(model.nameOf(step.methodId, ""), SMALL) + 28));

        const headWidth = Math.max(130, ...rows.map(r => textWidth(r.name, HEAD) + 30));
        let x = headWidth;
        for (const col of cols) {
            const steps = rows.flatMap(r => cells.get(`${r.id}|${col.id}`) || []);
            col.width = Math.max(MIN_COL, textWidth(col.name, HEAD) + 28, ...steps.map(s => boxWidth(s) + 2 * CELL_PAD));
            col.x = x;
            x += col.width;
        }
        let y = HEAD_H;
        for (const row of rows) {
            const max = Math.max(0, ...cols.map(c => (cells.get(`${row.id}|${c.id}`) || []).length));
            row.height = Math.max(MIN_ROW, max * BOX_H + (max - 1) * BOX_GAP + 2 * CELL_PAD + 6);
            row.y = y;
            y += row.height;
        }
        const boxes = new Map();
        for (const row of rows) {
            for (const col of cols) {
                const steps = cells.get(`${row.id}|${col.id}`) || [];
                const total = steps.length * BOX_H + (steps.length - 1) * BOX_GAP;
                steps.forEach((step, i) => {
                    const w = boxWidth(step);
                    boxes.set(step.id, {
                        x: col.x + (col.width - w) / 2, y: row.y + (row.height - total) / 2 + i * (BOX_H + BOX_GAP),
                        w, h: BOX_H, row, col,
                    });
                });
            }
        }
        return { rows, cols, boxes, headWidth, width: x, height: y };
    }

    // ---------- rendering ----------

    render(check) {
        const { model, selectedId } = this.state;
        const layout = this.layout = this.computeLayout(check);
        const { rows, cols, boxes, headWidth, width, height } = layout;
        const analysis = this.state.analyses ? this.state.analyses.get(check.id) : null;
        const parts = [];

        // Grid: headers, zebra rows and column lines.
        parts.push(`<rect class="mx-frame" x="0" y="0" width="${width}" height="${height}" rx="6"/>`);
        rows.forEach((row, i) => {
            parts.push(`<rect class="mx-row${i % 2 ? " odd" : ""}" x="0" y="${row.y}" width="${width}" height="${row.height}"/>`);
        });
        for (const col of cols) {
            parts.push(`<line class="mx-line" x1="${col.x}" y1="0" x2="${col.x}" y2="${height}"/>`);
            for (const row of rows) {
                parts.push(`<rect class="mx-cell" data-cell="${escapeHtml(row.id)}|${escapeHtml(col.id)}" x="${col.x}" y="${row.y}" width="${col.width}" height="${row.height}"><title>${escapeHtml(`${row.name} × ${col.name}${this.state.editable ? " – double-click to add a process step" : ""}`)}</title></rect>`);
            }
        }
        rows.forEach(row => parts.push(`<line class="mx-line" x1="0" y1="${row.y}" x2="${width}" y2="${row.y}"/>`));
        parts.push(`<rect class="mx-head" x="0" y="0" width="${width}" height="${HEAD_H}" rx="6"/>`);
        parts.push(`<text class="mx-corner-label" x="12" y="${HEAD_H / 2 + 4}">Roles ↓ · Tools →</text>`);
        for (const col of cols) {
            const sel = col.id === selectedId ? " selected" : "";
            parts.push(`<g class="mx-header${col.none ? " none" : ""}${sel}" ${col.none ? "" : `data-id="${escapeHtml(col.id)}" tabindex="0"`}>
                <text x="${col.x + col.width / 2}" y="${HEAD_H / 2 + 4}" text-anchor="middle">${escapeHtml(fit(col.name, col.width - 16, HEAD))}</text>
                <title>${escapeHtml(col.none ? "Process steps without a tool" : `Tool ${col.name}`)}</title></g>`);
        }
        for (const row of rows) {
            const sel = row.id === selectedId ? " selected" : "";
            parts.push(`<g class="mx-header row${row.none ? " none" : ""}${sel}" ${row.none ? "" : `data-id="${escapeHtml(row.id)}" tabindex="0"`}>
                <text x="14" y="${row.y + row.height / 2 + 4}">${escapeHtml(fit(row.name, headWidth - 24, HEAD))}</text>
                <title>${escapeHtml(row.none ? "Process steps without a role" : `Role ${row.name}`)}</title></g>`);
        }
        parts.push(`<line class="mx-line strong" x1="${headWidth}" y1="0" x2="${headWidth}" y2="${height}"/>`);
        parts.push(`<line class="mx-line strong" x1="0" y1="${HEAD_H}" x2="${width}" y2="${HEAD_H}"/>`);

        // Transitions below the boxes, the selected one on top.
        const transitions = [...check.transitions].sort((a, b) => (a.id === selectedId) - (b.id === selectedId) || (a.isBottleneck - b.isBottleneck));
        const pairCount = new Map();
        for (const t of transitions) {
            const from = boxes.get(t.sourceId), to = boxes.get(t.targetId);
            if (!from || !to) continue;
            const key = [t.sourceId, t.targetId].sort().join("|");
            const index = pairCount.get(key) || 0;
            pairCount.set(key, index + 1);
            parts.push(this.transitionSvg(t, from, to, index, analysis, t.id === selectedId));
        }

        // Process steps.
        for (const step of check.steps) {
            const box = boxes.get(step.id);
            if (!box) continue;
            const policy = policyStatus(model, step.toolId, step.methodId);
            const method = model.nameOf(step.methodId, "");
            const classes = ["dg-node", "mx-step"];
            if (step.id === selectedId) classes.push("selected");
            if (step.id === this.connectFrom) classes.push("connect-from");
            if (analysis && analysis.bottlenecks.some(t => t.sourceId === step.id || t.targetId === step.id)) classes.push("at-bottleneck");
            const tip = [`Process step ${step.name}`, `Role: ${model.nameOf(step.roleId)}`, `Tool: ${model.nameOf(step.toolId)}`, `Method: ${model.nameOf(step.methodId)}`];
            if (step.goal) tip.push(`Goal: ${step.goal}`);
            if (policy) tip.push(`Tool policy: ${policy.status}`);
            if (step.measures.length) tip.push(`Measures: ${step.measures.map(m => m.name).join(", ")}`);
            parts.push(`<g class="${classes.join(" ")}" data-id="${escapeHtml(step.id)}" data-step tabindex="0" transform="translate(${box.x},${box.y})">
                <rect width="${box.w}" height="${box.h}" rx="7"/>
                <text class="dg-name" x="${box.w / 2}" y="${method ? 18 : 27}" text-anchor="middle">${escapeHtml(fit(step.name, box.w - 16, FONT))}</text>
                ${method ? `<text class="mx-method" x="${box.w / 2}" y="34" text-anchor="middle">${escapeHtml(fit(method, box.w - 16, SMALL))}</text>` : ""}
                ${policy && policy.status === "forbidden" ? `<path class="mx-forbidden" d="M${box.w - 14},0 h7 a7,7 0 0 1 7,7 v7 z"/>` : ""}
                ${step.measures.length ? `<circle class="mx-measure-badge" cx="0" cy="${box.h}" r="7"/><text class="mx-measure-text" x="0" y="${box.h + 3}" text-anchor="middle">${step.measures.length}</text>` : ""}
                <title>${escapeHtml(tip.join("\n"))}</title></g>`);
        }
        this.viewport.innerHTML = parts.join("");
        this.applyTransform();
    }

    transitionSvg(t, from, to, index, analysis, selected) {
        const kind = analysis && analysis.kinds.get(t.id);
        const fc = { x: from.x + from.w / 2, y: from.y + from.h / 2 }, tc = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
        const dx = tc.x - fc.x, dy = tc.y - fc.y;
        const offset = index * 10;
        let d, mid;
        if (from === to) {
            d = `M${from.x + from.w},${fc.y - 8} c40,-30 40,46 0,16`;
            mid = { x: from.x + from.w + 30, y: fc.y };
        } else if (from.x + from.w + 60 <= to.x || to.x + to.w + 60 <= from.x || (Math.abs(dy) < from.h && Math.abs(dx) > (from.w + to.w) / 2)) {
            const s = Math.sign(dx);
            const p1 = { x: s > 0 ? from.x + from.w : from.x, y: fc.y + offset };
            const p2 = { x: s > 0 ? to.x : to.x + to.w, y: tc.y + offset };
            const c = Math.max(30, Math.abs(p2.x - p1.x) / 2);
            d = `M${p1.x},${p1.y} C${p1.x + s * c},${p1.y} ${p2.x - s * c},${p2.y} ${p2.x},${p2.y}`;
            mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        } else {
            const s = Math.sign(dy) || 1;
            const p1 = { x: fc.x + offset, y: s > 0 ? from.y + from.h : from.y };
            const p2 = { x: tc.x + offset, y: s > 0 ? to.y : to.y + to.h };
            const c = Math.max(24, Math.abs(p2.y - p1.y) / 2);
            d = `M${p1.x},${p1.y} C${p1.x},${p1.y + s * c} ${p2.x},${p2.y - s * c} ${p2.x},${p2.y}`;
            mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        }
        const marker = selected ? "selected" : t.evaluation;
        const tip = [`Transition ${t.name}: ${this.state.model.nameOf(t.sourceId)} → ${this.state.model.nameOf(t.targetId)}`,
            EVALUATIONS[t.evaluation].label + (t.priority ? `, priority ${t.priority}` : ""), kind ? kind.label : ""].filter(Boolean);
        const badge = t.isBottleneck
            ? `<circle class="mx-badge bottleneck" cx="${mid.x}" cy="${mid.y}" r="10"/><text class="mx-badge-text" x="${mid.x}" y="${mid.y + 4}" text-anchor="middle">${t.priority ?? "!"}</text>`
            : t.evaluation === "unrated" ? `<circle class="mx-badge unrated" cx="${mid.x}" cy="${mid.y}" r="7"/><text class="mx-badge-text small" x="${mid.x}" y="${mid.y + 3.5}" text-anchor="middle">?</text>` : "";
        return `<g class="mx-transition ${t.evaluation}${selected ? " selected" : ""}" data-id="${escapeHtml(t.id)}" tabindex="0">
            <path class="dg-hit" d="${d}"/>
            <path class="mx-edge" d="${d}" marker-end="url(#mx-arrow-${marker})"/>
            ${badge}<title>${escapeHtml(tip.join("\n"))}</title></g>`;
    }

    // ---------- interaction ----------

    wire() {
        this.root.querySelector(".mx-check").addEventListener("change", e => {
            this.selectCheck(e.target.value);
            this.dispatchEvent(new CustomEvent("select", { detail: { id: e.target.value } }));
        });
        this.root.querySelector(".dg-zoom").addEventListener("click", e => {
            const zoom = e.target.closest("[data-zoom]");
            if (!zoom) return;
            if (zoom.dataset.zoom === "fit") this.fit();
            else this.zoomBy(zoom.dataset.zoom === "in" ? 1.25 : 0.8);
        });
        const actions = this.root.querySelector(".mx-actions");
        actions.addEventListener("click", e => {
            if (!this.state) return;
            const command = e.target.closest("[data-command]");
            if (command) { this.command(command.dataset.command, this.checkId); return; }
            if (e.target.closest("[data-connect]")) { this.toggleConnect(); return; }
            const evaluation = e.target.closest("[data-evaluation]");
            if (evaluation) this.command("setEvaluation", this.state.selectedId, { evaluation: evaluation.dataset.evaluation });
        });
        actions.addEventListener("change", e => {
            if (!e.target.matches(".mx-priority")) return;
            const value = e.target.value.trim();
            this.command("setPriority", this.state.selectedId, { priority: value ? Number(value) : null });
        });

        this.svg.addEventListener("click", e => {
            if (this.dragged) return;
            const target = e.target.closest("[data-id]");
            if (!target) {
                if (this.connectFrom) this.cancelConnect();
                return;
            }
            const id = target.dataset.id;
            if (this.connectFrom && target.hasAttribute("data-step")) {
                const from = this.connectFrom;
                this.connectFrom = null;
                this.command("addTransition", this.checkId, { sourceId: from, targetId: id });
                return;
            }
            this.dispatchEvent(new CustomEvent("select", { detail: { id } }));
        });
        this.svg.addEventListener("dblclick", e => {
            if (!this.state || !this.state.editable) return;
            const node = e.target.closest("[data-step]");
            if (node) { this.command("rename", node.dataset.id); return; }
            const cell = e.target.closest("[data-cell]");
            if (cell) {
                const [roleId, toolId] = cell.dataset.cell.split("|");
                this.command("addStep", this.checkId, { roleId: roleId === NO_ROLE ? null : roleId, toolId: toolId === NO_TOOL ? null : toolId });
            }
        });
        this.root.addEventListener("keydown", e => {
            if (e.target.closest("input, select, textarea")) return;
            if (e.key === "Escape" && this.connectFrom) { this.cancelConnect(); return; }
            const node = e.target.closest("[data-id]");
            if (!node || !this.state) return;
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.dispatchEvent(new CustomEvent("select", { detail: { id: node.dataset.id } })); }
            if (!this.state.editable) return;
            if (e.key === "F2") { e.preventDefault(); this.command("rename", node.dataset.id); }
            else if (e.key === "Delete") { e.preventDefault(); this.command("delete", node.dataset.id); }
            else if ((e.key === "c" || e.key === "C") && node.hasAttribute("data-step")) {
                this.dispatchEvent(new CustomEvent("select", { detail: { id: node.dataset.id } }));
                this.connectFrom = node.dataset.id;
                this.renderToolbar(this.state.model.checks, this.state.model.get(this.checkId));
            }
        });

        // Drag a step to another cell; otherwise pan with the mouse. Zoom with the wheel.
        let drag = null;
        this.svg.addEventListener("pointerdown", e => {
            if (e.button !== 0) return;
            const step = e.target.closest("[data-step]");
            drag = { x: e.clientX, y: e.clientY, tx: this.transform.x, ty: this.transform.y, moved: false,
                stepId: step && this.state.editable && !this.connectFrom ? step.dataset.id : null, node: step };
            this.dragged = false;
        });
        window.addEventListener("pointermove", e => {
            if (!drag) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (!drag.moved && Math.hypot(dx, dy) < 5) return;
            drag.moved = true;
            if (drag.stepId) {
                const box = this.layout.boxes.get(drag.stepId);
                drag.node.setAttribute("transform", `translate(${box.x + dx / this.transform.k},${box.y + dy / this.transform.k})`);
                drag.node.classList.add("dragging");
                this.highlightCell(this.cellAt(e.clientX, e.clientY));
            } else {
                this.svg.classList.add("panning");
                this.transform.x = drag.tx + dx;
                this.transform.y = drag.ty + dy;
                this.applyTransform();
            }
        });
        window.addEventListener("pointerup", e => {
            if (drag && drag.moved) {
                this.dragged = true;
                setTimeout(() => { this.dragged = false; }, 0);
                if (drag.stepId) {
                    this.highlightCell(null);
                    const cell = this.cellAt(e.clientX, e.clientY);
                    const box = this.layout.boxes.get(drag.stepId);
                    if (cell && (cell.row.id !== box.row.id || cell.col.id !== box.col.id)) {
                        this.command("moveStep", drag.stepId, {
                            roleId: cell.row.id === NO_ROLE ? null : cell.row.id, toolId: cell.col.id === NO_TOOL ? null : cell.col.id,
                        });
                    } else if (this.state) {
                        this.show(this.state);
                    }
                }
            }
            drag = null;
            this.svg.classList.remove("panning");
        });
        this.svg.addEventListener("wheel", e => {
            e.preventDefault();
            const rect = this.svg.getBoundingClientRect();
            this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
        }, { passive: false });
        new ResizeObserver(() => { if (this.needsFit) this.fit(); }).observe(this.canvas);
    }

    command(command, id, args = {}) {
        if (!id) return;
        this.dispatchEvent(new CustomEvent("command", { detail: { command, id, args } }));
    }

    toggleConnect() {
        const selected = this.state.model.get(this.state.selectedId);
        this.connectFrom = this.connectFrom ? null : selected instanceof ProcessStep ? selected.id : null;
        this.show(this.state);
    }

    cancelConnect() {
        this.connectFrom = null;
        this.show(this.state);
    }

    /** The matrix cell under a screen position, or null. */
    cellAt(clientX, clientY) {
        if (!this.layout) return null;
        const rect = this.svg.getBoundingClientRect();
        const x = (clientX - rect.left - this.transform.x) / this.transform.k;
        const y = (clientY - rect.top - this.transform.y) / this.transform.k;
        const row = this.layout.rows.find(r => y >= r.y && y < r.y + r.height);
        const col = this.layout.cols.find(c => x >= c.x && x < c.x + c.width);
        return row && col ? { row, col } : null;
    }

    highlightCell(cell) {
        this.viewport.querySelectorAll(".mx-cell.drop").forEach(c => c.classList.remove("drop"));
        if (!cell) return;
        const element = this.viewport.querySelector(`[data-cell="${CSS.escape(`${cell.row.id}|${cell.col.id}`)}"]`);
        if (element) element.classList.add("drop");
    }

    zoomBy(factor, cx, cy) {
        const rect = this.svg.getBoundingClientRect();
        if (cx === undefined) { cx = rect.width / 2; cy = rect.height / 2; }
        const k = Math.min(3, Math.max(0.2, this.transform.k * factor));
        const ratio = k / this.transform.k;
        this.transform.x = cx - (cx - this.transform.x) * ratio;
        this.transform.y = cy - (cy - this.transform.y) * ratio;
        this.transform.k = k;
        this.applyTransform();
    }

    fit() {
        const rect = this.svg.getBoundingClientRect();
        if (!rect.width || !rect.height || !this.viewport.firstChild) return;
        const box = this.viewport.getBBox();
        if (!box.width || !box.height) return;
        const margin = 20;
        const k = Math.min(1.2, (rect.width - 2 * margin) / box.width, (rect.height - 2 * margin - 34) / box.height);
        this.transform.k = Math.max(0.2, k);
        this.transform.x = margin - box.x * this.transform.k;
        this.transform.y = margin - box.y * this.transform.k;
        this.applyTransform();
    }

    applyTransform() {
        const { x, y, k } = this.transform;
        this.viewport.setAttribute("transform", `translate(${x},${y}) scale(${k})`);
    }
}

