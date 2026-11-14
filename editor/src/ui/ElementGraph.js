// Graph of an element of the methodology and its connected artifacts: a role, a tool, a process or method, or a product.
//
// Not SysML notation, but a methodology diagram meant to be read without SysML knowledge. The element is the
// highlighted center node, with its general types below it (e.g. "specializes SystemArchitect"); its connected
// artifacts stand in labeled sections:
// - role:    tools | responsible for, supports | produces, needs
// - tool:    roles | facilitates | produces, needs
// - process or method: responsible, supports, tools | part of, steps | inputs, outputs
// - product: responsible roles | produced by, needed by | specialized by
// Edges: performs and facilitates as the methodology declares them (DtfaModel.performersOf), needs and produces
// (arrows), contains (process and its steps).
//
// The connections depend on an MBSE environment (its roles and tools perform the methodology); without one (e.g. a
// library such as ISO15288Processes) the roles and tools that the behaviors declare are used.

import { Process, Method, Role, Tool, Artifact } from "../dtfa/model.js";

const NODE_H = 30, GAP = 10, GROUP_GAP = 34, COL_GAP = 140, TOP = 30, HEAD_H = 54;
const WIDTH = { role: 200, tool: 200, method: 250, product: 220 };

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
export const kindOf = e => e instanceof Role ? "role" : e instanceof Tool ? "tool" : isBehavior(e) ? "method" : e instanceof Artifact ? "product" : null;

/** The connections of the methodology in the context of an environment (or of the whole model without one). */
export function connections(model, environmentId) {
    const behaviors = environmentId ? model.methodologyTree(environmentId).map(n => n.element)
        : [...model.elements.values()].filter(isBehavior);
    const fromSlots = (b, kinds, Class) => [...new Set((b.slots || []).filter(s => kinds.includes(s.kind))
        .flatMap(s => [...s.valueIds, ...s.typeIds]).map(id => model.get(id)).filter(e => e instanceof Class))];
    const performers = (b, kinds) => environmentId ? model.performersOf(b, environmentId, kinds)
        : fromSlots(b, kinds, kinds.includes("tool") ? Tool : Role);
    const ids = list => list.filter(id => model.get(id));
    const outputsOf = b => [...new Set(ids([...(b.outputIds || []), ...model.parameterProductIds(b, "outputFeatures")]))].map(id => model.get(id));
    const inputsOf = b => [...new Set(ids([...(b.inputIds || []), ...model.parameterProductIds(b, "inputFeatures")]))].map(id => model.get(id));
    const parentOf = b => {
        if (environmentId) { const p = model.get(model.parentInTree(b.id, environmentId)); if (p) return p; }
        const owner = model.get(b.ownerId);
        return isBehavior(owner) ? owner : null;
    };
    return { behaviors, performers, outputsOf, inputsOf, parentOf };
}

/**
 * The layout of the graph of an element: columns of sections, the center node in one of them, and the edges.
 * @returns {{ columns: {kind, sections: {label, items}[], center?: boolean}[], edges: {from, to, kind}[], summary: string }}
 */
export function graphOf(model, element, environmentId) {
    const c = connections(model, environmentId);
    const edges = [];
    const performsEdges = (role, b) => edges.push({ from: role.id, to: b.id, kind: "performs" });
    const productEdges = b => {
        for (const p of c.outputsOf(b)) edges.push({ from: b.id, to: p.id, kind: "output" });
        for (const p of c.inputsOf(b)) edges.push({ from: p.id, to: b.id, kind: "input" });
    };
    const products = behaviors => {
        const produced = [...new Set(behaviors.flatMap(c.outputsOf))];
        const needed = [...new Set(behaviors.flatMap(c.inputsOf))].filter(p => !produced.includes(p));
        return { produced, needed };
    };
    const kind = kindOf(element);
    if (kind === "role") {
        const responsible = c.behaviors.filter(b => c.performers(b, ["primary"]).includes(element));
        const supports = c.behaviors.filter(b => !responsible.includes(b) && c.performers(b, ["additional"]).includes(element));
        const behaviors = [...responsible, ...supports];
        const tools = [...new Set(behaviors.flatMap(b => c.performers(b, ["tool"])))];
        // MBSEMethodology (ProductOwnershipConnection): the primary performer owns the outputs of its behaviors.
        const { produced } = products(responsible);
        const needed = [...new Set(behaviors.flatMap(c.inputsOf))].filter(p => !produced.includes(p));
        behaviors.forEach(b => { performsEdges(element, b); productEdges(b); c.performers(b, ["tool"]).forEach(t => edges.push({ from: t.id, to: b.id, kind: "facilitates" })); });
        return {
            columns: [
                { kind: "role", center: true, sections: [{ label: "Tools", items: tools, kind: "tool" }] },
                { kind: "method", sections: [{ label: "Responsible for", items: responsible }, { label: "Supports", items: supports }] },
                { kind: "product", sections: [{ label: "Produces", items: produced }, { label: "Needs", items: needed }] },
            ],
            edges,
            summary: `responsible for ${responsible.length} · supports ${supports.length} · produces ${produced.length} · needs ${needed.length}`,
        };
    }
    if (kind === "tool") {
        const facilitates = c.behaviors.filter(b => c.performers(b, ["tool"]).includes(element));
        const roles = [...new Set(facilitates.flatMap(b => c.performers(b, ["primary", "additional"])))];
        const { produced, needed } = products(facilitates);
        facilitates.forEach(b => {
            edges.push({ from: element.id, to: b.id, kind: "facilitates" });
            c.performers(b, ["primary", "additional"]).forEach(r => performsEdges(r, b));
            productEdges(b);
        });
        return {
            columns: [
                { kind: "tool", center: true, sections: [{ label: "Roles", items: roles, kind: "role" }] },
                { kind: "method", sections: [{ label: "Facilitates", items: facilitates }] },
                { kind: "product", sections: [{ label: "Produces", items: produced }, { label: "Needs", items: needed }] },
            ],
            edges,
            summary: `facilitates ${facilitates.length} · roles ${roles.length} · products ${produced.length + needed.length}`,
        };
    }
    if (kind === "method") {
        const responsible = c.performers(element, ["primary"]);
        const supports = c.performers(element, ["additional"]).filter(r => !responsible.includes(r));
        const tools = c.performers(element, ["tool"]);
        const parent = c.parentOf(element);
        const steps = model.subBehaviors(element);
        const outputs = c.outputsOf(element);
        const inputs = c.inputsOf(element).filter(p => !outputs.includes(p));
        [...responsible, ...supports].forEach(r => performsEdges(r, element));
        tools.forEach(t => edges.push({ from: t.id, to: element.id, kind: "facilitates" }));
        productEdges(element);
        if (parent) edges.push({ from: parent.id, to: element.id, kind: "contains" });
        steps.forEach(s => edges.push({ from: element.id, to: s.id, kind: "contains" }));
        return {
            columns: [
                { kind: "role", sections: [{ label: "Responsible", items: responsible }, { label: "Supports", items: supports }, { label: "Tools", items: tools, kind: "tool" }] },
                { kind: "method", center: true, sections: [{ label: "Part of", items: parent ? [parent] : [] }, { label: "Steps", items: steps }] },
                { kind: "product", sections: [{ label: "Inputs", items: inputs }, { label: "Outputs", items: outputs }] },
            ],
            edges,
            summary: `${responsible.length + supports.length} performers · ${tools.length} tools · ${steps.length} steps · ${inputs.length} inputs · ${outputs.length} outputs`,
        };
    }
    if (kind === "product") {
        const producedBy = c.behaviors.filter(b => c.outputsOf(b).includes(element));
        const neededBy = c.behaviors.filter(b => !producedBy.includes(b) && c.inputsOf(b).includes(element));
        const owners = [...new Set(producedBy.flatMap(b => c.performers(b, ["primary"])))];
        const specializedBy = model.artifacts.filter(a => a !== element && (a.typeIds || []).includes(element.id));
        producedBy.forEach(b => { edges.push({ from: b.id, to: element.id, kind: "output" }); c.performers(b, ["primary"]).forEach(r => performsEdges(r, b)); });
        neededBy.forEach(b => edges.push({ from: element.id, to: b.id, kind: "input" }));
        specializedBy.forEach(a => edges.push({ from: a.id, to: element.id, kind: "general" }));
        return {
            columns: [
                { kind: "role", sections: [{ label: "Responsible roles", items: owners }] },
                { kind: "method", sections: [{ label: "Produced by", items: producedBy }, { label: "Needed by", items: neededBy }] },
                { kind: "product", center: true, sections: [{ label: "Specialized by", items: specializedBy }] },
            ],
            edges,
            summary: `produced by ${producedBy.length} · needed by ${neededBy.length}${specializedBy.length ? ` · specialized by ${specializedBy.length}` : ""}`,
        };
    }
    return { columns: [], edges: [], summary: "" };
}

/** Renders and wires the graph of an element. Clicking a node calls onOpen(id); the center node onCenter(id). */
export class ElementGraph {
    constructor() {
        this.transform = { x: 20, y: 20, k: 1 };
        this.fitPending = true;
        this.elementId = null;
        this.show = { products: true };
    }

    render(host, { model, element, environmentId, selectedId, toolbar = "" }, { onOpen, onCenter }) {
        if (this.elementId !== element.id) { this.elementId = element.id; this.fitPending = true; }
        const graph = graphOf(model, element, environmentId);
        const nodes = new Map();
        const groups = [];
        const parts = [];
        let x = 0;
        for (const column of graph.columns) {
            const w = WIDTH[column.kind];
            let y = TOP;
            if (column.center) {
                nodes.set(element.id, { e: element, kind: column.kind, x, y, w, h: HEAD_H, center: true });
                y += HEAD_H + 16;
                // The general types of the element, e.g. "specializes SystemArchitect".
                for (const g of (element.typeIds || []).slice(0, 3)) {
                    const name = (model.generals[g] && model.generals[g].name) || model.nameOf(g, g.split("::").pop());
                    parts.push(`<path class="ed-general" d="M${x + w / 2},${y - 16} L${x + w / 2},${y}" marker-end="url(#eg-generalization)"/>
                        <g class="ed-node ${column.kind} general inherited"${model.get(g) ? ` data-open="${escapeHtml(g)}" tabindex="0"` : ""}>
                        <rect x="${x}" y="${y}" width="${w}" height="${NODE_H}" rx="6"/>
                        <text x="${x + 10}" y="${y + 19}">${escapeHtml(fit(`specializes ${name}`, w - 20))}</text><title>${escapeHtml(g)}</title></g>`);
                    y += NODE_H + 16;
                }
                y += GROUP_GAP - 16;
            }
            for (const section of column.sections) {
                const kind = section.kind || column.kind;
                if (kind === "product" && !this.show.products) continue;
                const items = section.items.filter(e => e && !nodes.has(e.id));
                if (!items.length) continue;
                const sw = WIDTH[kind] || w;
                const top = y;
                for (const e of items) {
                    // Steps and parts are indented below the element they belong to.
                    nodes.set(e.id, { e, kind, x, y, w: sw, h: NODE_H });
                    y += NODE_H + GAP;
                }
                groups.push({ label: `${section.label} (${items.length})`, x, y: top, w: sw, h: y - top - GAP });
                y += GROUP_GAP;
            }
            x += w + COL_GAP;
        }
        for (const g of groups) {
            parts.unshift(`<rect class="ed-group" x="${g.x - 10}" y="${g.y - 28}" width="${g.w + 20}" height="${g.h + 38}" rx="10"/>
                <text class="ed-group-label" x="${g.x}" y="${g.y - 10}">${escapeHtml(fit(g.label, g.w - 10, "600 12px system-ui, sans-serif"))}</text>`);
        }
        const edgeParts = [];
        for (const e of graph.edges) {
            const a = nodes.get(e.from), b = nodes.get(e.to);
            if (!a || !b || a === b) continue;
            let d;
            if (Math.abs(a.x - b.x) < 1) {
                // Same column (e.g. a process and its steps): an arc on the left side.
                const x1 = a.x, x2 = b.x, y1 = a.y + a.h / 2, y2 = b.y + b.h / 2, c = -40 - Math.min(60, Math.abs(y2 - y1) / 8);
                d = `M${x1},${y1} C${x1 + c},${y1} ${x2 + c},${y2} ${x2},${y2}`;
            } else {
                const leftToRight = a.x < b.x;
                const x1 = leftToRight ? a.x + a.w : a.x, x2 = leftToRight ? b.x : b.x + b.w;
                const y1 = a.y + a.h / 2, y2 = b.y + b.h / 2, c = Math.max(40, Math.abs(x2 - x1) / 2) * (leftToRight ? 1 : -1);
                d = `M${x1},${y1} C${x1 + c},${y1} ${x2 - c},${y2} ${x2},${y2}`;
            }
            const verb = { performs: "performs", facilitates: "facilitates", output: "produces", input: "is needed by", contains: "contains", general: "specializes" }[e.kind];
            const title = `${model.nameOf(e.from)} ${verb} ${model.nameOf(e.to)}`;
            const marker = e.kind === "general" ? 'marker-end="url(#eg-generalization)"' : e.kind === "input" || e.kind === "output" || e.kind === "contains" ? 'marker-end="url(#eg-arrow)"' : "";
            edgeParts.push(`<path class="ed-edge ${e.kind} declared" d="${d}" ${marker}><title>${escapeHtml(title)}</title></path>`);
        }
        for (const n of nodes.values()) {
            const inherited = !n.center && (n.e.library || (environmentId && n.e.environmentId && n.e.environmentId !== environmentId));
            const isProcess = n.e instanceof Process;
            const types = (n.e.typeIds || []).slice(0, 2).map(t => t.split("::").pop()).join(", ");
            const tip = [`${n.e.kindLabel} ${n.e.name}${types ? ` : ${types}` : ""}`, n.e.doc || (n.e.inheritedDoc ? n.e.inheritedDoc.text : ""),
                n.center ? "Click to open its form" : ""].filter(Boolean).join("\n");
            if (n.center) {
                parts.push(`<g class="ed-node env eg-center ${n.kind}${n.e.id === selectedId ? " selected" : ""}" data-center="${escapeHtml(n.e.id)}" tabindex="0">
                    <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8"/>
                    <text class="ed-stereo" x="${n.x + n.w / 2}" y="${n.y + 18}" text-anchor="middle">«${escapeHtml(n.e.kindLabel.toLowerCase())}»</text>
                    <text class="ed-title" x="${n.x + n.w / 2}" y="${n.y + 39}" text-anchor="middle">${escapeHtml(fit(n.e.name, n.w - 20, "600 15px system-ui, sans-serif"))}</text>
                    <title>${escapeHtml(tip)}</title></g>`);
                continue;
            }
            parts.push(`<g class="ed-node ${n.kind}${inherited ? " inherited" : ""}${isProcess ? " process" : ""}" data-open="${escapeHtml(n.e.id)}" tabindex="0">
                <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="6"/>
                <text x="${n.x + 10}" y="${n.y + 19}">${escapeHtml(fit((isProcess && model.subBehaviors(n.e).length ? "▸ " : "") + n.e.name, n.w - 20))}</text><title>${escapeHtml(tip)}</title></g>`);
        }
        host.innerHTML = `<div class="dg-toolbar ed-toolbar eg-toolbar">
                ${toolbar}
                <span class="dg-status">${escapeHtml(graph.summary)}</span>
                <span class="dg-spacer"></span>
                <label class="dg-check"><input type="checkbox" data-show="products"${this.show.products ? " checked" : ""}> Products</label>
                <span class="dg-zoom">
                    <button type="button" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>
                    <button type="button" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>
                    <button type="button" data-zoom="fit" title="Fit to window">Fit</button>
                </span>
            </div>
            <div class="dg-canvas">
                <svg class="dg-svg ed-svg eg-svg" role="application" aria-label="${escapeHtml(element.kindLabel)} ${escapeHtml(element.name)} and its connected artifacts">
                    <defs>
                        <marker id="eg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ed-arrowhead"/></marker>
                        <marker id="eg-generalization" viewBox="0 0 12 12" refX="11" refY="6" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto"><path d="M0,0 L11,6 L0,12 z" class="ed-triangle"/></marker>
                    </defs>
                    <g class="dg-viewport">${parts.slice(0, groups.length).join("")}${edgeParts.join("")}${parts.slice(groups.length).join("")}</g>
                </svg>
                <div class="dg-legend" aria-label="Legend">
                    <span><i class="ed-swatch performs"></i>performs</span>
                    <span><i class="ed-swatch facilitates"></i>facilitates</span>
                    <span><i class="ed-swatch product"></i>needs / produces</span>
                    <span><i class="ed-swatch inherited"></i>inherited or library</span>
                </div>
            </div>`;
        this.wire(host, () => this.render(host, { model, element, environmentId, selectedId, toolbar }, { onOpen, onCenter }), { onOpen, onCenter });
    }

    wire(host, rerender, { onOpen, onCenter }) {
        const svg = host.querySelector(".eg-svg");
        const viewport = svg.querySelector(".dg-viewport");
        const apply = () => viewport.setAttribute("transform", `translate(${this.transform.x},${this.transform.y}) scale(${this.transform.k})`);
        const fitAll = () => {
            const rect = svg.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const box = viewport.getBBox();
            if (!box.width || !box.height) return;
            // Fit the width; long lists scroll (wheel) rather than shrink below a readable size.
            const k = Math.max(0.55, Math.min(1.2, (rect.width - 40) / box.width, Math.max((rect.height - 60) / box.height, 0.8)));
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
        const toolbar = host.querySelector(".eg-toolbar");
        toolbar.addEventListener("click", e => {
            const zoom = e.target.closest("[data-zoom]");
            if (zoom) { if (zoom.dataset.zoom === "fit") fitAll(); else zoomBy(zoom.dataset.zoom === "in" ? 1.25 : 0.8); }
        });
        toolbar.addEventListener("change", e => {
            const option = e.target.closest("[data-show]");
            if (!option) return;
            this.show[option.dataset.show] = option.checked;
            this.fitPending = true;
            rerender();
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
        // The wheel scrolls; with Ctrl (or a pinch) it zooms.
        svg.addEventListener("wheel", e => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const rect = svg.getBoundingClientRect();
                zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
            } else { this.transform.x -= e.deltaX; this.transform.y -= e.deltaY; apply(); }
        }, { passive: false });
        const activate = target => {
            const center = target.closest("[data-center]");
            if (center) { onCenter(center.dataset.center); return; }
            const node = target.closest("[data-open]");
            if (node) onOpen(node.dataset.open);
        };
        svg.addEventListener("click", e => { if (dragged) { dragged = false; return; } activate(e.target); });
        svg.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(e.target); } });
    }
}
