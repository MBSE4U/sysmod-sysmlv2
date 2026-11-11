// Outline of the model: the MBSE environments with their roles, tools, methods and products, the EEE checks with their
// process steps and transitions, and the tool policies with their rules.
//
// Events:
//   "select"  detail { id }                     the user picked an element
//   "command" detail { command, id }            the user asked for an editing command:
//             addRole, addArtifact, addStep, addTransition (check), addTool, addMethod, addRule (policy)

import { EVALUATIONS, POLICY_STATUS } from "../eee/model.js";

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export class EeeModelView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("fm-view", "eee-outline");
        this.model = null;
        this.collapsed = new Set();
        this.editable = true;
        this.root.addEventListener("click", e => this.onClick(e));
    }

    /** @param {import("../eee/model.js").EeeModel|null} model */
    show(model, { editable = true, message = "", selectedId = null, analyses = null } = {}) {
        this.model = model;
        this.editable = editable;
        this.selectedId = selectedId;
        this.analyses = analyses;
        if (!model) {
            this.root.innerHTML = `<p class="fm-empty">${escapeHtml(message || "No model checked yet.")}</p>`;
            return;
        }
        if (!model.checks.length && !model.policies.length && !model.environments.length) {
            this.root.innerHTML = `<p class="fm-empty">No MBSE environment found. Create one with
                <strong>File ▸ New MBSE environment</strong> or insert one with <strong>Insert ▸ MBSE environment</strong>.</p>`;
            return;
        }
        this.root.innerHTML = model.notes.map(n => `<p class="fm-note">${escapeHtml(n)}</p>`).join("")
            + `<ul class="fm-tree" role="tree">${model.environments.map(e => this.environmentHtml(e)).join("")}
                ${model.checks.map(c => this.checkHtml(c)).join("")}
                ${model.policies.map(p => this.policyHtml(p)).join("")}</ul>`;
    }

    environmentHtml(environment) {
        const { model } = this;
        const own = list => list.filter(e => e.environmentId === environment.id);
        const children = [
            this.group(environment.id + "#roles", "Roles", own(model.roles).map(r => this.leaf(r, "role", "role")), [["addRole", "+"]], environment),
            this.group(environment.id + "#tools", "Tools", own(model.tools).map(t => this.leaf(t, "tool", "tool")), [["addTool", "+"]], environment),
            this.group(environment.id + "#methods", "Methodology", [...model.elements.values()].filter(e => (model.processes.includes(e) || model.methods.includes(e)) && e.environmentId === environment.id)
                .map(m => this.leaf(m, "method", "method")), [["addMethod", "+"]], environment),
            this.group(environment.id + "#products", "Products", own(model.artifacts).map(a => this.leaf(a, "artifact", "artifact")), [["addArtifact", "+"]], environment),
        ].join("");
        return this.item(environment, "environment", "env", children);
    }

    checkHtml(check) {
        const { model } = this;
        const steps = check.steps.map(s => this.leaf(s, "step", "step",
            [model.nameOf(s.roleId, ""), model.nameOf(s.toolId, "")].filter(Boolean).join(" · ")));
        const transitions = check.transitions.map(t => this.leaf(t, "transition", `eval-${t.evaluation}`,
            `${model.nameOf(t.sourceId)} → ${model.nameOf(t.targetId)}`,
            t.isBottleneck ? `!${t.priority ?? ""}` : EVALUATIONS[t.evaluation].short));
        const children = [
            this.group(check.id + "#steps", "Process steps", steps, [["addStep", "+"]], check),
            this.group(check.id + "#transitions", "Transitions", transitions, [["addTransition", "+"]], check),
        ].join("");
        return this.item(check, "check", "EEE", children);
    }

    policyHtml(policy) {
        const { model } = this;
        const rules = policy.rules.map(r => this.leaf(r, "rule", `status-${r.status || "none"}`,
            `${model.nameOf(r.methodId)} with ${model.nameOf(r.toolId)}`, r.status ? POLICY_STATUS[r.status].short : "–"));
        return this.item(policy, "policy", "policy", this.group(policy.id + "#rules", "Rules", rules, [["addRule", "+"]], policy));
    }

    item(element, cls, badge, childrenHtml) {
        const id = escapeHtml(element.id);
        const collapsed = this.collapsed.has(element.id);
        return `<li role="treeitem" class="fm-item ${cls}" aria-expanded="${!collapsed}">
            <div class="fm-row${element.id === this.selectedId ? " selected" : ""}">
                <button type="button" class="fm-toggle" data-toggle="${id}" aria-label="${collapsed ? "Expand" : "Collapse"}">${collapsed ? "▸" : "▾"}</button>
                <button type="button" class="fm-label" data-select="${id}"><span class="fm-badge tag-${cls}">${badge}</span>${escapeHtml(element.name)}</button>
            </div>
            ${collapsed ? "" : `<ul role="group">${childrenHtml}</ul>`}
        </li>`;
    }

    group(key, label, items, actions, target) {
        const collapsed = this.collapsed.has(key);
        const actionsHtml = this.editable && target
            ? `<span class="fm-actions">${actions.map(([command, text]) =>
                `<button type="button" class="fm-action" data-command="${command}" data-id="${escapeHtml(target.id)}" title="${escapeHtml(command.replace(/^add/, "Add a "))}">${escapeHtml(text)}</button>`).join("")}</span>`
            : "";
        return `<li role="treeitem" class="fm-item fm-group-item" aria-expanded="${!collapsed}">
            <div class="fm-row">
                <button type="button" class="fm-toggle" data-toggle="${escapeHtml(key)}" aria-label="${collapsed ? "Expand" : "Collapse"}">${collapsed ? "▸" : "▾"}</button>
                <span class="fm-group-label">${escapeHtml(label)} <span class="fm-muted">${items.length}</span></span>${actionsHtml}
            </div>
            ${collapsed || !items.length ? "" : `<ul role="group">${items.join("")}</ul>`}
        </li>`;
    }

    leaf(element, cls, tag, detail = "", mark = "") {
        return `<li role="treeitem" class="fm-item">
            <div class="fm-row${element.id === this.selectedId ? " selected" : ""}">
                <span class="fm-toggle-spacer"></span>
                <button type="button" class="fm-label" data-select="${escapeHtml(element.id)}" title="${escapeHtml(detail || element.name)}">
                    ${mark ? `<span class="fm-mark ${tag}">${escapeHtml(mark)}</span>` : `<span class="fm-dot tag-${tag}" aria-hidden="true"></span>`}${escapeHtml(element.name)}
                    ${detail ? `<span class="fm-muted">${escapeHtml(detail)}</span>` : ""}
                </button>
            </div></li>`;
    }

    onClick(e) {
        const toggle = e.target.closest("[data-toggle]");
        if (toggle) {
            const id = toggle.dataset.toggle;
            if (this.collapsed.has(id)) this.collapsed.delete(id); else this.collapsed.add(id);
            this.show(this.model, { editable: this.editable, selectedId: this.selectedId, analyses: this.analyses });
            return;
        }
        const action = e.target.closest("[data-command]");
        if (action && this.model) {
            this.dispatchEvent(new CustomEvent("command", { detail: { command: action.dataset.command, id: action.dataset.id } }));
            return;
        }
        const select = e.target.closest("[data-select]");
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select } }));
    }
}
