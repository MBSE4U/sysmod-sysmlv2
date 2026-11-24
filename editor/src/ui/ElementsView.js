// The tabs Roles, Tools, Methodology and Products: a list of the elements of the current MBSE environment (own and
// inherited, the methodology as a tree) and the graph of the selected element with its connected artifacts
// (ElementGraph). Without an environment in the current document (e.g. the library ISO15288Processes), the list
// shows the elements of the document.
//
// Events: "select" { id } (list), "open" { id } (graph node: the graph of that element in its tab),
//         "form" { id } (the form of the element), "command" { command, id }, "collection" { kind, id }, "view" { view }

import { splitterHandle, makeResizable } from "./splitter.js";
import { Process, Method, Role, Tool, Artifact, MBSEEnvironment } from "../dtfa/model.js";
import { graphOf, connections, kindOf, ElementGraph } from "./ElementGraph.js";
import { formDialog } from "./FormDialog.js";

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
        this.root.addEventListener("input", e => { if (e.target.matches("[data-live-doc]")) this.scheduleDoc(e.target); });
        this.root.addEventListener("focusout", e => { if (e.target.matches("[data-live-doc]")) this.flushDoc(); });
        this.root.addEventListener("click", e => {
            const modeButton = e.target.closest("[data-element-mode]");
            if (modeButton) { ElementsView.mode = modeButton.dataset.elementMode; if (this.state) this.show(this.state); return; }
            const revealText = e.target.closest("[data-reveal-text]");
            if (revealText) { this.dispatchEvent(new CustomEvent("reveal", { detail: { id: revealText.dataset.revealText } })); return; }
            const editRelation = e.target.closest("[data-edit-relation]");
            if (editRelation) { this.editRelation(editRelation.dataset.editRelation); return; }
            const removeRelation = e.target.closest("[data-remove-relation]");
            if (removeRelation) { this.removeFromRelation(removeRelation.dataset.removeRelation, removeRelation.dataset.target); return; }
            const editDoc = e.target.closest("[data-edit-doc]");
            if (editDoc) { this.editDescription(editDoc.dataset.editDoc); return; }
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
        // A description being typed keeps its text and caret while the view is rendered again.
        const field = document.activeElement;
        const live = field && this.root.contains(field) && field.matches("[data-live-doc]")
            ? { id: field.dataset.id, value: field.value, start: field.selectionStart, end: field.selectionEnd } : null;
        this.render(state);
        if (live) {
            const again = this.root.querySelector(`[data-live-doc][data-id="${CSS.escape(live.id)}"]`);
            if (again) {
                again.value = live.value;
                if (this.live && this.live.id === live.id) this.live.field = again;
                again.focus({ preventScroll: true });
                again.setSelectionRange(live.start, live.end);
            }
        }
    }

    /** The description of the element in the table: written 400 ms after the last keystroke, or on leaving the field. */
    scheduleDoc(field) {
        clearTimeout(this.liveTimer);
        this.live = { id: field.dataset.id, field };
        this.liveTimer = setTimeout(() => this.flushDoc(), 400);
    }

    flushDoc() {
        clearTimeout(this.liveTimer);
        const live = this.live;
        this.live = null;
        if (!live) return;
        const text = live.field.value.trim();
        if (text === (live.field.dataset.original || "").trim()) return;
        live.field.dataset.original = live.field.value;
        this.dispatchEvent(new CustomEvent("command", { detail: { command: "setDoc", id: live.id, args: { text } } }));
    }

    render(state) {
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
                <button type="button" data-reveal-text="${escapeHtml(current.id)}" aria-pressed="false" title="The declaration of ${escapeHtml(current.name)} in the text">Text</button>
            </span>
            ${flow ? `<button type="button" class="fv-link" data-goto-view="process" data-id="${escapeHtml(current.id)}">Show flow</button>` : ""}`;
        if (mode === "table") {
            host.innerHTML = this.elementTable(model, current, environmentId, toolbar, state);
            return;
        }
        this.graph.render(host, { model, element: current, environmentId, selectedId, toolbar }, {
            onOpen: id => this.dispatchEvent(new CustomEvent("open", { detail: { id } })),
            onCenter: id => this.dispatchEvent(new CustomEvent("form", { detail: { id } })),
        });
    }

    /**
     * The relations of the table that can be edited, by the label of their section in the graph (graphOf): the feature
     * of the methods that holds them (MBSEMethodology), what can be chosen, and whether the methods are on the other side
     * (e.g. "Responsible for" of a role sets the primaryPerformer of methods).
     */
    static RELATIONS = {
        method: {
            "Responsible": { feature: "primaryPerformer", choose: "roles", single: true },
            "Supports": { feature: "additionalPerformers", choose: "roles" },
            "Tools": { feature: "facilitationTools", choose: "tools" },
            "Inputs": { feature: "inputs", choose: "products" },
            "Outputs": { feature: "outputs", choose: "products" },
        },
        role: {
            "Responsible for": { feature: "primaryPerformer", choose: "methods", reverse: true },
            "Supports": { feature: "additionalPerformers", choose: "methods", reverse: true },
        },
        tool: { "Facilitates": { feature: "facilitationTools", choose: "methods", reverse: true } },
        product: {
            "Produced by": { feature: "outputs", choose: "methods", reverse: true },
            "Needed by": { feature: "inputs", choose: "methods", reverse: true },
        },
    };

    /**
     * True if the relations of the shown element can be changed: an editable model and an MBSE environment that is not a
     * library (unless the libraries are edited). Methods inherited from a library, e.g. the SYSMOD steps, are redefined
     * in the environment.
     */
    editable(state, element) {
        const environment = state.model && state.model.get(state.environmentId);
        return !!(state.editable !== false && !element.external && environment && (!environment.library || state.libraryEditing));
    }

    /** The current value of a feature of a method, as the diagram and the table show it. */
    featureValue(c, method, feature) {
        if (feature === "primaryPerformer") return c.performers(method, ["primary"]);
        if (feature === "additionalPerformers") return c.performers(method, ["additional"]);
        if (feature === "facilitationTools") return c.performers(method, ["tool"]);
        if (feature === "inputs") return c.inputsOf(method).filter(Boolean);
        if (feature === "outputs") return c.outputsOf(method).filter(Boolean);
        return [];
    }

    relationContext(label) {
        const { model, environmentId } = this.state;
        const element = model.get(this.currentId);
        const kind = element ? kindOf(element) : null;
        const relation = kind && ElementsView.RELATIONS[kind] && ElementsView.RELATIONS[kind][label];
        if (!relation) return null;
        const c = connections(model, environmentId);
        const candidates = {
            roles: () => model.inScope(model.roles, environmentId),
            tools: () => model.inScope(model.tools, environmentId),
            // All products: those of the environment and its methodology first, then those of the libraries
            // (e.g. SYSMODProcesses::Products::SystemSpecification), so that new inputs and outputs can be chosen.
            products: () => {
                const used = [...model.inScope(model.artifacts, environmentId), ...c.behaviors.flatMap(b => [...c.inputsOf(b), ...c.outputsOf(b)])].filter(Boolean);
                const byName = (a, b) => a.name.localeCompare(b.name);
                const first = [...new Set(used)].sort(byName);
                return [...first, ...model.artifacts.filter(a => !first.includes(a)).sort(byName)];
            },
            methods: () => c.behaviors,
        }[relation.choose]();
        const current = relation.reverse
            ? c.behaviors.filter(m => this.featureValue(c, m, relation.feature).includes(element))
            : this.featureValue(c, element, relation.feature);
        return { model, environmentId, element, relation, c, candidates, current };
    }

    /** The changes of the methods for a new value of a relation: [{ id: method, feature, ids }]. */
    relationChanges(ctx, chosen) {
        const { element, relation, c, current } = ctx;
        if (!relation.reverse) return [{ id: element.id, feature: relation.feature, ids: chosen }];
        const changes = [];
        for (const method of new Set([...current, ...chosen.map(id => ctx.model.get(id)).filter(Boolean)])) {
            const was = current.includes(method), now = chosen.includes(method.id);
            if (was === now) continue;
            const value = this.featureValue(c, method, relation.feature).map(e => e.id).filter(id => id !== element.id);
            changes.push({ id: method.id, feature: relation.feature, ids: now ? (relation.feature === "primaryPerformer" ? [element.id] : [...value, element.id]) : value });
        }
        return changes;
    }

    emitChanges(ctx, changes, label) {
        if (!changes.length) return;
        this.dispatchEvent(new CustomEvent("command", { detail: { command: "setBehaviorFeatures", id: ctx.element.id,
            args: { environmentId: ctx.environmentId, changes, label } } }));
    }

    /** Edits a relation of the table, e.g. the supporting roles of a method or the methods a role supports. */
    async editRelation(label) {
        const ctx = this.relationContext(label);
        if (!ctx) return;
        const { element, relation, candidates, current } = ctx;
        // The current entries first, then the others; library elements are marked.
        const ordered = [...new Set([...current, ...candidates])].filter(Boolean);
        const options = ordered.map(e => ({ value: e.id, label: e.library && !current.includes(e) ? `${e.name} (library)` : e.name }));
        const products = relation.choose === "products";
        const fields = [relation.single
            ? { name: "chosen", label, type: "radio", value: current[0] ? current[0].id : "", options: [{ value: "", label: "(none)" }, ...options] }
            : { name: "chosen", label, type: "checkboxes", value: current.map(e => e.id), options }];
        if (products) fields.push({ name: "newProduct", label: "New product (optional)", value: "",
            hint: `Adds a product to the MBSE environment ${ctx.model.nameOf(ctx.environmentId, "")} and to the ${label.toLowerCase()} of ${element.name}.` });
        const values = await formDialog({ title: `${label} – ${element.name}`, submitLabel: "Save", fields });
        if (!values) return;
        const chosen = relation.single ? (values.chosen ? [values.chosen] : []) : values.chosen;
        const newProduct = products && values.newProduct ? values.newProduct : null;
        const changes = this.relationChanges(ctx, chosen);
        if (newProduct && !changes.length) changes.push({ id: element.id, feature: relation.feature, ids: chosen });
        if (newProduct) changes.find(ch => ch.id === element.id).newProduct = newProduct;
        this.emitChanges(ctx, changes, `change ${label.toLowerCase()} of ${element.name}`);
    }

    /** Removes one entry of a relation of the table. */
    removeFromRelation(label, targetId) {
        const ctx = this.relationContext(label);
        if (!ctx) return;
        const chosen = ctx.current.map(e => e.id).filter(id => id !== targetId);
        this.emitChanges(ctx, this.relationChanges(ctx, chosen), `remove ${ctx.model.nameOf(targetId, targetId)} from ${label.toLowerCase()} of ${ctx.element.name}`);
    }

    /** Edits the description (doc comment) of an element of the table. */
    async editDescription(id) {
        const element = this.state.model.get(id);
        if (!element) return;
        const values = await formDialog({
            title: `Description of ${element.name}`, submitLabel: "Save",
            fields: [{ name: "text", label: "Description", type: "textarea", rows: 6, value: element.doc || "",
                hint: element.inheritedDoc && !element.doc ? `Inherited: ${element.inheritedDoc.text}` : "" }],
        });
        if (values) this.dispatchEvent(new CustomEvent("command", { detail: { command: "setDoc", id, args: { text: values.text } } }));
    }

    /**
     * The table of an element: what its diagram shows, row by row (e.g. for a method its responsible and supporting
     * roles, product owners, tools, the process it is part of, its steps, inputs and outputs), with the kind and the
     * description of each connected artifact. A click on an artifact opens it. Editable: the relations that methods hold
     * (✎ chooses the entries, × removes one) and the descriptions (✎).
     */
    elementTable(model, element, environmentId, toolbar, state = this.state) {
        const graph = graphOf(model, element, environmentId);
        const kindOfColumn = { role: "Role", tool: "Tool", method: "Process or method", product: "Product" };
        const relations = ElementsView.RELATIONS[kindOf(element)] || {};
        const describe = e => (e.doc || (e.inheritedDoc ? e.inheritedDoc.text : "")).replace(/\s+/g, " ").trim();
        const canEdit = this.editable(state, element);
        const docEditable = state.editable !== false && !element.external && (!element.library || state.libraryEditing);
        const namespace = id => { const parts = String(id).split("::"); return parts.length > 1 ? parts.slice(0, -1).join("::") + "::" : ""; };
        const rows = [];
        for (const g of element.typeIds || []) {
            const general = model.get(g);
            const name = (model.generals[g] && model.generals[g].name) || model.nameOf(g, g.split("::").pop());
            rows.push({ relation: "Specializes", e: general, name, namespace: namespace(g), kind: general ? general.kindLabel : (model.generals[g] && model.generals[g].kind) ? "Definition" : "" });
        }
        for (const column of graph.columns) for (const section of column.sections) {
            const items = section.items.filter(Boolean);
            const editableRelation = canEdit && relations[section.label];
            items.forEach((e, i) => rows.push({ relation: section.label, first: i === 0, e, name: e.name, editableRelation,
                kind: kindOfColumn[section.kind || column.kind] || e.kindLabel, inherited: !!e.library }));
            if (!items.length) rows.push({ relation: section.label, first: true, empty: true, editableRelation });
        }
        // Equal names, e.g. two products named Project in different packages: with their namespace.
        const counts = new Map();
        rows.forEach(r => { if (r.e && !r.namespace) counts.set(r.name, (counts.get(r.name) || 0) + 1); });
        rows.forEach(r => { if (r.e && !r.namespace && counts.get(r.name) > 1) r.namespace = namespace(r.e.id); });
        const relationCell = r => r.first === false ? "" : `${escapeHtml(r.relation)}${r.editableRelation
            ? ` <button type="button" class="el-edit" data-edit-relation="${escapeHtml(r.relation)}" title="Choose the ${escapeHtml(r.relation.toLowerCase())} of ${escapeHtml(element.name)}" aria-label="Edit ${escapeHtml(r.relation)}">✎</button>` : ""}`;
        const elementCell = r => {
            if (r.empty) return '<span class="fv-muted">–</span>';
            const ns = r.namespace ? `<span class="el-namespace">${escapeHtml(r.namespace)}</span>` : "";
            if (!r.e) return `${ns}${escapeHtml(r.name)}`;
            const tip = describe(r.e);
            return `${ns}<button type="button" class="fv-link" data-open-element="${escapeHtml(r.e.id)}"${tip ? ` title="${escapeHtml(tip)}"` : ""}>${escapeHtml(r.name)}</button>${r.inherited ? ' <span class="fv-muted" title="from a library">◌</span>' : ""}${r.editableRelation
                ? ` <button type="button" class="el-remove" data-remove-relation="${escapeHtml(r.relation)}" data-target="${escapeHtml(r.e.id)}" title="Remove ${escapeHtml(r.name)} from ${escapeHtml(r.relation.toLowerCase())}" aria-label="Remove ${escapeHtml(r.name)}">×</button>` : ""}`;
        };
        const body = rows.map(r => `<tr${r.empty ? ' class="el-empty-row"' : ""}>
                <th scope="row">${relationCell(r)}</th>
                <td>${elementCell(r)}</td>
                <td class="fv-muted">${escapeHtml(r.kind || "")}</td></tr>`).join("");
        // The description is a property of the element: edited in place, written as you type.
        const inherited = element.inheritedDoc && !element.doc ? element.inheritedDoc.text : "";
        const description = docEditable
            ? `<textarea class="fv-doc el-doc" data-live-doc data-id="${escapeHtml(element.id)}" data-original="${escapeHtml(element.doc || "")}" rows="${Math.min(8, Math.max(2, (element.doc || inherited).split("\n").length + 1))}"
                placeholder="${escapeHtml(inherited ? `Inherited: ${inherited}` : `Description of ${element.name}`)}" title="Changes the file as you type">${escapeHtml(element.doc || "")}</textarea>`
            : `<span>${escapeHtml(describe(element)) || '<span class="fv-muted">–</span>'}</span>`;
        return `<div class="dg-toolbar">${toolbar}<span class="dg-status">${escapeHtml(graph.summary)}</span></div>
            <div class="el-table-page">
                <table class="fv-table el-table el-properties">
                    <tbody>
                        <tr><th scope="row">${escapeHtml(element.kindLabel)}</th><td><span class="el-namespace">${escapeHtml(namespace(element.id))}</span><strong>${escapeHtml(element.name)}</strong> <span class="fv-muted">· ${escapeHtml(element.document || "")}</span></td></tr>
                        <tr><th scope="row">Description</th><td>${description}</td></tr>
                    </tbody>
                </table>
                ${!canEdit && Object.keys(relations).length ? `<p class="fv-line fv-muted">The MBSE environment is a library: switch on "Edit the libraries" to change it.</p>` : ""}
                <table class="fv-table el-table">
                    <thead><tr><th>Relation</th><th>Element</th><th>Kind</th></tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }
}
