// Editor of an MBSE environment (MBSEMethodology::MBSEEnvironment), the anchor point of the flow analyses.
//
// It shows the roles, tools, methodology (processes and methods) and products of the environment, including those
// it inherits from the environments it specializes, its flow analyses (DTFA) and its tool policy.
//
// It shows the environment as cards (lists of the elements) or as a diagram (EnvironmentDiagram), switched with
// Cards | Diagram in the toolbar.
//
// Events: "select" { id, open }, "command" { command, id, args }, "reveal" { id }, "view" { view }

import { MBSEEnvironment, Process, Method } from "../dtfa/model.js";
import { EnvironmentDiagram } from "./EnvironmentDiagram.js";

/** The collection editor (see App.openCollection) of the command that adds an element to it. */
const COLLECTION_OF = { addRole: "roles", addTool: "tools", addMethod: "methods", addArtifact: "products" };

const MODE_KEY = "mbse-methodology-editor-environment-mode";

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export class EnvironmentView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("ev-view");
        this.state = null;
        this.environmentId = null;
        this.diagram = new EnvironmentDiagram();
        this.mode = "cards";
        try { this.mode = localStorage.getItem(MODE_KEY) === "diagram" ? "diagram" : "cards"; } catch (_) { /* storage unavailable */ }
        this.root.addEventListener("click", e => this.onClick(e));
        this.root.addEventListener("change", e => {
            if (e.target.matches(".ev-select")) this.dispatchEvent(new CustomEvent("select", { detail: { id: e.target.value } }));
        });
    }

    /** The environment to show: the selected one, the one of the selected element, or the last one. */
    current(model, selectedId, environmentId = null) {
        // The environment of the active document (see App.currentEnvironmentId).
        if (model.get(environmentId) instanceof MBSEEnvironment) return model.get(environmentId);
        const selected = model.get(selectedId);
        if (selected instanceof MBSEEnvironment) return selected;
        if (selected && selected.environmentId && model.get(selected.environmentId) instanceof MBSEEnvironment) return model.get(selected.environmentId);
        const container = selected && model.analysisOf(selected.id);
        if (container && model.get(container.environmentId)) return model.get(container.environmentId);
        return model.get(this.environmentId) || model.environments[0] || null;
    }

    /** @param {{model, analyses: Map, selectedId: string|null, editable: boolean, message?: string}} state */
    show(state) {
        this.state = state;
        const { model, editable } = state;
        if (!model) {
            this.root.innerHTML = `<div class="fv-empty">${escapeHtml(state.message || "Waiting for the model check…")}</div>`;
            return;
        }
        const environment = this.current(model, state.selectedId, state.environmentId);
        if (!environment) {
            this.root.innerHTML = `<div class="fv-empty"><p>No MBSE environment yet.</p>
                <p>Create one with <strong>File ▸ New MBSE environment</strong>, open a file, or try <strong>Examples</strong>.</p></div>`;
            return;
        }
        this.environmentId = environment.id;
        const id = escapeHtml(environment.id);
        const scope = model.environmentScope(environment.id);
        const generals = environment.generalIds.map(g => model.get(g) ? this.link(g) : escapeHtml(g.split("::").pop())).join(", ");
        const specializations = model.environments.filter(e => e.generalIds.includes(environment.id));
        const checks = environment.analyses;
        const rules = model.rulesOf(environment.id);
        const steps = checks.flatMap(c => c.steps);
        void scope;

        // The general types (e.g. SystemArchitect), where it is inherited from, and further details.
        const meta = (element, detail) => {
            const inherited = element.environmentId !== environment.id && model.get(element.environmentId);
            const from = inherited ? inherited.name : element.library ? element.id.split("::").slice(0, -1).pop().replace(/^'(.*)'$/, "$1") : "";
            const type = element.typeIds.length ? element.typeIds[0].split("::").pop() : "";
            const parts = [type ? `: ${escapeHtml(type)}` : "", from ? `from ${escapeHtml(from)}` : "", detail ? escapeHtml(detail) : ""].filter(Boolean);
            return parts.length ? `<div class="ev-meta">${parts.join(" · ")}</div>` : "";
        };
        const item = (element, detail = "", badge = "", indent = 0) => `<li class="${element.id === state.selectedId ? "selected" : ""}"${indent ? ` style="padding-left:${4 + indent * 16}px"` : ""}>
            <div class="ev-name">${badge}${this.link(element.id)}</div>${meta(element, detail)}</li>`;
        const usedBy = (key, element) => {
            const n = steps.filter(s => s[key] === element.id || (Array.isArray(s[key]) && s[key].includes(element.id))).length;
            return n ? `${n} process step${n === 1 ? "" : "s"}` : "";
        };
        // How the methodology uses a product: the steps (methods with parameters) that produce and need it.
        const tree = model.methodologyTree(environment.id).map(n => n.element);
        const productUse = a => {
            const out = tree.filter(b => model.parameterProductIds(b, "outputFeatures").includes(a.id)).length + steps.filter(s => s.targetArtifactIds.includes(a.id)).length;
            const inp = tree.filter(b => model.parameterProductIds(b, "inputFeatures").includes(a.id)).length + steps.filter(s => s.sourceArtifactIds.includes(a.id)).length;
            return [out && `produced by ${out}`, inp && `needed by ${inp}`].filter(Boolean).join(", ");
        };
        const card = (title, hint, items, command, label) => `<section class="ev-card${title === "Methodology" ? " ev-methodology" : ""}">
            <h3><button type="button" class="ev-card-open" data-collection="${COLLECTION_OF[command]}" data-id="${id}" title="Open the ${escapeHtml(title.toLowerCase())} editor">${escapeHtml(title)}</button> <span class="fv-count">${items.length}</span></h3>
            <p class="fv-muted ev-hint">${escapeHtml(hint)}</p>
            ${items.length ? `<ul class="ev-list">${items.join("")}</ul>` : '<p class="fv-muted">None.</p>'}
            ${editable ? `<div class="fv-buttons"><button type="button" data-command="${command}" data-id="${id}">${escapeHtml(label)}</button></div>` : ""}
        </section>`;

        // Methodology: processes and methods as a tree, owned and inherited, with the roles that perform them as the
        // methodology declares them (also through the types of the roles, e.g. SystemArchitect).
        const methodology = model.methodologyTree(environment.id).map(({ element: b, depth }) => {
            const names = kinds => model.performersOf(b, environment.id, kinds).map(r => r.name);
            const performers = names(["primary", "additional"]);
            const tools = names(["tool"]);
            const detail = [performers.length ? `by ${performers.join(", ")}` : "", tools.length ? `with ${tools.join(", ")}` : ""].filter(Boolean).join(" · ");
            return item(b, detail, `<span class="ev-kind ${b instanceof Process ? "process" : "method"}">${b instanceof Process ? "process" : "method"}</span>`, depth);
        });

        // A document typically declares one environment: its name; a select only if it declares several.
        const siblings = model.environments.filter(e => e.document === environment.document);
        const options = siblings.map(e => `<option value="${escapeHtml(e.id)}"${e === environment ? " selected" : ""}>${escapeHtml(e.name)}</option>`).join("");
        this.root.innerHTML = `<div class="dg-toolbar">
                ${siblings.length > 1 ? `<label class="dg-field">MBSE environment <select class="ev-select">${options}</select></label>`
                    : `<span class="dg-field">MBSE environment <strong>${escapeHtml(environment.name)}</strong></span>`}
                ${generals ? `<span class="fv-muted">specializes ${generals}</span>` : ""}
                <span class="ev-modes" role="group" aria-label="Show the environment as">
                    <button type="button" data-mode="cards" aria-pressed="${this.mode === "cards"}" class="${this.mode === "cards" ? "active" : ""}">Cards</button>
                    <button type="button" data-mode="diagram" aria-pressed="${this.mode === "diagram"}" class="${this.mode === "diagram" ? "active" : ""}">Diagram</button>
                </span>
                <span class="dg-spacer"></span>
                ${editable ? `<button type="button" data-command="addEnvironment" data-id="${id}" title="Add an MBSE environment that specializes this one, e.g. of a team">+ Specialized environment</button>` : ""}
            </div>
            <div class="ev-scroll">
                <header class="ev-head"><h2>${escapeHtml(environment.name)}</h2>
                    <span class="fv-source">${escapeHtml(environment.document)} <button type="button" class="fv-link" data-reveal="${id}">Show in text</button></span></header>
                ${environment.doc ? `<p class="fv-line">${escapeHtml(environment.doc)}</p>` : ""}
                <div class="ev-grid">
                    ${card("Roles", "MBSEEnvironment::roles · the rows of the matrix", model.inScope(model.roles, environment.id).map(r => item(r, usedBy("roleId", r))), "addRole", "+ Role")}
                    ${card("Tools", "MBSEEnvironment::tools · the columns of the matrix", model.inScope(model.tools, environment.id).map(t => item(t, usedBy("toolId", t))), "addTool", "+ Tool")}
                    ${card("Methodology", environment.methodologyId ? `Processes and methods of ${model.nameOf(environment.methodologyId, environment.methodologyId.split("::").pop())}` : "Processes and methods", methodology, "addMethod", "+ Method")}
                    ${card("Products", "MBSEMethodology::Product · the data of the digital thread", model.productsOf(environment.id).map(a => item(a, productUse(a))), "addArtifact", "+ Product")}
                </div>
                <section class="fv-section ev-anchored"><h3>Digital Thread Flow Analyses <span class="fv-muted">MBSEEnvironment::analyses</span></h3>
                    ${checks.length ? `<ul class="fv-list">${checks.map(c => this.checkRow(c)).join("")}</ul>` : '<p class="fv-muted">No flow analysis of this environment yet.</p>'}
                    ${editable ? `<div class="fv-buttons"><button type="button" data-command="addAnalysis" data-id="${id}">+ Flow analysis</button></div>` : ""}
                </section>
                <section class="fv-section ev-anchored"><h3>Tool policy <span class="fv-muted">rated facilitates connections</span></h3>
                    ${rules.length ? `<p class="fv-line">${environment.rules.length} rules of this environment${rules.length > environment.rules.length ? `, ${rules.length - environment.rules.length} inherited` : ""}.
                        <button type="button" class="fv-link" data-open-policy="${id}">Open tool policy</button></p>` : '<p class="fv-muted">No tool policy rule rates the tools and methods of this environment yet.</p>'}
                    ${editable ? `<div class="fv-buttons"><button type="button" data-command="addRule" data-id="${id}">+ Rule</button></div>` : ""}
                </section>
                ${specializations.length ? `<section class="fv-section"><h3>Specialized by</h3><div class="fv-chips">${specializations.map(e => `<button type="button" class="fv-link fv-chip" data-select="${escapeHtml(e.id)}">${escapeHtml(e.name)}</button>`).join("")}</div></section>` : ""}
            </div>`;
        if (this.mode === "diagram") this.renderDiagram(environment);
    }

    /** Renders the diagram in place of the cards. */
    renderDiagram(environment) {
        const scroll = this.root.querySelector(".ev-scroll");
        const host = document.createElement("div");
        host.className = "ed-host diagram-view";
        scroll.replaceWith(host);
        this.diagram.render(host, this.state, environment,
            (id, collection) => this.dispatchEvent(new CustomEvent("select", { detail: { id, open: true, collection } })),
            id => this.dispatchEvent(new CustomEvent("select", { detail: { id } })));
    }

    checkRow(check) {
        const analysis = this.state.analyses ? this.state.analyses.get(check.id) : null;
        const done = analysis ? [1, 2, 3, 4].filter(n => analysis.progress[n].done).length : 0;
        return `<li>${this.link(check.id)} <span class="fv-muted">${check.steps.length} steps · ${check.handovers.length} hand-overs · ${analysis ? analysis.bottlenecks.length : 0} bottlenecks · ${done} of 4 DTFA steps done</span>
            <button type="button" class="fv-link" data-open-matrix="${escapeHtml(check.id)}">Open matrix</button></li>`;
    }

    link(id) {
        const element = this.state.model.get(id);
        return element ? `<button type="button" class="fv-link" data-select="${escapeHtml(id)}">${escapeHtml(element.name)}</button>` : escapeHtml(id.split("::").pop());
    }

    onClick(e) {
        const mode = e.target.closest("[data-mode]");
        if (mode) {
            this.mode = mode.dataset.mode;
            try { localStorage.setItem(MODE_KEY, this.mode); } catch (_) { /* storage unavailable */ }
            this.show(this.state);
            return;
        }
        if (e.target.closest(".ed-host")) return; // the diagram handles its own clicks
        const collection = e.target.closest("[data-collection]");
        if (collection) {
            this.dispatchEvent(new CustomEvent("select", { detail: { id: collection.dataset.id, open: true, collection: collection.dataset.collection } }));
            return;
        }
        const command = e.target.closest("[data-command]");
        if (command) {
            this.dispatchEvent(new CustomEvent("command", { detail: { command: command.dataset.command, id: command.dataset.id, args: {} } }));
            return;
        }
        const policy = e.target.closest("[data-open-policy]");
        if (policy) {
            this.dispatchEvent(new CustomEvent("select", { detail: { id: policy.dataset.openPolicy } }));
            this.dispatchEvent(new CustomEvent("view", { detail: { view: "policy" } }));
            return;
        }
        const matrix = e.target.closest("[data-open-matrix]");
        if (matrix) {
            this.dispatchEvent(new CustomEvent("select", { detail: { id: matrix.dataset.openMatrix } }));
            this.dispatchEvent(new CustomEvent("view", { detail: { view: "matrix" } }));
            return;
        }
        const reveal = e.target.closest("[data-reveal]");
        if (reveal) { this.dispatchEvent(new CustomEvent("reveal", { detail: { id: reveal.dataset.reveal } })); return; }
        const select = e.target.closest("[data-select]");
        // A link opens the editor of the element, e.g. the role editor (see App.openElement).
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select, open: select.classList.contains("fv-link") } }));
    }
}

