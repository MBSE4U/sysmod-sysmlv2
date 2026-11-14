// Graphical view of a process (or of a method with steps): its flow as a swimlane diagram.
//
// Not SysML notation, but a methodology diagram meant to be read without SysML knowledge:
// - the steps (owned and inherited processes and methods) are boxes, ordered from top to bottom along the
//   successions ("first a then b"), from the start (filled circle) to the end (ringed circle); steps without a
//   succession stand at the bottom
// - the swimlanes (columns) are the responsible performers of the steps: in an MBSE environment its roles, otherwise the
//   performers that the process declares (e.g. "systemArchitect : SystemArchitect"), or the performer of the process
// - a step with steps of its own has a ▸ mark: double-click it to show its flow; "Up" shows the enclosing process
// - a click on a step opens its editor
//
// - without a selected process, the view follows the document selected in the Documents or Libraries panel: the flow of
//   its only process, otherwise an overview of all its processes and methods
//
// Events: "select" { id, open }, "view" { view }

import { Process, Method, MBSEEnvironment } from "../dtfa/model.js";

const BOX_W = 200, BOX_H_PLAIN = 46, ROW_GAP = 30, LANE_PAD = 20, HEAD_H = 40, END_R = 11;

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

let measureContext = null;
function fit(text, width, font = "13px system-ui, sans-serif") {
    if (typeof document === "undefined") return text;
    if (!measureContext) measureContext = document.createElement("canvas").getContext("2d");
    measureContext.font = font;
    if (measureContext.measureText(text).width <= width) return text;
    let s = text;
    while (s.length > 1 && measureContext.measureText(s + "…").width > width) s = s.slice(0, -1);
    return s + "…";
}

const isBehavior = e => e instanceof Process || e instanceof Method;

export class ProcessView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("diagram-view", "process-view");
        this.state = null;
        this.processId = null;
        this.transform = { x: 20, y: 20, k: 1 };
        this.fitPending = true;
        this.root.addEventListener("change", e => {
            if (e.target.matches(".pd-products")) { this.showProducts = e.target.checked; this.fitPending = true; this.show(this.state); return; }
            if (!e.target.matches(".pd-select") || !e.target.value) return;
            const value = e.target.value;
            if (value.startsWith("overview:")) { this.renderOverview(value.slice("overview:".length), this.state.model.get(this.state.selectedId)); return; }
            this.overview = null;
            this.processId = value;
            this.fitPending = true;
            const model = this.state.model;
            // A process without steps has no flow: select it in the overview of its document.
            if (!model.subBehaviors(model.get(value)).length) this.lastSelectedId = value;
            this.dispatchEvent(new CustomEvent("select", { detail: { id: value } }));
        });
    }

    /** The behaviors with steps that the view can show. */
    processes(model) {
        return [...model.elements.values()].filter(e => isBehavior(e) && model.subBehaviors(e).length);
    }

    /** The top-level processes and methods of a document (not owned by another process or method). */
    documentBehaviors(model, document) {
        return [...model.elements.values()].filter(e => isBehavior(e) && e.document === document && !isBehavior(model.get(e.ownerId)));
    }

    show(state) {
        this.state = state;
        const { model } = state;
        if (!model) {
            this.root.innerHTML = `<div class="fv-empty">${escapeHtml(state.message || "Waiting for the model check…")}</div>`;
            return;
        }
        const selected = model.get(state.selectedId);
        const selectionChanged = state.selectedId !== this.lastSelectedId;
        this.lastSelectedId = state.selectedId;
        // Another document selected in the Documents or Libraries panel: show its processes.
        const document = state.activeDocument;
        if (document !== this.lastDocument) {
            this.lastDocument = document;
            if (!selected || selected.document !== document) { this.processId = null; this.overview = null; }
        }
        // The overview stays until another element is selected elsewhere.
        if (this.overview && !selectionChanged) return this.renderOverview(this.overview, selected);

        const candidates = this.processes(model);
        let process = null;
        const current = model.get(this.processId);
        // A step of the shown process keeps the process; a process with steps is shown itself.
        if (isBehavior(selected) && isBehavior(current) && model.subBehaviors(current).includes(selected)) process = current;
        else if (isBehavior(selected) && model.subBehaviors(selected).length) process = selected;
        else if (isBehavior(selected) && model.get(selected.ownerId) && isBehavior(model.get(selected.ownerId))) process = model.get(selected.ownerId);
        else if (isBehavior(selected)) process = candidates.find(p => model.subBehaviors(p).includes(selected)) || null;
        // A process without steps: the overview of its document.
        if (!process && isBehavior(selected)) return this.renderOverview(selected.document, selected);
        if (!process && this.overview) return this.renderOverview(this.overview, selected);
        if (!process) process = model.get(this.processId);
        if (!isBehavior(process) && document) {
            // The active document: the flow of its only process with steps, otherwise the overview of its processes.
            const own = this.documentBehaviors(model, document);
            const withSteps = own.filter(p => model.subBehaviors(p).length);
            if (withSteps.length === 1 && own.length === 1) process = withSteps[0];
            else if (own.length) return this.renderOverview(document, selected);
        }
        if (!isBehavior(process)) process = candidates.find(p => !p.library) || candidates[0] || null;
        if (!process) {
            this.root.innerHTML = `<div class="fv-empty"><p>No process with steps yet.</p>
                <p>Open a document with processes, e.g. <strong>SYSMODProcesses.sysml</strong> or <strong>ISO15288Processes.sysml</strong> in the Documents panel, or an example.</p></div>`;
            return;
        }
        this.overview = null;
        if (process.id !== this.processId) { this.processId = process.id; this.fitPending = true; }
        this.render(process, selected);
    }

    /** The options of the process select: the overview of the active document, its processes, then all others. */
    selectOptions(model, process) {
        const document = this.overview || (process && process.document) || this.state.activeDocument;
        const own = document ? this.documentBehaviors(model, document) : [];
        const option = (p, label) => `<option value="${escapeHtml(p.id)}"${p === process ? " selected" : ""}>${escapeHtml(label || p.name)}</option>`;
        const others = this.processes(model).filter(p => !own.includes(p));
        return `${document && own.length ? `<option value="overview:${escapeHtml(document)}"${!process ? " selected" : ""}>All processes of ${escapeHtml(document)}</option>
                <optgroup label="${escapeHtml(document)}">${own.map(p => option(p, model.subBehaviors(p).length ? `▸ ${p.name}` : p.name)).join("")}</optgroup>` : ""}
            ${others.length ? `<optgroup label="Other processes with steps">${others.map(p => option(p, `${p.name}${p.document ? ` (${p.document})` : ""}`)).join("")}</optgroup>` : ""}`;
    }

    /** All top-level processes and methods of a document as cards, grouped by their package. */
    renderOverview(document, selected) {
        const { model } = this.state;
        this.overview = document;
        this.processId = null;
        const own = this.documentBehaviors(model, document);
        // The other methodology elements of the document, shown in the document editor.
        const inDocument = list => list.filter(e => e.document === document && !(model.get(e.ownerId) && (isBehavior(model.get(e.ownerId)) || model.get(e.ownerId) instanceof MBSEEnvironment))).length;
        const others = [["Roles", inDocument(model.roles)], ["Tools", inDocument(model.tools)], ["Products", inDocument(model.artifacts)]].filter(([, n]) => n);
        const groups = new Map();
        for (const p of own) {
            const pkg = p.id.split("::").slice(0, -1).join("::") || document;
            if (!groups.has(pkg)) groups.set(pkg, []);
            groups.get(pkg).push(p);
        }
        const card = p => {
            const steps = model.subBehaviors(p).length;
            const environmentId = this.environmentOf(p);
            this.processLane = "";
            const lane = this.laneOf(p, environmentId);
            const performer = lane.key ? lane.label : "";
            const types = p.typeIds.slice(0, 1).map(t => (model.generals[t] && model.generals[t].name) || model.nameOf(t, t.split("::").pop()));
            const doc = p.doc || (p.inheritedDoc ? p.inheritedDoc.text : "");
            return `<button type="button" class="pd-card${steps ? " has-steps" : ""}${selected && selected.id === p.id ? " selected" : ""}" data-open="${escapeHtml(p.id)}" data-nested="${steps}"
                    title="${escapeHtml([`${p.kindLabel} ${p.name}${types.length ? ` : ${types[0]}` : ""}`, doc, steps ? "double-click to show the flow" : "double-click to open the form"].filter(Boolean).join("\n"))}">
                <span class="pd-card-kind">${escapeHtml(p.kindLabel)}${p.isDefinition ? " definition" : ""}</span>
                <span class="pd-card-name">${steps ? "▸ " : ""}${escapeHtml(p.name)}</span>
                <span class="pd-card-meta">${[steps ? `${steps} steps` : "no steps", performer, types.length ? `: ${types[0]}` : ""].filter(Boolean).map(escapeHtml).join(" · ")}</span>
            </button>`;
        };
        this.root.innerHTML = `<div class="dg-toolbar">
                <label class="dg-field">Process <select class="pd-select">${this.selectOptions(model, null)}</select></label>
                <span class="dg-status">${own.length} processes and methods in ${escapeHtml(document)}</span>
                <span class="dg-spacer"></span>
                ${others.map(([label, count]) => `<button type="button" class="fv-link" data-document-section="${escapeHtml(label)}">${escapeHtml(label)} <span class="fv-muted">${count}</span></button>`).join(" ")}
                <button type="button" class="fv-link" data-document-section="">Document editor</button>
            </div>
            <div class="pd-overview">
                ${own.length ? [...groups].map(([pkg, list]) => `<section class="pd-group"><h3>${escapeHtml(pkg)}</h3><div class="pd-cards">${list.map(card).join("")}</div></section>`).join("")
                    : `<div class="fv-empty"><p>${escapeHtml(document)} contains no processes or methods.</p></div>`}
                <p class="pd-hint">Click: select · double-click: show the flow (▸ has steps) or open the form</p>
            </div>`;
        this.root.querySelector(".dg-toolbar").addEventListener("click", e => {
            const target = e.target.closest("[data-document-section]");
            if (target) this.dispatchEvent(new CustomEvent("document", { detail: { name: document, section: target.dataset.documentSection || null } }));
        });
        const box = this.root.querySelector(".pd-overview");
        box.addEventListener("click", e => {
            const node = e.target.closest("[data-open]");
            if (!node) return;
            this.lastSelectedId = node.dataset.open;   // stay in the overview
            this.dispatchEvent(new CustomEvent("select", { detail: { id: node.dataset.open } }));
        });
        box.addEventListener("dblclick", e => {
            const node = e.target.closest("[data-open]");
            if (!node) return;
            if (Number(node.dataset.nested)) {
                this.overview = null; this.processId = node.dataset.open; this.fitPending = true;
                this.lastSelectedId = undefined;
                this.dispatchEvent(new CustomEvent("select", { detail: { id: node.dataset.open } }));
            } else this.dispatchEvent(new CustomEvent("view", { detail: { view: "form" } }));
        });
    }

    /** The environment in whose scope the process is performed, or null for a definition. */
    environmentOf(process) {
        const { model } = this.state;
        for (let e = process; e; e = model.get(e.ownerId)) if (e.environmentId && model.get(e.environmentId)) return e.environmentId;
        return null;
    }

    /** The swimlane of a step: its responsible performer. */
    laneOf(step, environmentId) {
        const { model } = this.state;
        if (environmentId) {
            const role = model.performersOf(step, environmentId, ["primary"])[0];
            if (role) return { key: role.id, label: role.name, id: role.id };
        }
        const slot = step.slots.find(s => s.kind === "primary");
        if (!slot) {
            // No responsible performer of its own: the performer of the process, e.g. its project manager.
            const own = this.processLane;
            return { key: "", label: own ? `(${own}, the performer of the process)` : "(performer of the process)" };
        }
        const name = model.get(slot.slotId) ? model.nameOf(slot.slotId) : slot.slotId.includes("<") ? "" : slot.slotId.split("::").pop();
        const value = slot.valueIds.length ? model.nameOf(slot.valueIds[0], slot.valueIds[0].split("::").pop()) : "";
        const type = slot.typeIds.length ? ((model.generals[slot.typeIds[0]] && model.generals[slot.typeIds[0]].name) || slot.typeIds[0].split("::").pop()) : "";
        const label = value || [name, type].filter(Boolean).join(" : ") || "(performer)";
        return { key: value ? slot.valueIds[0] : type || name, label, id: slot.valueIds[0] || null };
    }

    render(process, selected) {
        const { model } = this.state;
        const { steps, successions } = model.flowOf(process);
        const environmentId = this.environmentOf(process);
        // The products of a step: the types of its input and output parameters (e.g. SystemSpecification).
        const productNames = (s, list) => (s[list] || []).map(f => f.typeIds.length ? ((model.generals[f.typeIds[0]] && model.generals[f.typeIds[0]].name) || model.nameOf(f.typeIds[0], f.typeIds[0].split("::").pop())) : f.name);
        const withProducts = this.showProducts !== false && steps.some(s => productNames(s, "outputFeatures").length);
        const BOX_H = withProducts ? 62 : BOX_H_PLAIN;
        this.processLane = "";
        const processLane = this.laneOf(process, environmentId);
        this.processLane = processLane.key ? processLane.label : "";

        // Columns: the longest path from the start along the successions; steps without succession at the right.
        const rank = new Map([["start", 0]]);
        for (let changed = true, guard = 0; changed && guard < steps.length + 2; guard++) {
            changed = false;
            for (const s of successions) {
                if (!rank.has(s.sourceId) || s.targetId === "start") continue;
                const r = rank.get(s.sourceId) + 1;
                if (!rank.has(s.targetId) || rank.get(s.targetId) < r) { rank.set(s.targetId, r); changed = true; }
            }
        }
        // Steps that a succession reaches only from other unranked steps: after their predecessors.
        for (const s of steps) if (!rank.has(s.id) && successions.some(x => x.targetId === s.id || x.sourceId === s.id)) {
            const before = successions.filter(x => x.targetId === s.id && rank.has(x.sourceId)).map(x => rank.get(x.sourceId) + 1);
            rank.set(s.id, before.length ? Math.max(...before) : 1);
        }
        const ordered = steps.filter(s => rank.has(s.id));
        const free = steps.filter(s => !rank.has(s.id));
        const maxStep = Math.max(0, ...ordered.map(s => rank.get(s.id)));
        const doneRank = successions.some(s => s.targetId === "done") ? Math.max(maxStep + 1, rank.get("done") || 0) : null;
        free.forEach((s, i) => rank.set(s.id, (doneRank ?? maxStep) + 1 + (successions.length ? 0 : i)));

        // Lanes: the responsible performers, in the order of the first step.
        const lanes = [];
        const laneOf = new Map();
        for (const s of [...steps].sort((a, b) => rank.get(a.id) - rank.get(b.id))) {
            const lane = this.laneOf(s, environmentId);
            let entry = lanes.find(l => l.key === lane.key);
            if (!entry) { entry = { ...lane, rows: new Map() }; lanes.push(entry); }
            laneOf.set(s.id, entry);
        }
        if (!lanes.length) lanes.push({ key: "", label: "(performer of the process)", rows: new Map() });

        // Several steps of a lane in one row stand side by side.
        const columnsInLane = lane => Math.max(1, ...[...lane.rows.values()]);
        const columnOf = new Map();
        for (const s of steps) {
            const lane = laneOf.get(s.id), r = rank.get(s.id);
            const column = lane.rows.get(r) || 0;
            lane.rows.set(r, column + 1);
            columnOf.set(s.id, column);
        }
        let x = 0;
        for (const lane of lanes) {
            lane.x = x;
            lane.w = columnsInLane(lane) * (BOX_W + 16) - 16 + 2 * LANE_PAD;
            x += lane.w;
        }
        const width = x;
        const rows = Math.max(...[...rank.values()], doneRank ?? 0) + 1;
        const rowY = r => HEAD_H + 24 + r * (BOX_H + ROW_GAP);
        const height = rowY(rows) + 4;
        const pos = new Map();
        for (const s of steps) {
            const lane = laneOf.get(s.id);
            pos.set(s.id, { x: lane.x + LANE_PAD + columnOf.get(s.id) * (BOX_W + 16), y: rowY(rank.get(s.id)), w: BOX_W, h: BOX_H });
        }
        const centerOf = lane => lane.x + LANE_PAD + BOX_W / 2;
        const firstLane = (successions.find(x => x.sourceId === "start" && laneOf.get(x.targetId)) || {}).targetId;
        const startLane = firstLane ? laneOf.get(firstLane) : lanes[0];
        pos.set("start", { x: centerOf(startLane) - END_R, y: rowY(0) + BOX_H / 2 - END_R, w: 2 * END_R, h: 2 * END_R });
        if (doneRank !== null) {
            const last = (successions.find(x => x.targetId === "done" && laneOf.get(x.sourceId)) || {}).sourceId;
            const lane = last ? laneOf.get(last) : lanes[0];
            pos.set("done", { x: centerOf(lane) - END_R, y: rowY(doneRank) + BOX_H / 2 - END_R, w: 2 * END_R, h: 2 * END_R });
        }

        const parts = [];
        lanes.forEach((lane, i) => {
            parts.push(`<rect class="pd-lane${i % 2 ? " odd" : ""}" x="${lane.x}" y="0" width="${lane.w}" height="${height}"/>`);
            parts.push(`<g class="pd-lane-head${lane.id ? " link" : ""}" ${lane.id && model.get(lane.id) ? `data-open="${escapeHtml(lane.id)}" tabindex="0"` : ""}>
                <text x="${lane.x + lane.w / 2}" y="${HEAD_H / 2 + 5}" text-anchor="middle">${escapeHtml(fit(lane.label, lane.w - 16, "600 12.5px system-ui, sans-serif"))}</text><title>${escapeHtml(lane.label)}</title></g>`);
            parts.push(`<line class="pd-lane-line" x1="${lane.x + lane.w}" y1="0" x2="${lane.x + lane.w}" y2="${height}"/>`);
        });
        parts.push(`<line class="pd-lane-line strong" x1="0" y1="${HEAD_H}" x2="${width}" y2="${HEAD_H}"/>`);
        if (free.length && successions.length) {
            const y = rowY((doneRank ?? maxStep) + 1) - ROW_GAP / 2;
            parts.push(`<line class="pd-free-line" x1="0" y1="${y}" x2="${width}" y2="${y}"/><text class="pd-free-label" x="8" y="${y + 13}">without succession</text>`);
        }
        // Successions below the nodes.
        for (const s of successions) {
            const a = pos.get(s.sourceId), b = pos.get(s.targetId);
            if (!a || !b) continue;
            const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y;
            const d = y2 > y1
                ? `M${x1},${y1} C${x1},${y1 + ROW_GAP} ${x2},${y2 - ROW_GAP} ${x2},${y2}`
                : `M${a.x + a.w},${a.y + a.h / 2} C${a.x + a.w + 60},${a.y + a.h / 2} ${b.x + b.w + 60},${b.y + b.h / 2} ${b.x + b.w},${b.y + b.h / 2}`;
            parts.push(`<path class="pd-edge" d="${d}" marker-end="url(#pd-arrow)"><title>${escapeHtml(`${model.nameOf(s.sourceId, s.sourceId)} → ${model.nameOf(s.targetId, s.targetId)}`)}</title></path>`);
        }
        const start = pos.get("start");
        parts.push(`<circle class="pd-start" cx="${start.x + END_R}" cy="${start.y + END_R}" r="${END_R}"><title>start</title></circle>`);
        if (pos.has("done")) {
            const done = pos.get("done");
            parts.push(`<circle class="pd-done-ring" cx="${done.x + END_R}" cy="${done.y + END_R}" r="${END_R}"/><circle class="pd-done" cx="${done.x + END_R}" cy="${done.y + END_R}" r="${END_R - 5}"><title>done</title></circle>`);
        }
        for (const s of steps) {
            const p = pos.get(s.id);
            const nested = model.subBehaviors(s).length;
            const inherited = !s.id.startsWith(process.id + "::");
            const tools = environmentId ? model.performersOf(s, environmentId, ["tool"]).map(t => t.name)
                : s.slots.filter(x => x.kind === "tool").map(x => model.nameOf(x.valueIds[0], (x.typeIds[0] || x.slotId).split("::").pop()));
            const types = s.typeIds.slice(0, 1).map(t => (model.generals[t] && model.generals[t].name) || model.nameOf(t, t.split("::").pop()));
            const second = tools.length ? `with ${tools.join(", ")}` : types.length ? `: ${types[0]}` : "";
            const inputs = productNames(s, "inputFeatures"), outputs = productNames(s, "outputFeatures");
            const tip = [`${s.kindLabel} ${s.name}${types.length ? ` : ${types[0]}` : ""}`, s.doc || (s.inheritedDoc ? s.inheritedDoc.text : ""),
                inputs.length ? `Inputs: ${inputs.join(", ")}` : "", outputs.length ? `Outputs: ${outputs.join(", ")}` : "",
                nested ? `${nested} steps: double-click to show them` : "", inherited ? "inherited" : ""].filter(Boolean).join("\n");
            const productLine = withProducts && outputs.length ? `→ ${outputs.join(", ")}` : "";
            const nameY = p.y + (withProducts ? (second ? 18 : (productLine ? 24 : 35)) : (second ? 19 : 27));
            parts.push(`<g class="ed-node method${s instanceof Process ? " process" : ""}${inherited ? " inherited" : ""}${selected && selected.id === s.id ? " selected" : ""}" data-open="${escapeHtml(s.id)}" data-nested="${nested}" tabindex="0">
                <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="8"/>
                <text x="${p.x + 10}" y="${nameY}" class="pd-name">${escapeHtml(fit((nested ? "▸ " : "") + s.name, p.w - 20, "600 13px system-ui, sans-serif"))}</text>
                ${second ? `<text x="${p.x + 10}" y="${withProducts ? p.y + 34 : p.y + 36}" class="pd-meta">${escapeHtml(fit(second, p.w - 20, "11px system-ui, sans-serif"))}</text>` : ""}
                ${productLine ? `<text x="${p.x + 10}" y="${p.y + (second ? 51 : 44)}" class="pd-product">${escapeHtml(fit(productLine, p.w - 20, "11px system-ui, sans-serif"))}</text>` : ""}
                <title>${escapeHtml(tip)}</title></g>`);
        }

        // Toolbar: the process, its enclosing process, the form.
        const options = this.selectOptions(model, process);
        const owner = model.get(process.ownerId);
        const path = [];
        for (let e = owner; e && isBehavior(e); e = model.get(e.ownerId)) path.unshift(e);
        this.root.innerHTML = `<div class="dg-toolbar">
                <label class="dg-field">Process <select class="pd-select">${options}</select></label>
                ${path.length ? `<span class="pd-path">${path.map(e => `<button type="button" class="fv-link" data-up="${escapeHtml(e.id)}">${escapeHtml(e.name)}</button>`).join(" › ")} › <strong>${escapeHtml(process.name)}</strong></span>` : ""}
                <button type="button" class="fv-link" data-form="${escapeHtml(process.id)}">Open form</button>
                ${steps.some(s => (s.outputFeatures || []).length) ? `<label class="dg-check"><input type="checkbox" class="pd-products"${this.showProducts !== false ? " checked" : ""}> Products</label>` : ""}
                <span class="dg-status">${steps.length} steps · ${successions.length} successions${environmentId ? ` · in ${escapeHtml(model.nameOf(environmentId))}` : ""}</span>
                <span class="dg-spacer"></span>
                <span class="dg-zoom">
                    <button type="button" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>
                    <button type="button" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>
                    <button type="button" data-zoom="fit" title="Fit to window">Fit</button>
                </span>
            </div>
            <div class="dg-canvas">
                <svg class="dg-svg pd-svg" role="application" aria-label="Flow of the process ${escapeHtml(process.name)}">
                    <defs><marker id="pd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="pd-arrowhead"/></marker></defs>
                    <g class="dg-viewport">${parts.join("")}</g>
                </svg>
                <div class="dg-legend" aria-label="Legend">
                    <span>lanes: responsible performers</span>
                    <span>wheel: scroll · Ctrl+wheel: zoom</span>
                    <span>→ succession</span>
                    ${withProducts ? "<span>→ X: output products</span>" : ""}
                    <span>▸ has steps (double-click)</span>
                    <span><i class="ed-swatch inherited"></i>inherited</span>
                </div>
            </div>`;
        this.wire(process);
    }

    wire(process) {
        const svg = this.root.querySelector(".pd-svg");
        const viewport = this.root.querySelector(".dg-viewport");
        const apply = () => viewport.setAttribute("transform", `translate(${this.transform.x},${this.transform.y}) scale(${this.transform.k})`);
        const fitAll = () => {
            const rect = svg.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const box = viewport.getBBox();
            if (!box.width || !box.height) return;
            // Fit the width (the flow runs downwards; scroll or pan to follow it), not smaller than readable.
            const k = Math.max(Math.min(0.75, (rect.width - 40) / box.width, (rect.height - 70) / box.height), Math.min(1.1, (rect.width - 40) / box.width, Math.max((rect.height - 70) / box.height, 0.75)));
            this.transform = { k, x: 20 - box.x * k, y: 20 - box.y * k };
            apply();
        };
        const zoomBy = (factor, cx, cy) => {
            const rect = svg.getBoundingClientRect();
            if (cx === undefined) { cx = rect.width / 2; cy = rect.height / 2; }
            const k = Math.min(3, Math.max(0.2, this.transform.k * factor));
            const ratio = k / this.transform.k;
            this.transform = { k, x: cx - (cx - this.transform.x) * ratio, y: cy - (cy - this.transform.y) * ratio };
            apply();
        };
        apply();
        if (this.fitPending) { this.fitPending = false; requestAnimationFrame(fitAll); }
        const toolbar = this.root.querySelector(".dg-toolbar");
        toolbar.addEventListener("click", e => {
            const zoom = e.target.closest("[data-zoom]");
            if (zoom) { if (zoom.dataset.zoom === "fit") fitAll(); else zoomBy(zoom.dataset.zoom === "in" ? 1.25 : 0.8); return; }
            const up = e.target.closest("[data-up]");
            if (up) { this.dispatchEvent(new CustomEvent("select", { detail: { id: up.dataset.up } })); return; }
            const form = e.target.closest("[data-form]");
            if (form) {
                this.dispatchEvent(new CustomEvent("select", { detail: { id: form.dataset.form } }));
                this.dispatchEvent(new CustomEvent("view", { detail: { view: "form" } }));
            }
        });
        let drag = null, dragged = false;
        svg.addEventListener("pointerdown", e => {
            if (e.button !== 0) return;
            drag = { x: e.clientX, y: e.clientY, tx: this.transform.x, ty: this.transform.y, moved: false };
            dragged = false;
        });
        svg.addEventListener("pointermove", e => {
            if (!drag) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (!drag.moved && Math.hypot(dx, dy) < 4) return;
            drag.moved = true;
            svg.classList.add("panning");
            this.transform.x = drag.tx + dx;
            this.transform.y = drag.ty + dy;
            apply();
        });
        const end = () => { if (drag && drag.moved) dragged = true; drag = null; svg.classList.remove("panning"); };
        svg.addEventListener("pointerup", end);
        svg.addEventListener("pointerleave", end);
        // The wheel scrolls the flow; with Ctrl (or a pinch) it zooms.
        svg.addEventListener("wheel", e => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const rect = svg.getBoundingClientRect();
                zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
            } else {
                this.transform.x -= e.deltaX;
                this.transform.y -= e.deltaY;
                apply();
            }
        }, { passive: false });
        // A click selects a step (and shows it in the other views); a double-click on a step with steps shows its flow.
        svg.addEventListener("click", e => {
            if (dragged) { dragged = false; return; }
            const node = e.target.closest("[data-open]");
            if (node) this.dispatchEvent(new CustomEvent("select", { detail: { id: node.dataset.open } }));
        });
        svg.addEventListener("dblclick", e => {
            const node = e.target.closest("[data-open]");
            if (!node) return;
            if (Number(node.dataset.nested)) { this.processId = node.dataset.open; this.fitPending = true; this.dispatchEvent(new CustomEvent("select", { detail: { id: node.dataset.open } })); }
            else {
                this.dispatchEvent(new CustomEvent("select", { detail: { id: node.dataset.open } }));
                this.dispatchEvent(new CustomEvent("view", { detail: { view: "form" } }));
            }
        });
        svg.addEventListener("keydown", e => {
            const node = e.target.closest("[data-open]");
            if (node && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.dispatchEvent(new CustomEvent("select", { detail: { id: node.dataset.open } })); }
        });
    }
}
