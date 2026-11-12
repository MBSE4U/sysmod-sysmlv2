// Editor of the tool policy of an MBSE environment: methods (rows) × tools (columns).
//
// The tool policy of an environment is the set of its tool policy rules (DTFA::ToolPolicyRule: a facilitates connection
// of a tool and a method with a status) and of the rules of the environments it specializes; the rule of the most
// specific environment wins. A cell is the status of the tool/method combination: recommended, allowed or forbidden,
// or empty. Clicking a cell cycles its status (empty → recommended → allowed → forbidden → empty) with a rule of the
// selected environment. A dot in a cell marks combinations that process steps of the flow analyses use: a used,
// forbidden combination is a finding of the analysis.
//
// Events: "select" { id }, "command" { command, id, args }

import { MBSEEnvironment, POLICY_STATUS } from "../dtfa/model.js";

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const CYCLE = ["", "recommended", "allowed", "forbidden"];

export class PolicyView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("pv-view");
        this.state = null;
        this.environmentId = null;
        this.root.addEventListener("click", e => this.onClick(e));
        this.root.addEventListener("change", e => {
            if (e.target.matches(".pv-policy")) { this.environmentId = e.target.value; this.show(this.state); }
        });
    }

    /** @param {{model, analyses: Map, selectedId: string|null, editable: boolean, message?: string}} state */
    show(state) {
        this.state = state;
        const { model, editable } = state;
        if (!model) {
            this.root.innerHTML = `<div class="fv-empty">${escapeHtml(state.message || "Waiting for the model check…")}</div>`;
            return;
        }
        // The environment of the selection: an environment, an element of one, or the environment of a rule or an analysis.
        const selected = model.get(state.selectedId);
        const selectedEnvironment = selected && (selected instanceof MBSEEnvironment ? selected
            : model.get(selected.environmentId) || (model.analysisOf(selected.id) && model.get(model.analysisOf(selected.id).environmentId)));
        if (selectedEnvironment && model.environments.includes(selectedEnvironment)) this.environmentId = selectedEnvironment.id;
        if (!model.environments.some(e => e.id === this.environmentId)) {
            const withRules = model.environments.find(e => e.rules.length);
            this.environmentId = (withRules || model.environments[0] || {}).id || null;
        }
        const environment = model.get(this.environmentId);
        if (!environment) {
            this.root.innerHTML = `<div class="fv-empty"><p>No MBSE environment yet.</p>
                <p>Create one with <strong>File ▸ New MBSE environment</strong>; its tool policy rates tool/method combinations as recommended, allowed or forbidden.</p></div>`;
            return;
        }
        const { tools, methods } = model.policyAxes(environment.id);
        // Usage: the process steps of the flow analyses of this environment and of the environments that specialize it.
        const usage = new Map();
        for (const analysis of model.analyses) {
            if (!analysis.environmentId || !model.environmentScope(analysis.environmentId).includes(environment.id)) continue;
            for (const step of analysis.steps) {
                if (!step.toolId) continue;
                for (const methodId of [step.id, ...step.method.redefinedIds]) {
                    const key = `${step.toolId}|${methodId}`;
                    if (!usage.has(key)) usage.set(key, []);
                    usage.get(key).push(step);
                }
            }
        }
        const analysis = state.analyses ? state.analyses.get(environment.id) : null;
        const findings = analysis ? analysis.findings : [];

        const header = tools.map(t => `<th scope="col"><button type="button" class="fv-link" data-select="${escapeHtml(t.id)}">${escapeHtml(t.name)}</button></th>`).join("");
        const body = methods.map(m => `<tr><th scope="row"><button type="button" class="fv-link" data-select="${escapeHtml(m.id)}">${escapeHtml(m.name)}</button></th>${tools.map(t => {
            const found = model.policyStatus(environment.id, t.id, m.id);
            const status = found ? found.status : "";
            const inherited = found && found.rule.environmentId !== environment.id;
            const used = usage.get(`${t.id}|${m.id}`) || [];
            const label = `${m.name} with ${t.name}: ${status ? POLICY_STATUS[status].label : "no rule"}${inherited ? ` (rule ${found.rule.name} of ${model.nameOf(found.rule.environmentId)})` : found ? ` (rule ${found.rule.name})` : ""}${used.length ? `; used by ${[...new Set(used.map(s => s.name))].join(", ")}` : ""}`;
            return `<td class="pv-cell ${status ? `status-${status}` : "empty"}${used.length ? " used" : ""}${inherited ? " inherited" : ""}${found && found.rule.id === state.selectedId ? " selected" : ""}">
                <button type="button" data-cell data-tool="${escapeHtml(t.id)}" data-method="${escapeHtml(m.id)}" data-status="${status}" ${editable ? "" : "disabled"}
                    title="${escapeHtml(label + (editable ? `. Click to change the status in ${environment.name}.` : ""))}" aria-label="${escapeHtml(label)}">
                    ${status ? POLICY_STATUS[status].label : ""}${used.length ? `<span class="pv-used" aria-hidden="true">●${used.length > 1 ? used.length : ""}</span>` : ""}
                </button></td>`;
        }).join("")}</tr>`).join("");

        const options = model.environments.map(e => `<option value="${escapeHtml(e.id)}"${e.id === this.environmentId ? " selected" : ""}>${escapeHtml(e.name)}${e.rules.length ? ` (${e.rules.length} rules)` : ""}</option>`).join("");
        this.root.innerHTML = `<div class="dg-toolbar">
                <label class="dg-field">MBSE environment <select class="pv-policy">${options}</select></label>
                <button type="button" class="fv-link" data-select="${escapeHtml(environment.id)}">Open environment</button>
                <span class="dg-spacer"></span>
                ${editable ? `<button type="button" data-command="addTool" data-id="${escapeHtml(environment.id)}">+ Tool</button>
                    <button type="button" data-command="addMethod" data-id="${escapeHtml(environment.id)}">+ Method</button>` : ""}
            </div>
            <div class="pv-scroll">
                <h2 class="pv-title">Tool policy <span class="fv-muted">${escapeHtml(environment.name)}</span></h2>
                <p class="fv-line fv-muted">Rules are tool policy rules (rated facilitates connections) of ${escapeHtml(environment.name)}${environment.generalIds.length ? " and of the environments it specializes; inherited rules are shaded, and a rule of this environment overrides them" : ""}.</p>
                ${tools.length && methods.length ? `<div class="fv-matrix-wrap"><table class="fv-matrix pv-matrix">
                    <caption>Methods (rows) × tools (columns)</caption>
                    <thead><tr><th scope="col">Method \\ Tool</th>${header}</tr></thead><tbody>${body}</tbody></table></div>`
                    : `<p class="fv-muted">No tools and methods yet. Add them with + Tool and + Method.</p>`}
                <p class="fv-note pv-legend"><span class="pv-chip status-recommended">Recommended</span> proven combination ·
                    <span class="pv-chip status-allowed">Allowed</span> alternative ·
                    <span class="pv-chip status-forbidden">Forbidden</span> not practicable ·
                    <span class="pv-used">●</span> used by process steps of the flow analyses</p>
                ${findings.length ? `<ul class="fv-findings">${findings.map(f => `<li class="${f.severity}"><button type="button" class="fv-link" data-select="${escapeHtml(f.id)}">${escapeHtml(f.message)}</button></li>`).join("")}</ul>` : ""}
            </div>`;
    }

    onClick(e) {
        const cell = e.target.closest("[data-cell]");
        if (cell && this.state.editable) {
            const next = CYCLE[(CYCLE.indexOf(cell.dataset.status || "") + 1) % CYCLE.length];
            this.dispatchEvent(new CustomEvent("command", { detail: { command: "setPolicyCell", id: this.environmentId, args: { toolId: cell.dataset.tool, methodId: cell.dataset.method, status: next } } }));
            return;
        }
        const command = e.target.closest("[data-command]");
        if (command) {
            this.dispatchEvent(new CustomEvent("command", { detail: { command: command.dataset.command, id: command.dataset.id, args: {} } }));
            return;
        }
        const select = e.target.closest("[data-select]");
        // A link opens the editor of the element, e.g. the role editor (see App.openElement).
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select, open: select.classList.contains("fv-link") } }));
    }
}
