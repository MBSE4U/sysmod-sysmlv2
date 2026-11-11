// Editor of an MBSE environment (MBSEMethodology::MBSEEnvironment), the anchor point of the EEE checks.
//
// It shows the roles, tools, methodology (processes and methods) and products of the environment, including those
// it inherits from the environments it specializes, and the EEE checks and tool policies anchored at it.
//
// Events: "select" { id }, "command" { command, id, args }

import { MBSEEnvironment, Process, Method } from "../eee/model.js";

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
        this.root.addEventListener("click", e => this.onClick(e));
        this.root.addEventListener("change", e => {
            if (e.target.matches(".ev-select")) this.dispatchEvent(new CustomEvent("select", { detail: { id: e.target.value } }));
        });
    }

    /** The environment to show: the selected one, the one of the selected element, or the last one. */
    current(model, selectedId) {
        const selected = model.get(selectedId);
        if (selected instanceof MBSEEnvironment) return selected;
        if (selected && selected.environmentId && model.get(selected.environmentId) instanceof MBSEEnvironment) return model.get(selected.environmentId);
        const container = selected && (model.checkOf(selected.id) || model.policyOf(selected.id));
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
        const environment = this.current(model, state.selectedId);
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
        const checks = model.checks.filter(c => c.environmentId && model.environmentScope(c.environmentId).includes(environment.id));
        const policies = model.policies.filter(p => p.environmentId && scope.includes(p.environmentId));
        const steps = model.checks.flatMap(c => c.steps);

        const meta = (element, detail) => {
            const inherited = element.environmentId !== environment.id && model.get(element.environmentId);
            const parts = [inherited ? `from ${escapeHtml(inherited.name)}` : "", detail ? escapeHtml(detail) : ""].filter(Boolean);
            return parts.length ? `<div class="ev-meta">${parts.join(" · ")}</div>` : "";
        };
        const item = (element, detail = "", badge = "", indent = 0) => `<li class="${element.id === state.selectedId ? "selected" : ""}"${indent ? ` style="padding-left:${4 + indent * 16}px"` : ""}>
            <div class="ev-name">${badge}${this.link(element.id)}</div>${meta(element, detail)}</li>`;
        const usedBy = (key, element) => {
            const n = steps.filter(s => s[key] === element.id || (Array.isArray(s[key]) && s[key].includes(element.id))).length;
            return n ? `${n} process step${n === 1 ? "" : "s"}` : "";
        };
        const card = (title, hint, items, command, label) => `<section class="ev-card${title === "Methodology" ? " ev-methodology" : ""}">
            <h3>${escapeHtml(title)} <span class="fv-count">${items.length}</span></h3>
            <p class="fv-muted ev-hint">${escapeHtml(hint)}</p>
            ${items.length ? `<ul class="ev-list">${items.join("")}</ul>` : '<p class="fv-muted">None.</p>'}
            ${editable ? `<div class="fv-buttons"><button type="button" data-command="${command}" data-id="${id}">${escapeHtml(label)}</button></div>` : ""}
        </section>`;

        // Methodology: processes and methods as a tree, by their ownership.
        const behaviors = [...model.elements.values()].filter(b => (b instanceof Process || b instanceof Method) && scope.includes(b.environmentId));
        const behaviorIds = new Set(behaviors.map(b => b.id));
        const depth = b => { let d = 0; for (let o = model.get(b.ownerId); o; o = model.get(o.ownerId)) if (behaviorIds.has(o.id)) d++; return d; };
        const methodology = behaviors.map(b => item(b, b instanceof Method ? usedBy("methodId", b) : "",
            `<span class="ev-kind ${b instanceof Process ? "process" : "method"}">${b instanceof Process ? "process" : "method"}</span>`, depth(b)));

        const options = model.environments.map(e => `<option value="${escapeHtml(e.id)}"${e === environment ? " selected" : ""}>${escapeHtml(e.name)}</option>`).join("");
        this.root.innerHTML = `<div class="dg-toolbar">
                <label class="dg-field">MBSE environment <select class="ev-select">${options}</select></label>
                ${generals ? `<span class="fv-muted">specializes ${generals}</span>` : ""}
                <span class="dg-spacer"></span>
                ${editable ? `<button type="button" data-command="addEnvironment" data-id="${id}" title="Add an MBSE environment that specializes this one, e.g. of a team">+ Specialized environment</button>` : ""}
            </div>
            <div class="ev-scroll">
                <header class="ev-head"><h2>${escapeHtml(environment.name)}</h2>
                    <span class="fv-source">${escapeHtml(environment.document)} <button type="button" class="fv-link" data-reveal="${id}">Show in text</button></span></header>
                ${environment.doc ? `<p class="fv-line">${escapeHtml(environment.doc)}</p>` : ""}
                <div class="ev-grid">
                    ${card("Roles", "MBSEEnvironment::roles · the rows of the EEE matrix", model.inScope(model.roles, environment.id).map(r => item(r, usedBy("roleId", r))), "addRole", "+ Role")}
                    ${card("Tools", "MBSEEnvironment::tools · the columns of the EEE matrix", model.inScope(model.tools, environment.id).map(t => item(t, usedBy("toolId", t))), "addTool", "+ Tool")}
                    ${card("Methodology", environment.methodologyId ? `Processes and methods of ${model.nameOf(environment.methodologyId, environment.methodologyId.split("::").pop())}` : "Processes and methods", methodology, "addMethod", "+ Method")}
                    ${card("Products", "MBSEMethodology::Product · the artifacts of the process steps", model.inScope(model.artifacts, environment.id).map(a => item(a)), "addArtifact", "+ Product")}
                </div>
                <section class="fv-section ev-anchored"><h3>EEE checks of this environment</h3>
                    ${checks.length ? `<ul class="fv-list">${checks.map(c => this.checkRow(c)).join("")}</ul>` : '<p class="fv-muted">No EEE check analyzes this environment yet.</p>'}
                    ${editable ? `<div class="fv-buttons"><button type="button" data-command="addCheck" data-id="${id}">+ EEE check</button></div>` : ""}
                </section>
                <section class="fv-section ev-anchored"><h3>Tool policies</h3>
                    ${policies.length ? `<ul class="fv-list">${policies.map(p => `<li>${this.link(p.id)} <span class="fv-muted">${p.rules.length} rules · for ${escapeHtml(model.nameOf(p.environmentId))}</span></li>`).join("")}</ul>` : '<p class="fv-muted">No tool policy rates the tools and methods of this environment yet.</p>'}
                    ${editable ? `<div class="fv-buttons"><button type="button" data-command="addPolicy" data-id="${id}">+ Tool policy</button></div>` : ""}
                </section>
                ${specializations.length ? `<section class="fv-section"><h3>Specialized by</h3><div class="fv-chips">${specializations.map(e => `<button type="button" class="fv-link fv-chip" data-select="${escapeHtml(e.id)}">${escapeHtml(e.name)}</button>`).join("")}</div></section>` : ""}
            </div>`;
    }

    checkRow(check) {
        const analysis = this.state.analyses ? this.state.analyses.get(check.id) : null;
        const done = analysis ? [1, 2, 3, 4].filter(n => analysis.progress[n].done).length : 0;
        return `<li>${this.link(check.id)} <span class="fv-muted">${check.steps.length} steps · ${analysis ? analysis.bottlenecks.length : 0} bottlenecks · ${done} of 4 EEE steps done</span>
            <button type="button" class="fv-link" data-open-matrix="${escapeHtml(check.id)}">Open matrix</button></li>`;
    }

    link(id) {
        const element = this.state.model.get(id);
        return element ? `<button type="button" class="fv-link" data-select="${escapeHtml(id)}">${escapeHtml(element.name)}</button>` : escapeHtml(id.split("::").pop());
    }

    onClick(e) {
        const command = e.target.closest("[data-command]");
        if (command) {
            this.dispatchEvent(new CustomEvent("command", { detail: { command: command.dataset.command, id: command.dataset.id, args: {} } }));
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
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select } }));
    }
}

