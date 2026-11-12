// Outline of the model: the MBSE environments with their roles, tools, methods and products, their flow analyses
// (process steps, hand-overs, tool transitions, measures) and the rules of their tool policy; and the methodology
// elements of the active document outside an environment, e.g. the processes, roles and products of a library.
//
// Events:
//   "select"  detail { id }                     the user picked an element
//   "document" detail { name, section }         the user picked the active document or one of its sections
//   "command" detail { command, id }            the user asked for an editing command:
//             addRole, addArtifact, addTool, addMethod, addAnalysis, addRule (environment), addStep, addTransition (analysis)

import { RATINGS, POLICY_STATUS, Process, Method, MBSEEnvironment } from "../dtfa/model.js";

/** Groups with more items start collapsed. */
const COLLAPSE_ABOVE = 20;

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export class ModelOutlineView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("fm-view", "dtfa-outline");
        this.model = null;
        this.collapsed = new Set();
        this.expanded = new Set();   // large groups that the user expanded
        this.editable = true;
        this.root.addEventListener("click", e => this.onClick(e));
    }

    /** @param {import("../dtfa/model.js").DtfaModel|null} model */
    show(model, { editable = true, message = "", selectedId = null, analyses = null, activeDocument = null } = {}) {
        this.model = model;
        this.activeDocument = activeDocument;
        this.editable = editable;
        this.selectedId = selectedId;
        this.analyses = analyses;
        if (!model) {
            this.root.innerHTML = `<p class="fm-empty">${escapeHtml(message || "No model checked yet.")}</p>`;
            return;
        }
        const documentHtml = activeDocument ? this.documentHtml(activeDocument) : "";
        if (!model.environments.length && !documentHtml) {
            this.root.innerHTML = `<p class="fm-empty">No MBSE environment found. Create one with
                <strong>File ▸ New MBSE environment</strong> or insert one with <strong>Insert ▸ MBSE environment</strong>.</p>`;
            return;
        }
        this.root.innerHTML = model.notes.map(n => `<p class="fm-note">${escapeHtml(n)}</p>`).join("")
            + `<ul class="fm-tree" role="tree">${documentHtml}${model.environments.map(e => this.environmentHtml(e)).join("")}</ul>`;
    }

    /**
     * The methodology elements of a document that are not part of an MBSE environment, e.g. the processes, roles and
     * products of ISO15288Processes; empty if the document has none.
     */
    documentHtml(name) {
        const { model } = this;
        const isBehavior = e => e instanceof Process || e instanceof Method;
        const outside = e => {
            if (e.document !== name) return false;
            for (let o = model.get(e.ownerId); o; o = model.get(o.ownerId)) if (isBehavior(o) || o instanceof MBSEEnvironment) return false;
            return true;
        };
        const behaviors = [...model.elements.values()].filter(e => isBehavior(e) && outside(e));
        const steps = b => [...model.elements.values()].filter(c => c.ownerId === b.id && isBehavior(c)).length + (b.inheritedIds || []).filter(id => isBehavior(model.get(id))).length;
        const leaves = (list, tag) => list.map(e => this.leaf(e, tag, tag, steps(e) ? `${steps(e)} steps` : ""));
        const groups = [
            ["Processes", leaves(behaviors.filter(e => e instanceof Process), "method")],
            ["Methods", leaves(behaviors.filter(e => e instanceof Method), "method")],
            ["Roles", model.roles.filter(outside).map(e => this.leaf(e, "role", "role"))],
            ["Tools", model.tools.filter(outside).map(e => this.leaf(e, "tool", "tool"))],
            ["Products", model.artifacts.filter(outside).map(e => this.leaf(e, "artifact", "artifact"))],
        ].filter(([, items]) => items.length);
        if (!groups.length) return "";
        const key = "document:" + name;
        const collapsed = this.collapsed.has(key);
        const children = groups.map(([label, items]) => this.group(`${key}#${label}`, label, items, [], null, { document: name })).join("");
        return `<li role="treeitem" class="fm-item document" aria-expanded="${!collapsed}">
            <div class="fm-row">
                <button type="button" class="fm-toggle" data-toggle="${escapeHtml(key)}" aria-label="${collapsed ? "Expand" : "Collapse"}">${collapsed ? "▸" : "▾"}</button>
                <button type="button" class="fm-label" data-document="${escapeHtml(name)}" title="Open the document editor of ${escapeHtml(name)}"><span class="fm-badge tag-document">doc</span>${escapeHtml(name.replace(/\.(sysml|kerml)$/, ""))}</button>
            </div>
            ${collapsed ? "" : `<ul role="group">${children}</ul>`}
        </li>`;
    }

    /** Whether a group is collapsed: large groups start collapsed. */
    isCollapsed(key, count) {
        return this.collapsed.has(key) || (count > COLLAPSE_ABOVE && !this.expanded.has(key));
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
            this.group(environment.id + "#analyses", "Flow analyses", environment.analyses.map(a => this.analysisHtml(a)), [["addAnalysis", "+"]], environment),
            this.group(environment.id + "#rules", "Tool policy", environment.rules.map(r => this.leaf(r, "rule", `status-${r.status || "none"}`,
                `${model.nameOf(r.methodId)} with ${model.nameOf(r.toolId)}`, r.status ? POLICY_STATUS[r.status].short : "–")), [["addRule", "+"]], environment),
        ].join("");
        return this.item(environment, "environment", "env", children);
    }

    analysisHtml(analysis) {
        const { model } = this;
        const steps = analysis.steps.map(s => this.leaf(s.method, "step", "step",
            [model.nameOf(s.roleId, ""), model.nameOf(s.toolId, "")].filter(Boolean).join(" · ")));
        const handovers = analysis.handovers.map(h => this.leaf(h, "transition", `eval-${h.rating}`,
            h.productIds.map(id => model.nameOf(id)).join(", "), h.isBottleneck ? `!${h.priority ?? ""}` : RATINGS[h.rating].short));
        const transitions = analysis.transitions.map(t => this.leaf(t, "transition", `eval-${t.rating}`,
            `${model.nameOf(t.sourceId)} → ${model.nameOf(t.targetId)}`, t.isBottleneck ? `!${t.priority ?? ""}` : RATINGS[t.rating].short));
        const measures = analysis.measures.map(m => this.leaf(m, "measure", "measure", m.addressedTransitionIds.map(id => model.nameOf(id)).join(", ")));
        const children = [
            this.group(analysis.id + "#steps", "Process steps", steps, [["addStep", "+"]], analysis),
            this.group(analysis.id + "#handovers", "Hand-overs", handovers, [["addHandover", "+"]], analysis),
            this.group(analysis.id + "#transitions", "Tool transitions", transitions, [["addTransition", "+"]], analysis),
            this.group(analysis.id + "#measures", "Measures", measures, [["addMeasure", "+"]], analysis),
        ].join("");
        return this.item(analysis, "check", "DTFA", children);
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

    group(key, label, items, actions, target, { document = null } = {}) {
        const collapsed = this.isCollapsed(key, items.length);
        const actionsHtml = this.editable && target
            ? `<span class="fm-actions">${actions.map(([command, text]) =>
                `<button type="button" class="fm-action" data-command="${command}" data-id="${escapeHtml(target.id)}" title="${escapeHtml(command.replace(/^add/, "Add a "))}">${escapeHtml(text)}</button>`).join("")}</span>`
            : "";
        return `<li role="treeitem" class="fm-item fm-group-item" aria-expanded="${!collapsed}">
            <div class="fm-row">
                <button type="button" class="fm-toggle" data-toggle="${escapeHtml(key)}" data-collapsed="${collapsed}" aria-label="${collapsed ? "Expand" : "Collapse"}">${collapsed ? "▸" : "▾"}</button>
                ${document ? `<button type="button" class="fm-group-label fm-group-open" data-document="${escapeHtml(document)}" data-section="${escapeHtml(label)}"
                        title="Show the ${escapeHtml(label.toLowerCase())} in the document editor">${escapeHtml(label)} <span class="fm-muted">${items.length}</span></button>`
                : target && ["roles", "tools", "methods", "products"].includes(key.split("#").pop())
                    ? `<button type="button" class="fm-group-label fm-group-open" data-collection="${escapeHtml(key.split("#").pop())}" data-id="${escapeHtml(target.id)}"
                        title="Open the ${escapeHtml(label.toLowerCase())} of ${escapeHtml(target.name)}">${escapeHtml(label)} <span class="fm-muted">${items.length}</span></button>`
                    : `<span class="fm-group-label">${escapeHtml(label)} <span class="fm-muted">${items.length}</span></span>`}${actionsHtml}
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
            const collapsed = toggle.dataset.collapsed ? toggle.dataset.collapsed === "true" : this.collapsed.has(id);
            if (collapsed) { this.collapsed.delete(id); this.expanded.add(id); } else { this.collapsed.add(id); this.expanded.delete(id); }
            this.show(this.model, { editable: this.editable, selectedId: this.selectedId, analyses: this.analyses, activeDocument: this.activeDocument });
            return;
        }
        const documentTarget = e.target.closest("[data-document]");
        if (documentTarget) {
            this.dispatchEvent(new CustomEvent("document", { detail: { name: documentTarget.dataset.document, section: documentTarget.dataset.section || null } }));
            return;
        }
        const collection = e.target.closest("[data-collection]");
        if (collection) {
            this.dispatchEvent(new CustomEvent("select", { detail: { id: collection.dataset.id, open: true, collection: collection.dataset.collection } }));
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
