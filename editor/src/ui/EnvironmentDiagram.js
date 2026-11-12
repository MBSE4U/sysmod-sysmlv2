// Diagram of an MBSE environment (MBSEMethodology::MBSEEnvironment).
//
// Not SysML notation, but a methodology diagram meant to be read without SysML knowledge:
// - the environment on top, with a specialization arrow to the environments it specializes
// - left: the roles and the tools of the environment; center: its methodology (processes and methods as a tree);
//   right: its products. Inherited elements have a dashed border.
// - edges from roles and tools to the methods as the methodology declares them (primaryPerformer,
//   additionalPerformers, facilitationTools, ResponsibleFor, Supports and Facilitates connections, also through the
//   general types of the roles, e.g. SystemArchitect)
// - edges between methods and products: the inputs and outputs of the methods, the flow of the digital thread
//
// Events (dispatched by the owning EnvironmentView): "open" { id } for a click on an element.

import { Process } from "../dtfa/model.js";

const NODE_H = 30, GAP = 10, GROUP_GAP = 34, COL_W = 200, METHOD_W = 250, COL_GAP = 150, HEAD_H = 54, TOP = HEAD_H + 46;

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

export class EnvironmentDiagram {
    constructor() {
        this.transform = { x: 20, y: 20, k: 1 };
        this.fitPending = true;
        this.environmentId = null;
        this.show = { declared: true, products: true };
    }

    /** Renders the diagram into the host element. @param onOpen function(id, collection) for a click on an element, or on a group header (environment id and "roles", "tools", "methods" or "products") */
    render(host, state, environment, onOpen) {
        if (this.environmentId !== environment.id) { this.environmentId = environment.id; this.fitPending = true; }
        const { model, selectedId } = state;
        const scope = model.environmentScope(environment.id);
        const roles = model.inScope(model.roles, environment.id);
        const tools = model.inScope(model.tools, environment.id);
        const products = model.inScope(model.artifacts, environment.id);
        // The methodology tree, owned and inherited processes and methods (e.g. the steps of a library process).
        const tree = model.methodologyTree(environment.id);
        const behaviors = tree.map(t => t.element);
        const depthOf = new Map(tree.map(t => [t.element.id, t.depth]));
        const depth = b => depthOf.get(b.id) || 0;

        // Layout: left column roles and tools, center column the methodology, right column the products.
        const nodes = new Map();
        const place = (list, x, y, w, kind, indent = () => 0) => {
            for (const e of list) {
                const dx = indent(e) * 16;
                nodes.set(e.id, { e, kind, x: x + dx, y, w: w - dx, h: NODE_H });
                y += NODE_H + GAP;
            }
            return y;
        };
        const leftX = 0, centerX = COL_W + COL_GAP, rightX = centerX + METHOD_W + COL_GAP;
        const groups = [];
        let y = TOP;
        const rolesEnd = place(roles, leftX, y, COL_W, "role");
        groups.push({ label: "Roles", collection: "roles", x: leftX, y, w: COL_W, h: Math.max(NODE_H, rolesEnd - y - GAP) });
        y = Math.max(rolesEnd, y + NODE_H) + GROUP_GAP;
        const toolsEnd = place(tools, leftX, y, COL_W, "tool");
        groups.push({ label: "Tools", collection: "tools", x: leftX, y, w: COL_W, h: Math.max(NODE_H, toolsEnd - y - GAP) });
        const methodsEnd = place(behaviors, centerX, TOP, METHOD_W, "method", depth);
        // The methodology of the environment, or the one it inherits.
        const methodologyId = scope.map(id => model.get(id).methodologyId).find(Boolean);
        const methodologyName = methodologyId ? methodologyId.split("::").pop().replace(/^'(.*)'$/, "$1") : "";
        groups.push({ label: methodologyName ? `Methodology: ${methodologyName}` : "Methodology", collection: "methods", x: centerX, y: TOP, w: METHOD_W, h: Math.max(NODE_H, methodsEnd - TOP - GAP) });
        const productsEnd = place(products, rightX, TOP, COL_W, "product");
        groups.push({ label: "Products", collection: "products", x: rightX, y: TOP, w: COL_W, h: Math.max(NODE_H, productsEnd - TOP - GAP) });
        const width = rightX + COL_W;

        // Edges, aggregated per pair and kind.
        const edges = new Map();
        const edge = (from, to, kind, how) => {
            if (!nodes.has(from) || !nodes.has(to)) return;
            const key = `${from}|${to}|${kind}`;
            const existing = edges.get(key);
            if (existing) { existing.how.add(how); existing.count++; } else edges.set(key, { from, to, kind, how: new Set([how]), count: 1 });
        };
        for (const b of behaviors) {
            for (const r of model.performersOf(b, environment.id)) edge(r.id, b.id, "performs", "declared");
            for (const t of model.performersOf(b, environment.id, ["tool"])) edge(t.id, b.id, "facilitates", "declared");
        }
        for (const b of behaviors) {
            for (const a of b.inputIds) edge(a, b.id, "input", "declared");
            for (const a of b.outputIds) edge(b.id, a, "output", "declared");
        }

        const parts = [];
        // Environment header with its generalizations.
        const generals = environment.generalIds;
        const headW = Math.min(width, 420);
        const headX = (width - headW) / 2;
        parts.push(`<g class="ed-node env${environment.id === selectedId ? " selected" : ""}" data-open="${escapeHtml(environment.id)}">
            <rect x="${headX}" y="0" width="${headW}" height="${HEAD_H}" rx="8"/>
            <text class="ed-stereo" x="${headX + headW / 2}" y="18" text-anchor="middle">«MBSE environment»</text>
            <text class="ed-title" x="${headX + headW / 2}" y="39" text-anchor="middle">${escapeHtml(fit(environment.name, headW - 24, "600 15px system-ui, sans-serif"))}</text></g>`);
        generals.forEach((g, i) => {
            const gx = width + 60, gy = i * (HEAD_H + 12), gw = 240;
            const name = model.get(g) ? model.nameOf(g) : g.split("::").pop();
            parts.push(`<path class="ed-general" d="M${headX + headW},${HEAD_H / 2} L${gx},${gy + HEAD_H / 2}" marker-end="url(#ed-generalization)"/>`);
            parts.push(`<g class="ed-node env general" ${model.get(g) ? `data-open="${escapeHtml(g)}"` : ""}>
                <rect x="${gx}" y="${gy}" width="${gw}" height="${HEAD_H}" rx="8"/>
                <text class="ed-stereo" x="${gx + gw / 2}" y="${gy + 18}" text-anchor="middle">specializes</text>
                <text class="ed-title" x="${gx + gw / 2}" y="${gy + 39}" text-anchor="middle">${escapeHtml(fit(name, gw - 20, "600 15px system-ui, sans-serif"))}</text></g>`);
        });
        for (const g of groups) {
            // The group header opens the collection editor (existing elements and creation of new ones).
            parts.push(`<rect class="ed-group" x="${g.x - 10}" y="${g.y - 28}" width="${g.w + 20}" height="${g.h + 38}" rx="10"/>
                <g class="ed-group-head" data-open-collection="${g.collection}" tabindex="0" role="button" aria-label="Open the ${escapeHtml(g.label)} editor">
                    <title>Open the editor of the ${escapeHtml(g.label.split(":")[0].toLowerCase())}: the existing ones and new ones</title>
                    <rect x="${g.x - 10}" y="${g.y - 28}" width="${g.w + 20}" height="26" rx="10"/>
                    <text class="ed-group-label" x="${g.x}" y="${g.y - 10}">${escapeHtml(fit(g.label, g.w - 20, "600 12px system-ui, sans-serif"))} ›</text></g>`);
        }
        // Edges below the nodes.
        for (const e of edges.values()) {
            if (e.kind === "input" || e.kind === "output" ? !this.show.products : false) continue;
            const product = e.kind === "input" || e.kind === "output";
            if (!product && !this.show.declared) continue;
            const a = nodes.get(e.from), b = nodes.get(e.to);
            const leftToRight = a.x < b.x;
            const x1 = leftToRight ? a.x + a.w : a.x, x2 = leftToRight ? b.x : b.x + b.w;
            const y1 = a.y + a.h / 2, y2 = b.y + b.h / 2, c = Math.max(40, Math.abs(x2 - x1) / 2) * (leftToRight ? 1 : -1);
            const style = "declared";
            const title = `${model.nameOf(e.from)} ${{ performs: "performs", facilitates: "facilitates", input: "is needed by", output: "is produced by" }[e.kind]} ${model.nameOf(e.to)}`
                .replace(/^(.*) is produced by (.*)$/, (_, m, p) => `${p} is produced by ${m}`);
            const how = product ? "input or output of the method" : "declared by the methodology";
            parts.push(`<path class="ed-edge ${e.kind} ${style}" d="M${x1},${y1} C${x1 + c},${y1} ${x2 - c},${y2} ${x2},${y2}"
                ${e.kind === "input" || e.kind === "output" ? 'marker-end="url(#ed-arrow)"' : ""}><title>${escapeHtml(`${title}: ${how}`)}</title></path>`);
        }
        for (const n of nodes.values()) {
            const inherited = (n.e.environmentId && n.e.environmentId !== environment.id) || n.e.library;
            const isProcess = n.e instanceof Process;
            const label = (isProcess ? "▸ " : "") + n.e.name;
            const from = n.e.environmentId && n.e.environmentId !== environment.id ? model.nameOf(n.e.environmentId) : n.e.library ? n.e.id.split("::").slice(0, -1).join("::") : "";
            const types = n.e.typeIds.slice(0, 2).map(t => t.split("::").pop()).join(", ");
            const tip = [`${n.e.kindLabel} ${n.e.name}${types ? ` : ${types}` : ""}`, from ? `from ${from}` : "", n.e.doc || (n.e.inheritedDoc ? n.e.inheritedDoc.text : "")].filter(Boolean).join("\n");
            parts.push(`<g class="ed-node ${n.kind}${inherited ? " inherited" : ""}${isProcess ? " process" : ""}${n.e.id === selectedId ? " selected" : ""}" data-open="${escapeHtml(n.e.id)}" tabindex="0">
                <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="6"/>
                <text x="${n.x + 10}" y="${n.y + 19}">${escapeHtml(fit(label, n.w - 20))}</text><title>${escapeHtml(tip)}</title></g>`);
        }

        host.innerHTML = `<div class="dg-toolbar ed-toolbar">
                <span class="dg-status">Click an element to open its editor.</span>
                <span class="dg-spacer"></span>
                <label class="dg-check"><input type="checkbox" data-show="declared"${this.show.declared ? " checked" : ""}> Performers and tools</label>
                <label class="dg-check"><input type="checkbox" data-show="products"${this.show.products ? " checked" : ""}> Products</label>
                <span class="dg-zoom">
                    <button type="button" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>
                    <button type="button" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>
                    <button type="button" data-zoom="fit" title="Fit to window">Fit</button>
                </span>
            </div>
            <div class="dg-canvas">
                <svg class="dg-svg ed-svg" role="application" aria-label="Diagram of the MBSE environment ${escapeHtml(environment.name)}">
                    <defs>
                        <marker id="ed-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ed-arrowhead"/></marker>
                        <marker id="ed-generalization" viewBox="0 0 12 12" refX="11" refY="6" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto"><path d="M0,0 L11,6 L0,12 z" class="ed-triangle"/></marker>
                    </defs>
                    <g class="dg-viewport">${parts.join("")}</g>
                </svg>
                <div class="dg-legend" aria-label="Legend">
                    <span><i class="ed-swatch performs"></i>performs</span>
                    <span><i class="ed-swatch facilitates"></i>facilitates</span>
                    <span><i class="ed-swatch product"></i>needs / produces</span>
                    <span><i class="ed-swatch inherited"></i>inherited</span>
                </div>
            </div>`;
        this.wire(host, state, environment, onOpen);
    }

    wire(host, state, environment, onOpen) {
        const svg = host.querySelector(".ed-svg");
        const viewport = host.querySelector(".dg-viewport");
        const apply = () => viewport.setAttribute("transform", `translate(${this.transform.x},${this.transform.y}) scale(${this.transform.k})`);
        const fitAll = () => {
            const rect = svg.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const box = viewport.getBBox();
            if (!box.width || !box.height) return;
            const k = Math.min(1.2, (rect.width - 40) / box.width, (rect.height - 70) / box.height);
            this.transform = { k: Math.max(0.2, k), x: 20 - box.x * Math.max(0.2, k), y: 20 - box.y * Math.max(0.2, k) };
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
        if (this.fitPending) {
            this.fitPending = false;
            requestAnimationFrame(fitAll);
        }
        host.querySelector(".ed-toolbar").addEventListener("click", e => {
            const zoom = e.target.closest("[data-zoom]");
            if (!zoom) return;
            if (zoom.dataset.zoom === "fit") fitAll(); else zoomBy(zoom.dataset.zoom === "in" ? 1.25 : 0.8);
        });
        host.querySelector(".ed-toolbar").addEventListener("change", e => {
            const option = e.target.closest("[data-show]");
            if (!option) return;
            this.show[option.dataset.show] = option.checked;
            this.render(host, state, environment, onOpen);
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
        const end = () => {
            if (drag && drag.moved) dragged = true;
            drag = null;
            svg.classList.remove("panning");
        };
        svg.addEventListener("pointerup", end);
        svg.addEventListener("pointerleave", end);
        svg.addEventListener("wheel", e => {
            e.preventDefault();
            const rect = svg.getBoundingClientRect();
            zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
        }, { passive: false });
        svg.addEventListener("click", e => {
            if (dragged) { dragged = false; return; }
            const head = e.target.closest("[data-open-collection]");
            if (head) { onOpen(environment.id, head.dataset.openCollection); return; }
            const node = e.target.closest("[data-open]");
            if (node) onOpen(node.dataset.open);
        });
        svg.addEventListener("keydown", e => {
            const head = e.target.closest("[data-open-collection]");
            if (head && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(environment.id, head.dataset.openCollection); return; }
            const node = e.target.closest("[data-open]");
            if (node && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(node.dataset.open); }
        });
    }
}
