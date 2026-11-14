// The tabs Roles, Tools, Methodology and Products: a list of the elements of the current MBSE environment (own and
// inherited, the methodology as a tree) and the graph of the selected element with its connected artifacts
// (ElementGraph). Without an environment in the current document (e.g. the library ISO15288Processes), the list
// shows the elements of the document.
//
// Events: "select" { id } (list), "open" { id } (graph node: the graph of that element in its tab),
//         "form" { id } (the form of the element), "command" { command, id }, "collection" { kind, id }, "view" { view }

import { Process, Method, Role, Tool, Artifact, MBSEEnvironment } from "../dtfa/model.js";
import { ElementGraph } from "./ElementGraph.js";

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
    constructor(container, kind) {
        super();
        this.root = container;
        this.kind = kind;
        this.spec = KINDS[kind];
        this.root.classList.add("el-view");
        this.graph = new ElementGraph();
        this.currentId = null;
        this.root.addEventListener("click", e => {
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
                    <span class="ev-modes" role="group" aria-label="Show the ${escapeHtml(this.spec.title.toLowerCase())} as">
                        <button type="button" class="active" aria-pressed="true">Diagram</button>
                        <button type="button" data-table="${escapeHtml(environment.id)}" aria-pressed="false" title="All ${escapeHtml(this.spec.title.toLowerCase())} as a table">Table</button>
                    </span></div>` : ""}
                <ul class="el-items">${list}${missing ? `<li class="selected el-extra"><button type="button" class="el-item" data-item="${escapeHtml(current.id)}">${escapeHtml(current.name)}</button></li>` : ""}</ul>
                ${entries.length ? "" : `<p class="fv-muted el-none">No ${escapeHtml(this.spec.title.toLowerCase())} ${context}.</p>`}
            </aside>
            <div class="el-graph diagram-view"></div>`;
        const host = this.root.querySelector(".el-graph");
        if (!current) {
            host.innerHTML = `<div class="fv-empty"><p>Select a ${escapeHtml(this.spec.singular)} in the list.</p></div>`;
            return;
        }
        const flow = isBehavior(current) && model.subBehaviors(current).length;
        const toolbar = `<strong class="eg-name">${escapeHtml(current.name)}</strong>
            <button type="button" class="fv-link" data-form="${escapeHtml(current.id)}">Open form</button>
            ${flow ? `<button type="button" class="fv-link" data-goto-view="process" data-id="${escapeHtml(current.id)}">Show flow</button>` : ""}`;
        this.graph.render(host, { model, element: current, environmentId, selectedId, toolbar }, {
            onOpen: id => this.dispatchEvent(new CustomEvent("open", { detail: { id } })),
            onCenter: id => this.dispatchEvent(new CustomEvent("form", { detail: { id } })),
        });
    }
}
