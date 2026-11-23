// The tabs Roles, Tools, Methodology and Products: a list of the elements of the current MBSE environment (own and
// inherited, the methodology as a tree) and the graph of the selected element with its connected artifacts
// (ElementGraph). Without an environment in the current document (e.g. the library ISO15288Processes), the list
// shows the elements of the document.
//
// Events: "select" { id } (list), "open" { id } (graph node: the graph of that element in its tab),
//         "form" { id } (the form of the element), "command" { command, id }, "collection" { kind, id }, "view" { view }

import { splitterHandle, makeResizable } from "./splitter.js";
import { Process, Method, Role, Tool, Artifact, MBSEEnvironment } from "../dtfa/model.js";
import { graphOf, ElementGraph } from "./ElementGraph.js";

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const isBehavior = e => e instanceof Process || e instanceof Method;

/** The tabs: their element class, the list in the environment, the command that adds an element, the collection editor. */
export const KINDS = {
    roles: { title: "Roles", singular: "role", is: e => e instanceof Role, command: "addRole", collection: "roles" },
    tools: { title: "Tools", singular: "tool", is: e => e instanceof Tool, command: "addTool", collection: "tools" },
    methodology: { title: "Methodology", singular: "process or method", is: isBehavior, command: "addMethod", collection: "methods" },
    products: { title: "Products", singular: "product", is: e => e instanceof Artifact, command: "addArtifact", collection: "products" },
};

export class ElementsView extends EventTarget {
    /** How the right side shows the current element: "diagram" or "table" (shared by the Roles, Tools, Methodology and Products tabs). */
    static mode = "diagram";

    constructor(container, kind) {
        super();
        this.root = container;
        this.kind = kind;
        this.spec = KINDS[kind];
        this.root.classList.add("el-view");
        this.graph = new ElementGraph();
        this.currentId = null;
        // The list is resizable; all four tabs share its width.
        makeResizable(this.root, { pane: ".el-list", variable: "--el-list-width", key: "element-list", min: 220 });
        this.root.addEventListener("click", e => {
            const modeButton = e.target.closest("[data-element-mode]");
            if (modeButton) { ElementsView.mode = modeButton.dataset.elementMode; if (this.state) this.show(this.state); return; }
            const openElement = e.target.closest("[data-open-element]");
            if (openElement) { this.dispatchEvent(new CustomEvent("open", { detail: { id: openElement.dataset.openElement } })); return; }
            const item = e.target.closest("[data-item]");
            if (item) { this.currentId = item.dataset.item; this.dispatchEvent(new CustomEvent("select", { detail: { id: item.dataset.item } })); return; }
            const command = e.target.closest("[data-command]");
            if (command) { this.dispatchEvent(new CustomEvent("command", { detail: { command: command.dataset.command, id: command.dataset.id } })); return; }
            const form = e.target.closest("[data-form]");
            if (form) { this.dispatchEvent(new CustomEvent("form", { detail: { id: form.dataset.form } })); return; }
            const table = e.target.closest("[data-table]");
            if (table) { this.dispatchEvent(new CustomEvent("collection", { detail: { kind: this.spec.collection, id: table.dataset.table } })); return; }
            const view = e.target.closest("[data-goto-view]");
            if (view) this.dispatchEvent(new CustomEvent("view", { detail: { view: view.dataset.gotoView, id: view.dataset.id } }));
        });
    }

    /** The elements of the list: [{ element, depth, inherited }]. */
    entries(model, environmentId, activeDocument) {
        const { is } = this.spec;
        if (environmentId) {
            if (this.kind === "methodology") return model.methodologyTree(environmentId).map(n => ({ element: n.element, depth: n.depth, inherited: n.inherited }));
            const list = this.kind === "products" ? model.productsOf(environmentId)
                : model.inScope(this.kind === "roles" ? model.roles : model.tools, environmentId);
            return list.map(e => ({ element: e, depth: 0, inherited: e.environmentId !== environmentId }));
        }
        // The elements of the document outside an environment, e.g. the processes and products of a library.
        const outside = e => {
            if (e.document !== activeDocument) return false;
            for (let o = model.get(e.ownerId); o; o = model.get(o.ownerId)) if (o instanceof MBSEEnvironment || (isBehavior(o) && !isBehavior(e))) return false;
            return true;
        };
        const all = [...model.elements.values()].filter(e => is(e) && outside(e));
        if (this.kind !== "methodology") return all.map(e => ({ element: e, depth: 0, inherited: false }));
        // Behaviors as a tree: the top-level ones with their nested steps.
        const result = [];
        const walk = (e, depth) => {
            if (result.some(r => r.element === e)) return;
            result.push({ element: e, depth, inherited: false });
            all.filter(c => c.ownerId === e.id).forEach(c => walk(c, depth + 1));
        };
        all.filter(e => !isBehavior(model.get(e.ownerId))).forEach(e => walk(e, 0));
        return result;
    }

    show(state) {
        this.state = state;
        const { model, environmentId, activeDocument, selectedId, editable } = state;
        if (!model) {
            this.root.innerHTML = `<div class="fv-empty">${escapeHtml(state.message || "Waiting for the model check…")}</div>`;
            return;
        }
        const entries = this.entries(model, environmentId, activeDocument);
        const selected = model.get(selectedId);
        if (selected && this.spec.is(selected)) this.currentId = selected.id;
        let current = model.get(this.currentId);
        if (!current || !this.spec.is(current)) current = entries.length ? entries[0].element : null;
        this.currentId = current ? current.id : null;
        const environment = model.get(environmentId);
        const context = environment ? `of ${escapeHtml(environment.name)}` : activeDocument ? `in ${escapeHtml(activeDocument)}` : "";
        const list = entries.map(({ element: e, depth, inherited }) => `<li class="${e === current ? "selected" : ""}${inherited ? " inherited" : ""}" style="padding-left:${8 + depth * 14}px">
                <button type="button" class="el-item" data-item="${escapeHtml(e.id)}" title="${escapeHtml([e.kindLabel + " " + e.name, e.doc || (e.inheritedDoc ? e.inheritedDoc.text : "")].filter(Boolean).join("\n"))}">
                    <span class="fm-dot tag-${this.kind === "methodology" ? "method" : this.kind === "products" ? "artifact" : this.kind.slice(0, -1)}" aria-hidden="true"></span>${escapeHtml(e.name)}</button></li>`).join("");
        // A current element that the list does not contain (e.g. a product outside the environment) stays visible.
        const missing = current && !entries.some(x => x.element === current);
        this.root.innerHTML = `<aside class="el-list" aria-label="${escapeHtml(this.spec.title)}">
                <div class="el-list-head"><h2>${escapeHtml(this.spec.title)} <span class="fv-count">${entries.length}</span></h2>
                    <span class="fv-muted">${context}</span></div>
                ${environment ? `<div class="el-list-actions">
                    ${editable ? `<button type="button" data-command="${this.spec.command}" data-id="${escapeHtml(environment.id)}">+ ${escapeHtml(this.spec.singular === "process or method" ? "Method" : this.spec.singular[0].toUpperCase() + this.spec.singular.slice(1))}</button>` : ""}
                    <button type="button" class="fv-link" data-table="${escapeHtml(environment.id)}" title="All ${escapeHtml(this.spec.title.toLowerCase())} of ${escapeHtml(environment.name)} in one table">All as table</button></div>` : ""}
                <ul class="el-items">${list}${missing ? `<li class="selected el-extra"><button type="button" class="el-item" data-item="${escapeHtml(current.id)}">${escapeHtml(current.name)}</button></li>` : ""}</ul>
                ${entries.length ? "" : `<p class="fv-muted el-none">No ${escapeHtml(this.spec.title.toLowerCase())} ${context}.</p>`}
                ${splitterHandle(`Width of the list of ${escapeHtml(this.spec.title.toLowerCase())}`)}
            </aside>
            <div class="el-graph diagram-view"></div>`;
        const host = this.root.querySelector(".el-graph");
        if (!current) {
            host.innerHTML = `<div class="fv-empty"><p>Select a ${escapeHtml(this.spec.singular)} in the list.</p></div>`;
            return;
        }
        const flow = isBehavior(current) && model.subBehaviors(current).length;
        // The switch Diagram | Table | Form refers to the element shown here (e.g. the method SetupProject).
        const mode = ElementsView.mode;
        const toolbar = `<strong class="eg-name">${escapeHtml(current.name)}</strong>
            <span class="ev-modes" role="group" aria-label="Show ${escapeHtml(current.name)} as">
                <button type="button" data-element-mode="diagram" class="${mode === "diagram" ? "active" : ""}" aria-pressed="${mode === "diagram"}" title="${escapeHtml(current.name)} and its connected artifacts as a diagram">Diagram</button>
                <button type="button" data-element-mode="table" class="${mode === "table" ? "active" : ""}" aria-pressed="${mode === "table"}" title="${escapeHtml(current.name)} and its connected artifacts as a table">Table</button>
                <button type="button" data-form="${escapeHtml(current.id)}" aria-pressed="false" title="The form of ${escapeHtml(current.name)}">Form</button>
            </span>
            ${flow ? `<button type="button" class="fv-link" data-goto-view="process" data-id="${escapeHtml(current.id)}">Show flow</button>` : ""}`;
        if (mode === "table") {
            host.innerHTML = this.elementTable(model, current, environmentId, toolbar);
            return;
        }
        this.graph.render(host, { model, element: current, environmentId, selectedId, toolbar }, {
            onOpen: id => this.dispatchEvent(new CustomEvent("open", { detail: { id } })),
            onCenter: id => this.dispatchEvent(new CustomEvent("form", { detail: { id } })),
        });
    }

    /**
     * The table of an element: what its diagram shows, row by row (e.g. for a method its responsible and supporting
     * roles, product owners, tools, the process it is part of, its steps, inputs and outputs), with the kind and the
     * description of each connected artifact. A click on an artifact opens it.
     */
    elementTable(model, element, environmentId, toolbar) {
        const graph = graphOf(model, element, environmentId);
        const kindOfColumn = { role: "Role", tool: "Tool", method: "Process or method", product: "Product" };
        const describe = e => {
            const doc = e.doc || (e.inheritedDoc ? e.inheritedDoc.text : "");
            const first = doc.replace(/\s+/g, " ").trim().match(/^.{0,160}?[.!?](\s|$)/);
            return first ? first[0].trim() : doc.length > 160 ? doc.slice(0, 160) + "…" : doc;
        };
        const rows = [];
        for (const g of element.typeIds || []) {
            const general = model.get(g);
            const name = (model.generals[g] && model.generals[g].name) || model.nameOf(g, g.split("::").pop());
            rows.push({ relation: "Specializes", e: general, name, kind: general ? general.kindLabel : "", doc: general ? describe(general) : "" });
        }
        for (const column of graph.columns) for (const section of column.sections) {
            const items = section.items.filter(Boolean);
            items.forEach((e, i) => rows.push({ relation: section.label, first: i === 0, count: items.length, e, name: e.name,
                kind: kindOfColumn[section.kind || column.kind] || e.kindLabel, doc: describe(e), inherited: !!e.library }));
            if (!items.length) rows.push({ relation: section.label, first: true, count: 1, empty: true });
        }
        const body = rows.map(r => `<tr${r.empty ? ' class="el-empty-row"' : ""}>
                <th scope="row">${r.first !== false ? escapeHtml(r.relation) : ""}</th>
                <td>${r.empty ? '<span class="fv-muted">–</span>' : r.e ? `<button type="button" class="fv-link" data-open-element="${escapeHtml(r.e.id)}">${escapeHtml(r.name)}</button>${r.inherited ? ' <span class="fv-muted" title="from a library">◌</span>' : ""}` : escapeHtml(r.name)}</td>
                <td class="fv-muted">${escapeHtml(r.kind || "")}</td>
                <td>${escapeHtml(r.doc || "")}</td></tr>`).join("");
        const own = describe(element);
        return `<div class="dg-toolbar">${toolbar}<span class="dg-status">${escapeHtml(graph.summary)}</span></div>
            <div class="el-table-page">
                <p class="el-table-lead"><span class="fv-muted">${escapeHtml(element.kindLabel)}</span> <strong>${escapeHtml(element.name)}</strong>${own ? ` – ${escapeHtml(own)}` : ""}
                    <span class="fv-muted">· ${escapeHtml(element.document || "")}</span></p>
                <table class="fv-table el-table">
                    <thead><tr><th>Relation</th><th>Element</th><th>Kind</th><th>Description</th></tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }
}
