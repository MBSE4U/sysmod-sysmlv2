// Form-based editor: the selected EEE element as a form.
//
// - EEE check: the progress of the four EEE steps, the prioritized bottlenecks and the findings
// - Process step: role, tool and method, the tool policy status of its combination, its process step
//   definition, its transitions and measures
// - Transition: its steps, its kind (method/tool break, human interface), evaluation and priority, measures
// - MBSE environment: generals, counts, EEE checks and tool policies
// - Role, tool, method, process, artifact: description and where it is used
// - Measure: description and the bottleneck transitions it addresses
// - Tool policy and rule: the rules, and tool, method and status of a rule
//
// Events: "select" { id }, "command" { command, id, args }, "reveal" { id }, "view" { view }

import {
    MBSEEnvironment, Process, EeeCheck, Role, Tool, Method, Artifact, ProcessStep, StepTransition, Measure, ToolPolicy, ToolPolicyRule,
    STEP_DEFINITION_LANES, EVALUATIONS, POLICY_STATUS,
} from "../eee/model.js";
import { policyStatus } from "../eee/EeeAnalyzer.js";

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const STEP_NAMES = {
    1: "Analysis: Tools Roles Methods Matrix",
    2: "Evaluation of the transitions",
    3: "Analysis of the bottlenecks: process step definitions",
    4: "Optimization of the process steps: measures",
};

export class FormView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("form-view");
        this.state = null;
        this.root.addEventListener("click", e => this.onClick(e));
        this.root.addEventListener("change", e => this.onChange(e));
        this.root.addEventListener("input", e => {
            if (e.target.matches("[data-rename-input]")) {
                const button = this.root.querySelector("[data-rename]");
                if (button) button.disabled = !e.target.value.trim() || e.target.value.trim() === e.target.dataset.original;
            }
            if (e.target.matches("[data-doc-input]")) {
                const button = this.root.querySelector("[data-save-doc]");
                if (button) button.disabled = e.target.value === e.target.dataset.original;
            }
        });
        this.root.addEventListener("keydown", e => {
            if (e.key === "Enter" && e.target.matches("[data-rename-input]")) {
                e.preventDefault();
                this.rename(e.target);
            }
        });
    }

    /** @param {{model, analyses: Map, selectedId: string|null, editable: boolean, message?: string}} state */
    show(state) {
        this.state = state;
        const { model } = state;
        if (!model) {
            this.root.innerHTML = `<div class="fv-empty">${escapeHtml(state.message || "Waiting for the model check…")}</div>`;
            return;
        }
        let element = state.selectedId ? model.get(state.selectedId) : null;
        if (!element) element = model.checks[0] || model.policies[0] || null;
        if (!element) {
            this.root.innerHTML = `<div class="fv-empty"><p>No EEE check yet.</p>
                <p>Create one with <strong>File ▸ New EEE check</strong>, open a file, or try <strong>Examples</strong>.</p></div>`;
            return;
        }
        const focused = document.activeElement && this.root.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
        const body = element instanceof EeeCheck ? this.checkForm(element)
            : element instanceof ProcessStep ? this.stepForm(element)
                : element instanceof StepTransition ? this.transitionForm(element)
                    : element instanceof Measure ? this.measureForm(element)
                        : element instanceof ToolPolicy ? this.policyForm(element)
                            : element instanceof ToolPolicyRule ? this.ruleForm(element)
                                : this.basicForm(element);
        this.root.innerHTML = `<div class="fv-page">${this.breadcrumb(element)}${body}</div>`;
        if (focused) {
            const again = this.root.querySelector(`[data-focus-key="${CSS.escape(focused)}"]`);
            if (again) again.focus({ preventScroll: true });
        }
    }

    // ---------- building blocks ----------

    link(id, fallback = "–") {
        const element = this.state.model.get(id);
        return element ? `<button type="button" class="fv-link" data-select="${escapeHtml(id)}">${escapeHtml(element.name)}</button>` : escapeHtml(fallback);
    }

    chips(ids, empty) {
        return ids.length ? `<div class="fv-chips">${ids.map(id => `<button type="button" class="fv-link fv-chip" data-select="${escapeHtml(id)}">${escapeHtml(this.state.model.nameOf(id))}</button>`).join("")}</div>`
            : `<p class="fv-muted">${escapeHtml(empty)}</p>`;
    }

    breadcrumb(element) {
        const { model } = this.state;
        const chain = [];
        for (let e = element; e; e = model.get(e.ownerId)) chain.unshift(e);
        return `<nav class="fv-crumbs" aria-label="Location">${chain.map((e, i) => i === chain.length - 1
            ? `<span aria-current="page">${escapeHtml(e.name)}</span>`
            : `<button type="button" class="fv-link" data-select="${escapeHtml(e.id)}">${escapeHtml(e.name)}</button>`).join('<span class="fv-sep">›</span>')}</nav>`;
    }

    header(element, renameable = true) {
        const editable = this.state.editable && renameable;
        return `<header class="fv-header">
            <span class="fv-kind">${escapeHtml(element.kindLabel)}</span>
            ${editable
                ? `<div class="fv-rename"><label class="sr-only" for="fv-name">Name</label>
                    <input id="fv-name" class="fv-name-input" data-rename-input data-focus-key="name" data-original="${escapeHtml(element.name)}" value="${escapeHtml(element.name)}" spellcheck="false" autocomplete="off">
                    <button type="button" data-rename disabled>Rename</button></div>`
                : `<h2 class="fv-title">${escapeHtml(element.name)}</h2>`}
            <span class="fv-source">${escapeHtml(element.document || "")}
                <button type="button" class="fv-link" data-reveal="${escapeHtml(element.id)}">Show in text</button></span>
        </header>`;
    }

    docSection(element, label = "Description") {
        if (!this.state.editable) return element.doc ? `<p class="fv-line">${escapeHtml(element.doc)}</p>` : "";
        return `<section class="fv-section"><h3>${escapeHtml(label)}</h3>
            <textarea class="fv-doc" data-doc-input data-focus-key="doc" data-original="${escapeHtml(element.doc)}" rows="${Math.min(8, Math.max(2, element.doc.split("\n").length + 1))}"
                placeholder="Doc comment of ${escapeHtml(element.name)}">${escapeHtml(element.doc)}</textarea>
            <div class="fv-buttons"><button type="button" data-save-doc data-id="${escapeHtml(element.id)}" disabled>Save description</button></div></section>`;
    }

    referenceSelect(owner, feature, options, current, label) {
        const { editable } = this.state;
        return `<label class="fv-field"><span>${escapeHtml(label)}</span>
            <select data-reference="${feature}" data-id="${escapeHtml(owner.id)}" data-focus-key="ref:${feature}" ${editable ? "" : "disabled"}>
                <option value="">–</option>
                ${options.map(o => `<option value="${escapeHtml(o.id)}"${o.id === current ? " selected" : ""}>${escapeHtml(o.name)}</option>`).join("")}
            </select>${current ? this.link(current) : ""}</label>`;
    }

    deleteButton(element, label = `Delete ${element.kindLabel.toLowerCase()}`) {
        return this.state.editable
            ? `<section class="fv-section fv-danger"><button type="button" data-command="delete" data-id="${escapeHtml(element.id)}">${escapeHtml(label)}</button></section>`
            : "";
    }

    findingsList(findings) {
        if (!findings.length) return '<p class="fv-muted">No findings.</p>';
        return `<ul class="fv-findings">${findings.map(f => `<li class="${f.severity}">
            <button type="button" class="fv-link" data-select="${escapeHtml(f.id)}">${escapeHtml(f.message)}</button></li>`).join("")}</ul>`;
    }

    transitionRow(t) {
        const { model } = this.state;
        return `<li><button type="button" class="fv-link" data-select="${escapeHtml(t.id)}">${escapeHtml(t.name)}</button>
            <span class="fv-muted">${escapeHtml(model.nameOf(t.sourceId))} → ${escapeHtml(model.nameOf(t.targetId))}</span>
            <span class="eval-chip eval-${t.evaluation}">${escapeHtml(EVALUATIONS[t.evaluation].label)}${t.priority ? ` · ${t.priority}` : ""}</span></li>`;
    }

    // ---------- pages ----------

    checkForm(check) {
        const { model, analyses, editable } = this.state;
        const analysis = analyses.get(check.id);
        const id = escapeHtml(check.id);
        const stepper = [1, 2, 3, 4].map(n => {
            const p = analysis.progress[n];
            const count = analysis.findings.filter(f => f.step === n).length;
            return `<li class="fv-step${p.done ? " done" : ""}">
                <span class="fv-step-number">${p.done ? "✓" : n}</span>
                <div><strong>EEE Step #${n}</strong> ${escapeHtml(STEP_NAMES[n])}<br><span class="fv-muted">${escapeHtml(p.text)}${count ? ` · ${count} open` : ""}</span></div></li>`;
        }).join("");
        const bottlenecks = analysis.bottlenecks.map(t => {
            const kind = analysis.kinds.get(t.id);
            return `<tr><td class="fv-prio">${t.priority ?? "–"}</td><td>${this.link(t.id)}</td>
                <td>${this.link(t.sourceId)} → ${this.link(t.targetId)}</td><td>${escapeHtml(kind ? kind.label : "")}</td>
                <td>${model.measuresFor(t).map(m => this.link(m.id)).join(", ") || '<span class="fv-muted">none</span>'}</td></tr>`;
        }).join("");
        const breaks = [...analysis.kinds.values()];
        const counts = `<dl class="fv-dl fv-counts">
            <dt>Roles</dt><dd>${model.matrixAxes(check).roles.length}</dd>
            <dt>Tools</dt><dd>${model.matrixAxes(check).tools.length}</dd>
            <dt>Process steps</dt><dd>${check.steps.length}</dd>
            <dt>Transitions</dt><dd>${check.transitions.length}: ${breaks.filter(k => k.toolBreak).length} method/tool breaks, ${breaks.filter(k => k.humanInterface).length} human interfaces</dd>
        </dl>`;
        const findings = [1, 2, 3, 4].map(n => {
            const list = analysis.findings.filter(f => f.step === n);
            return list.length ? `<h4>EEE Step #${n}</h4>${this.findingsList(list)}` : "";
        }).join("");
        return this.header(check)
            + `<p class="fv-line">Analyzes the MBSE environment ${check.environmentId ? this.link(check.environmentId) : '<span class="fv-muted">– (redefine <code>environment</code>)</span>'}
                ${check.environmentId ? '<button type="button" class="fv-link" data-view="environment">Open environment</button>' : ""}</p>`
            + `<ol class="fv-stepper">${stepper}</ol>`
            + counts
            + (editable ? `<div class="fv-buttons">
                <button type="button" data-command="addRole" data-id="${id}">+ Role</button>
                <button type="button" data-command="addTool" data-id="${id}">+ Tool</button>
                <button type="button" data-command="addMethod" data-id="${id}">+ Method</button>
                <button type="button" data-command="addArtifact" data-id="${id}">+ Artifact</button>
                <button type="button" data-command="addStep" data-id="${id}">+ Process step</button>
                <button type="button" data-command="addTransition" data-id="${id}">+ Transition</button>
                <button type="button" data-view="matrix">Open matrix</button></div>` : "")
            + `<section class="fv-section"><h3>Bottlenecks by priority</h3>${bottlenecks
                ? `<div class="fv-matrix-wrap"><table class="fv-table"><thead><tr><th>Prio</th><th>Transition</th><th>Steps</th><th>Kind</th><th>Measures</th></tr></thead><tbody>${bottlenecks}</tbody></table></div>`
                : '<p class="fv-muted">No bottlenecks yet. Evaluate the transitions in the matrix (EEE Step #2).</p>'}</section>`
            + `<section class="fv-section"><h3>Findings</h3>${findings || '<p class="fv-muted">No findings: all four EEE steps are complete.</p>'}
                <p class="fv-note">The findings come from the editor's evaluation of the method; the SysML engine checks the SysML (see Problems).</p></section>`
            + this.docSection(check);
    }

    stepForm(step) {
        const { model, analyses } = this.state;
        const check = model.checkOf(step.id);
        const analysis = check ? analyses.get(check.id) : null;
        const policy = policyStatus(model, step.toolId, step.methodId);
        const transitions = model.transitionsOf(step);
        const lanes = STEP_DEFINITION_LANES.map(lane => {
            const value = step.lane(lane.feature);
            const text = lane.kind === "text" ? escapeHtml(value || "–")
                : lane.kind === "artifacts" ? (value.map(id => this.link(id)).join(", ") || "–")
                    : (value.map(v => escapeHtml(v)).join("; ") || "–");
            return `<dt>${escapeHtml(lane.label)}</dt><dd>${text}</dd>`;
        }).join("");
        const stepFindings = analysis ? analysis.findings.filter(f => f.id === step.id) : [];
        return this.header(step)
            + `<section class="fv-section fv-grid3">
                ${this.referenceSelect(step, "role", model.roles, step.roleId, "Role (row)")}
                ${this.referenceSelect(step, "tool", model.tools, step.toolId, "Tool (column)")}
                ${this.referenceSelect(step, "method", model.methods, step.methodId, "Method")}
            </section>`
            + (policy ? `<p class="fv-line">Tool policy: <span class="pv-chip status-${policy.status}">${POLICY_STATUS[policy.status].label}</span>
                ${escapeHtml(model.nameOf(step.methodId))} with ${escapeHtml(model.nameOf(step.toolId))} (${this.link(policy.rule.id)})</p>`
                : step.toolId && step.methodId ? `<p class="fv-line fv-muted">The tool policy has no rule for ${escapeHtml(model.nameOf(step.methodId))} with ${escapeHtml(model.nameOf(step.toolId))}.</p>` : "")
            + (stepFindings.length ? this.findingsList(stepFindings) : "")
            + `<section class="fv-section"><h3>Process step definition <button type="button" class="fv-link" data-view="steps">Open diagram</button></h3>
                <dl class="fv-dl">${lanes}</dl></section>`
            + `<section class="fv-section"><h3>Transitions</h3>${transitions.length ? `<ul class="fv-list">${transitions.map(t => this.transitionRow(t)).join("")}</ul>` : '<p class="fv-muted">No transitions.</p>'}
                ${this.state.editable ? `<div class="fv-buttons"><button type="button" data-command="addTransition" data-id="${escapeHtml(step.id)}">+ Transition from ${escapeHtml(step.name)}</button></div>` : ""}</section>`
            + `<section class="fv-section"><h3>Measures</h3>${this.chips(step.measures.map(m => m.id), "No measures.")}
                ${this.state.editable ? `<div class="fv-buttons"><button type="button" data-command="addMeasure" data-id="${escapeHtml(step.id)}">+ Measure</button></div>` : ""}</section>`
            + this.docSection(step)
            + this.deleteButton(step, "Delete process step");
    }

    transitionForm(t) {
        const { model, analyses, editable } = this.state;
        const check = model.checkOf(t.id);
        const analysis = check ? analyses.get(check.id) : null;
        const kind = analysis ? analysis.kinds.get(t.id) : null;
        const source = model.get(t.sourceId), target = model.get(t.targetId);
        const side = (step, label) => step ? `<div class="fv-side"><span class="fv-muted">${label}</span>${this.link(step.id)}
            <span class="fv-muted">${escapeHtml(model.nameOf(step.roleId))} · ${escapeHtml(model.nameOf(step.toolId))} · ${escapeHtml(model.nameOf(step.methodId))}</span></div>` : `<div class="fv-side fv-muted">unknown</div>`;
        const evaluation = Object.entries(EVALUATIONS).map(([value, e]) => `<label class="fv-radio"><input type="radio" name="evaluation" value="${value}" data-focus-key="eval:${value}"
            ${t.evaluation === value ? "checked" : ""} ${editable ? "" : "disabled"}><span class="eval-chip eval-${value}">${escapeHtml(e.label)}</span></label>`).join("");
        return this.header(t)
            + `<div class="fv-handover">${side(source, "hands over")}<span class="fv-arrow" aria-hidden="true">→</span>${side(target, "takes over")}</div>`
            + (kind && kind.known ? `<p class="fv-line">Kind: <strong>${escapeHtml(kind.label)}</strong>${kind.toolBreak ? " — the tool changes (column transition)" : ""}${kind.humanInterface ? `${kind.toolBreak ? ";" : " —"} the role changes (row transition)` : ""}.</p>` : "")
            + `<fieldset class="fv-section"><legend>Evaluation (EEE Step #2)</legend><div class="fv-kinds">${evaluation}</div>
                ${t.isBottleneck ? `<label class="fv-field fv-inline"><span>Priority</span><input type="number" min="1" step="1" data-priority data-focus-key="priority" value="${t.priority ?? ""}" ${editable ? "" : "disabled"}>
                    <span class="fv-muted">1 is the highest priority</span></label>` : ""}</fieldset>`
            + `<section class="fv-section"><h3>Bottleneck analysis <button type="button" class="fv-link" data-view="steps">Open step definitions</button></h3>
                <p class="fv-muted">Artifacts handed over: ${source && target ? (source.targetArtifactIds.filter(id => target.sourceArtifactIds.includes(id)).map(id => this.link(id)).join(", ") || "none") : "–"}</p></section>`
            + `<section class="fv-section"><h3>Measures that address it</h3>${this.chips(model.measuresFor(t).map(m => m.id), "No measures.")}</section>`
            + this.docSection(t)
            + this.deleteButton(t, "Delete transition");
    }

    measureForm(measure) {
        const { model, editable } = this.state;
        const check = model.checkOf(measure.id);
        const transitions = check ? check.transitions : [];
        const boxes = transitions.map(t => `<label class="fv-check"><input type="checkbox" data-addressed="${escapeHtml(t.id)}" data-focus-key="addr:${escapeHtml(t.id)}"
            ${measure.addressedTransitionIds.includes(t.id) ? "checked" : ""} ${editable ? "" : "disabled"}>
            ${escapeHtml(t.name)} <span class="eval-chip eval-${t.evaluation}">${escapeHtml(EVALUATIONS[t.evaluation].label)}${t.priority ? ` · ${t.priority}` : ""}</span></label>`).join("");
        return this.header(measure)
            + `<p class="fv-line">Optimizes the process step ${this.link(measure.stepId)} (EEE Step #4).</p>`
            + this.docSection(measure)
            + `<section class="fv-section"><h3>Addressed transitions</h3><div class="fv-checks">${boxes || '<p class="fv-muted">No transitions.</p>'}</div></section>`
            + this.deleteButton(measure, "Delete measure");
    }

    policyForm(policy) {
        const { model, analyses, editable } = this.state;
        const analysis = analyses.get(policy.id);
        const rows = policy.rules.map(r => `<tr><td>${this.link(r.id)}</td><td>${this.link(r.methodId)}</td><td>${this.link(r.toolId)}</td>
            <td>${r.status ? `<span class="pv-chip status-${r.status}">${POLICY_STATUS[r.status].label}</span>` : "–"}</td></tr>`).join("");
        return this.header(policy)
            + `<p class="fv-line">Rates the tools and methods of the MBSE environment ${policy.environmentId ? this.link(policy.environmentId) : '<span class="fv-muted">–</span>'}</p>`
            + `<div class="fv-buttons">${editable ? `<button type="button" data-command="addRule" data-id="${escapeHtml(policy.id)}">+ Rule</button>` : ""}
                <button type="button" data-view="policy">Open policy matrix</button></div>`
            + `<section class="fv-section"><h3>Rules</h3>${rows ? `<div class="fv-matrix-wrap"><table class="fv-table"><thead><tr><th>Rule</th><th>Method</th><th>Tool</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="fv-muted">No rules.</p>'}</section>`
            + (analysis && analysis.findings.length ? `<section class="fv-section"><h3>Findings</h3>${this.findingsList(analysis.findings)}</section>` : "")
            + `<p class="fv-note">${model.checks.length ? "The EEE checks report process steps that use a forbidden combination." : ""}</p>`
            + this.docSection(policy);
    }

    ruleForm(rule) {
        const { model, editable } = this.state;
        const status = Object.entries(POLICY_STATUS).map(([value, s]) => `<label class="fv-radio"><input type="radio" name="status" value="${value}" data-focus-key="status:${value}"
            ${rule.status === value ? "checked" : ""} ${editable ? "" : "disabled"}><span class="pv-chip status-${value}">${escapeHtml(s.label)}</span></label>`).join("");
        const users = model.checks.flatMap(c => c.steps).filter(s => s.toolId === rule.toolId && s.methodId === rule.methodId);
        return this.header(rule)
            + `<section class="fv-section fv-grid3">
                ${this.referenceSelect(rule, "method", model.methods, rule.methodId, "Method (row)")}
                ${this.referenceSelect(rule, "tool", model.tools, rule.toolId, "Tool (column)")}
            </section>`
            + `<fieldset class="fv-section"><legend>Status</legend><div class="fv-kinds">${status}</div></fieldset>`
            + `<section class="fv-section"><h3>Process steps with this combination</h3>${this.chips(users.map(s => s.id), "None.")}</section>`
            + this.docSection(rule, "Rationale")
            + this.deleteButton(rule, "Delete rule");
    }

    basicForm(element) {
        const { model } = this.state;
        const steps = model.checks.flatMap(c => c.steps);
        let usage = "";
        if (element instanceof Role) {
            usage = `<section class="fv-section"><h3>Process steps of the role</h3>${this.chips(steps.filter(s => s.roleId === element.id).map(s => s.id), "None.")}</section>`;
        } else if (element instanceof Tool || element instanceof Method) {
            const key = element instanceof Tool ? "toolId" : "methodId";
            const rules = model.policies.flatMap(p => p.rules).filter(r => r[key] === element.id);
            usage = `<section class="fv-section"><h3>Process steps</h3>${this.chips(steps.filter(s => s[key] === element.id).map(s => s.id), "None.")}</section>
                <section class="fv-section"><h3>Tool policy rules</h3>${this.chips(rules.map(r => r.id), "None.")}</section>`;
        } else if (element instanceof MBSEEnvironment) {
            const checks = model.checks.filter(c => c.environmentId === element.id);
            const policies = model.policies.filter(p => p.environmentId === element.id);
            usage = `<p class="fv-line">${element.generalIds.length ? `Specializes ${element.generalIds.map(g => this.link(g, g.split("::").pop())).join(", ")}. ` : ""}
                    <button type="button" class="fv-link" data-view="environment">Open environment view</button></p>
                <dl class="fv-dl fv-counts">
                    <dt>Roles</dt><dd>${model.inScope(model.roles, element.id).length}</dd>
                    <dt>Tools</dt><dd>${model.inScope(model.tools, element.id).length}</dd>
                    <dt>Methods</dt><dd>${model.inScope(model.methods, element.id).length}</dd>
                    <dt>Products</dt><dd>${model.inScope(model.artifacts, element.id).length}</dd></dl>
                <section class="fv-section"><h3>EEE checks</h3>${this.chips(checks.map(c => c.id), "None.")}</section>
                <section class="fv-section"><h3>Tool policies</h3>${this.chips(policies.map(p => p.id), "None.")}</section>`;
            return this.header(element) + usage + this.docSection(element);
        } else if (element instanceof Artifact) {
            usage = `<section class="fv-section"><h3>Produced by</h3>${this.chips(steps.filter(s => s.targetArtifactIds.includes(element.id)).map(s => s.id), "No process step.")}</section>
                <section class="fv-section"><h3>Needed by</h3>${this.chips(steps.filter(s => s.sourceArtifactIds.includes(element.id)).map(s => s.id), "No process step.")}</section>`;
        }
        return this.header(element) + this.docSection(element) + usage + this.deleteButton(element);
    }

    // ---------- events ----------

    emit(command, id, args = {}) {
        this.dispatchEvent(new CustomEvent("command", { detail: { command, id, args } }));
    }

    onClick(e) {
        const command = e.target.closest("[data-command]");
        if (command) { this.emit(command.dataset.command, command.dataset.id); return; }
        if (e.target.closest("[data-rename]")) { this.rename(this.root.querySelector("[data-rename-input]")); return; }
        const saveDoc = e.target.closest("[data-save-doc]");
        if (saveDoc) { this.emit("setDoc", saveDoc.dataset.id, { text: this.root.querySelector("[data-doc-input]").value.trim() }); return; }
        const view = e.target.closest("[data-view]");
        if (view) { this.dispatchEvent(new CustomEvent("view", { detail: { view: view.dataset.view } })); return; }
        const reveal = e.target.closest("[data-reveal]");
        if (reveal) { this.dispatchEvent(new CustomEvent("reveal", { detail: { id: reveal.dataset.reveal } })); return; }
        const select = e.target.closest("[data-select]");
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select } }));
    }

    onChange(e) {
        const target = e.target;
        const selectedId = this.state.selectedId || (this.root.querySelector("[data-reveal]") || {}).dataset?.reveal;
        if (target.matches("[data-reference]")) {
            this.emit("setReference", target.dataset.id, { feature: target.dataset.reference, targetId: target.value || null });
        } else if (target.name === "evaluation" && target.checked) {
            this.emit("setEvaluation", selectedId, { evaluation: target.value });
        } else if (target.matches("[data-priority]")) {
            this.emit("setPriority", selectedId, { priority: target.value.trim() ? Number(target.value) : null });
        } else if (target.name === "status" && target.checked) {
            this.emit("setStatus", selectedId, { status: target.value });
        } else if (target.matches("[data-addressed]")) {
            const ids = [...this.root.querySelectorAll("[data-addressed]")].filter(b => b.checked).map(b => b.dataset.addressed);
            this.emit("setAddressed", selectedId, { transitionIds: ids });
        }
    }

    rename(input) {
        if (!input) return;
        const name = input.value.trim();
        if (!name || name === input.dataset.original) return;
        const id = (this.root.querySelector("[data-reveal]") || {}).dataset?.reveal;
        if (id) this.emit("rename", id, { newName: name });
    }
}
