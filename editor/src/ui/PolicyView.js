// Editor of the EEE Company Tool Policy Matrix: methods (rows) × tools (columns).
//
// A cell is the status of the tool/method combination: recommended, allowed or forbidden, or empty if the policy
// has no rule for it. Clicking a cell cycles its status (empty → recommended → allowed → forbidden → empty).
// A dot in a cell marks combinations that process steps of the EEE checks use: a used, forbidden combination is a
// finding of the EEE check.
//
// Events: "select" { id }, "command" { command, id, args }

import { POLICY_STATUS } from "../eee/model.js";

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
        this.policyId = null;
        this.showAll = true;
        this.root.addEventListener("click", e => this.onClick(e));
        this.root.addEventListener("change", e => {
            if (e.target.matches(".pv-policy")) { this.policyId = e.target.value; this.show(this.state); }
            if (e.target.matches(".pv-all")) { this.showAll = e.target.checked; this.show(this.state); }
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
        const selectedPolicy = model.policyOf(state.selectedId);
        if (selectedPolicy) this.policyId = selectedPolicy.id;
        if (!model.policies.some(p => p.id === this.policyId)) this.policyId = model.policies.length ? model.policies[0].id : null;
        const policy = model.get(this.policyId);
        if (!policy) {
            this.root.innerHTML = `<div class="fv-empty"><p>No tool policy yet.</p>
                <p>Insert one with <strong>Insert ▸ Tool policy</strong>; its rules rate tool/method combinations as recommended, allowed or forbidden.</p></div>`;
            return;
        }
        const axes = model.policyAxes(policy);
        // "All": the tools and methods of the package of the policy, and those that its rules use.
        const rootPackage = policy.id.split("::")[0];
        const inPackage = e => e.id.split("::")[0] === rootPackage;
        const tools = this.showAll ? model.tools.filter(t => inPackage(t) || axes.tools.includes(t)) : axes.tools;
        const methods = this.showAll ? model.methods.filter(m => inPackage(m) || axes.methods.includes(m)) : axes.methods;
        const rule = (toolId, methodId) => policy.rules.find(r => r.toolId === toolId && r.methodId === methodId) || null;
        const usage = new Map();
        for (const check of model.checks) {
            for (const step of check.steps) {
                if (!step.toolId || !step.methodId) continue;
                const key = `${step.toolId}|${step.methodId}`;
                if (!usage.has(key)) usage.set(key, []);
                usage.get(key).push(step);
            }
        }
        const analysis = state.analyses ? state.analyses.get(policy.id) : null;
        const findings = analysis ? analysis.findings : [];

        const header = tools.map(t => `<th scope="col"><button type="button" class="fv-link" data-select="${escapeHtml(t.id)}">${escapeHtml(t.name)}</button></th>`).join("");
        const body = methods.map(m => `<tr><th scope="row"><button type="button" class="fv-link" data-select="${escapeHtml(m.id)}">${escapeHtml(m.name)}</button></th>${tools.map(t => {
            const r = rule(t.id, m.id);
            const status = r ? r.status : "";
            const used = usage.get(`${t.id}|${m.id}`) || [];
            const label = `${m.name} with ${t.name}: ${status ? POLICY_STATUS[status].label : "no rule"}${used.length ? `; used by ${used.map(s => s.name).join(", ")}` : ""}`;
            return `<td class="pv-cell ${status ? `status-${status}` : "empty"}${used.length ? " used" : ""}${r && r.id === state.selectedId ? " selected" : ""}">
                <button type="button" data-cell data-tool="${escapeHtml(t.id)}" data-method="${escapeHtml(m.id)}" ${editable ? "" : "disabled"}
                    title="${escapeHtml(label + (editable ? ". Click to change the status." : ""))}" aria-label="${escapeHtml(label)}">
                    ${status ? POLICY_STATUS[status].label : ""}${used.length ? `<span class="pv-used" aria-hidden="true">●${used.length > 1 ? used.length : ""}</span>` : ""}
                </button></td>`;
        }).join("")}</tr>`).join("");

        const options = model.policies.map(p => `<option value="${escapeHtml(p.id)}"${p.id === this.policyId ? " selected" : ""}>${escapeHtml(p.name)}</option>`).join("");
        this.root.innerHTML = `<div class="dg-toolbar">
                <label class="dg-field">Tool policy <select class="pv-policy">${options}</select></label>
                <button type="button" class="fv-link" data-select="${escapeHtml(policy.id)}">Open in form</button>
                <span class="dg-spacer"></span>
                <label class="dg-check" title="All tools and methods of the package of the policy, not only those of its rules"><input type="checkbox" class="pv-all" ${this.showAll ? "checked" : ""}> All tools and methods</label>
                ${editable ? `<button type="button" data-command="addTool" data-id="${escapeHtml(policy.id)}">+ Tool</button>
                    <button type="button" data-command="addMethod" data-id="${escapeHtml(policy.id)}">+ Method</button>` : ""}
            </div>
            <div class="pv-scroll">
                <h2 class="pv-title">EEE Company Tool Policy Matrix <span class="fv-muted">${escapeHtml(policy.name)}</span></h2>
                ${policy.doc ? `<p class="fv-line">${escapeHtml(policy.doc)}</p>` : ""}
                ${tools.length && methods.length ? `<div class="fv-matrix-wrap"><table class="fv-matrix pv-matrix">
                    <caption>Methods (rows) × tools (columns)</caption>
                    <thead><tr><th scope="col">Method \\ Tool</th>${header}</tr></thead><tbody>${body}</tbody></table></div>`
                    : `<p class="fv-muted">No tools and methods yet. Add them with + Tool and + Method.</p>`}
                <p class="fv-note pv-legend"><span class="pv-chip status-recommended">Recommended</span> proven combination ·
                    <span class="pv-chip status-allowed">Allowed</span> alternative ·
                    <span class="pv-chip status-forbidden">Forbidden</span> not practicable ·
                    <span class="pv-used">●</span> used by process steps of the EEE checks</p>
                ${findings.length ? `<ul class="fv-findings">${findings.map(f => `<li class="${f.severity}"><button type="button" class="fv-link" data-select="${escapeHtml(f.id)}">${escapeHtml(f.message)}</button></li>`).join("")}</ul>` : ""}
            </div>`;
    }

    onClick(e) {
        const cell = e.target.closest("[data-cell]");
        if (cell && this.state.editable) {
            const policy = this.state.model.get(this.policyId);
            const rule = policy.rules.find(r => r.toolId === cell.dataset.tool && r.methodId === cell.dataset.method);
            const next = CYCLE[(CYCLE.indexOf(rule ? rule.status : "") + 1) % CYCLE.length];
            this.dispatchEvent(new CustomEvent("command", { detail: { command: "setPolicyCell", id: policy.id, args: { toolId: cell.dataset.tool, methodId: cell.dataset.method, status: next } } }));
            return;
        }
        const command = e.target.closest("[data-command]");
        if (command) {
            this.dispatchEvent(new CustomEvent("command", { detail: { command: command.dataset.command, id: command.dataset.id, args: {} } }));
            return;
        }
        const select = e.target.closest("[data-select]");
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select } }));
    }
}
