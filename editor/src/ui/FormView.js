// Form-based editor: the selected element as a form.
//
// - Flow analysis: the progress of the four DTFA steps, the prioritized bottlenecks and the findings
// - Method (a process step): role and tool in each analysis, the tool policy status, the step definition,
//   the hand-overs from and to the step, the performers that the methodology declares
// - Hand-over: its steps, its products, its kind (tool break, human interface), the rating of its tool transition
// - Tool transition: its tools and products, rating, priority, explanation, conversions, the hand-overs it rates
// - MBSE environment: generals, counts, flow analyses and tool policy
// - Role, tool, process, product: description and where it is used
// - Measure: description and the bottleneck transitions it addresses
// - Tool policy rule: tool, method and status
//
// Events: "select" { id }, "command" { command, id, args }, "reveal" { id }, "view" { view }

import {
    MBSEEnvironment, FlowAnalysis, Process, Role, Tool, Method, Artifact, Handover, ToolTransition, Measure, ToolPolicyRule,
    STEP_DEFINITION_LANES, RATINGS, POLICY_STATUS, laneValue,
} from "../dtfa/model.js";

/** The collections of an MBSE environment that have a collection editor (see FormView.collectionForm). */
const COLLECTIONS = {
    roles: { title: "Roles", list: "roles", command: "addRole", add: "+ Role", stepKey: "roleId", usedLabel: "Process steps",
        hint: "The roles of the environment (MBSEEnvironment::roles): the rows of the matrix." },
    tools: { title: "Tools", list: "tools", command: "addTool", add: "+ Tool", stepKey: "toolId", usedLabel: "Process steps",
        hint: "The tools of the environment (MBSEEnvironment::tools): the columns of the matrix." },
    methods: { title: "Methodology", list: "methods", command: "addMethod", add: "+ Method", stepKey: "id", usedLabel: "Process steps",
        hint: "The processes and methods of the methodology of the environment, with the performers and tools that the methodology declares." },
    products: { title: "Products", list: "artifacts", command: "addArtifact", add: "+ Product", stepKey: "", usedLabel: "Process steps",
        hint: "The products of the environment (MBSEMethodology::Product): the data of the digital thread that the methods need and produce." },
};

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const STEP_NAMES = {
    1: "Flow mapping: Tools Roles Methods Matrix",
    2: "Rating of the tool transitions",
    3: "Bottleneck analysis: step definitions",
    4: "Measures",
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
            if (e.target.matches("[data-explanation-input]")) {
                const button = this.root.querySelector("[data-save-explanation]");
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
        const collectionEnvironment = state.collection ? model.get(state.collection.environmentId) : null;
        if (collectionEnvironment) {
            const focusedKey = document.activeElement && this.root.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
            this.root.innerHTML = `<div class="fv-page">${this.collectionForm(collectionEnvironment, state.collection.kind)}</div>`;
            const again = focusedKey && this.root.querySelector(`[data-focus-key="${CSS.escape(focusedKey)}"]`);
            if (again) again.focus({ preventScroll: true });
            return;
        }
        if (state.document) {
            this.root.innerHTML = `<div class="fv-page">${this.documentForm(state.document)}</div>`;
            return;
        }
        let element = state.selectedId ? model.get(state.selectedId) : null;
        if (!element) element = model.analyses[0] || model.environments[0] || null;
        if (!element) {
            this.root.innerHTML = `<div class="fv-empty"><p>No MBSE environment yet.</p>
                <p>Create one with <strong>File ▸ New MBSE environment</strong>, open a file, or try <strong>Examples</strong>.</p></div>`;
            return;
        }
        const focused = document.activeElement && this.root.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
        const body = element instanceof FlowAnalysis ? this.analysisForm(element)
            : element instanceof Handover ? this.handoverForm(element)
                : element instanceof ToolTransition ? this.transitionForm(element)
                    : element instanceof Measure ? this.measureForm(element)
                        : element instanceof ToolPolicyRule ? this.ruleForm(element)
                            : this.basicForm(element);
        this.root.innerHTML = `<div class="fv-page">${this.breadcrumb(element)}${body}</div>`;
        if (focused) {
            const again = this.root.querySelector(`[data-focus-key="${CSS.escape(focused)}"]`);
            if (again) again.focus({ preventScroll: true });
        }
    }

    /** The process steps of all analyses: [{ analysis, step }]. */
    allSteps() {
        return this.state.model.analyses.flatMap(analysis => analysis.steps.map(step => ({ analysis, step })));
    }

    // ---------- building blocks ----------

    link(id, fallback = "–") {
        const element = this.state.model.get(id);
        return element ? `<button type="button" class="fv-link" data-select="${escapeHtml(id)}">${escapeHtml(element.name)}</button>` : escapeHtml(fallback);
    }

    /** A general type: a link if it is an element of the model, otherwise its name with its qualified name and doc as tooltip. */
    generalLink(id) {
        const { model } = this.state;
        if (model.get(id)) return this.link(id);
        const info = (model.generals || {})[id];
        const title = [id, ...((info && info.docs) || [])].join("\n\n");
        return `<span class="fv-type" title="${escapeHtml(title)}">${escapeHtml((info && info.name) || id.split("::").pop())}</span>`;
    }

    /** The specializations of an element: its types and the features it subsets or redefines (also inherited ones). */
    typesLine(element) {
        const typeIds = element.typeIds || [];
        if (!typeIds.length) return "";
        return `<p class="fv-line fv-types"><span class="fv-muted">Specializes</span> ${typeIds.map(id => this.generalLink(id)).join(", ")}</p>`;
    }

    /** The environment in whose scope a role, tool or method is considered: its own, or the first one that contains it. */
    contextEnvironmentOf(element) {
        const { model } = this.state;
        if (element.environmentId && model.get(element.environmentId)) return element.environmentId;
        const environment = model.environments.find(env => model.methodologyTree(env.id).some(n => n.element.id === element.id)
            || model.inScope(model.roles, env.id).includes(element) || model.inScope(model.tools, env.id).includes(element));
        return environment ? environment.id : null;
    }

    /**
     * What the methodology declares for a role or tool: the methods and processes it is responsible for, supports
     * or facilitates, also through the general types of the role (e.g. SystemArchitect) and inherited behaviors.
     */
    methodologySection(element, isTool) {
        const { model } = this.state;
        const environmentId = this.contextEnvironmentOf(element);
        if (!environmentId) return "";
        const tree = model.methodologyTree(environmentId);
        const of = kinds => tree.filter(n => model.performersOf(n.element, environmentId, kinds).includes(element)).map(n => n.element.id);
        const groups = isTool ? [["Facilitates", of(["tool"])]] : [["Responsible for", of(["primary"])], ["Supports", of(["additional"])]];
        if (!groups.some(([, ids]) => ids.length)) return `<section class="fv-section"><h3>Methodology <span class="fv-muted">declared by the methodology of ${this.link(environmentId)}</span></h3>
            <p class="fv-muted">The methodology declares no ${isTool ? "behavior that the tool facilitates" : "behavior for the role or its types"}.</p></section>`;
        return `<section class="fv-section"><h3>Methodology <span class="fv-muted">declared by the methodology of ${this.link(environmentId)}</span></h3>
            <dl class="fv-dl">${groups.filter(([, ids]) => ids.length).map(([label, ids]) => `<dt>${label}</dt><dd>${this.chips(ids, "")}</dd>`).join("")}</dl></section>`;
    }

    /** The roles and tools that the methodology declares for a method or process. */
    performersSection(element) {
        const { model } = this.state;
        const environmentId = this.contextEnvironmentOf(element);
        if (!environmentId) return "";
        const groups = [["Responsible", ["primary"]], ["Supporting", ["additional"]], ["Tools", ["tool"]]]
            .map(([label, kinds]) => [label, model.performersOf(element, environmentId, kinds).map(e => e.id)]).filter(([, ids]) => ids.length);
        if (!groups.length) return "";
        return `<section class="fv-section"><h3>Performers <span class="fv-muted">declared by the methodology, in ${this.link(environmentId)}</span></h3>
            <dl class="fv-dl">${groups.map(([label, ids]) => `<dt>${label}</dt><dd>${this.chips(ids, "")}</dd>`).join("")}</dl></section>`;
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
        const editable = this.editableFor(element) && renameable;
        return `<header class="fv-header">
            <span class="fv-kind">${escapeHtml(element.kindLabel)}</span>
            ${editable
                ? `<div class="fv-rename"><label class="sr-only" for="fv-name">Name</label>
                    <input id="fv-name" class="fv-name-input" data-rename-input data-focus-key="name" data-original="${escapeHtml(element.name)}" value="${escapeHtml(element.name)}" spellcheck="false" autocomplete="off">
                    <button type="button" data-rename disabled>Rename</button></div>`
                : `<h2 class="fv-title">${escapeHtml(element.name)}</h2>`}
            <span class="fv-source">${escapeHtml(element.document || "")}
                ${element instanceof Role || element instanceof Tool || element instanceof Method || element instanceof Process || element instanceof Artifact
                    ? `<button type="button" class="fv-link" data-select="${escapeHtml(element.id)}" title="The diagram of the element with its connected artifacts">Show diagram</button>` : ""}
                <button type="button" class="fv-link" data-reveal="${escapeHtml(element.id)}">Show in text</button></span>
        </header>`;
    }

    docSection(element, label = "Description") {
        // The doc of a general type (e.g. of SystemArchitect for "part systemArchitect : SystemArchitect") applies
        // as long as the element has no doc of its own.
        const inherited = !element.doc && element.inheritedDoc
            ? `<blockquote class="fv-inherited-doc">${escapeHtml(element.inheritedDoc.text)}
                <footer class="fv-muted">Inherited from ${this.link(element.inheritedDoc.fromId, element.inheritedDoc.fromName)}</footer></blockquote>` : "";
        if (!this.editableFor(element)) return element.doc ? `<p class="fv-line">${escapeHtml(element.doc)}</p>` : inherited;
        return `<section class="fv-section"><h3>${escapeHtml(label)}</h3>${inherited}
            <textarea class="fv-doc" data-doc-input data-focus-key="doc" data-original="${escapeHtml(element.doc)}" rows="${Math.min(8, Math.max(2, element.doc.split("\n").length + 1))}"
                placeholder="${element.inheritedDoc ? "Own doc comment that replaces the inherited description" : `Doc comment of ${escapeHtml(element.name)}`}">${escapeHtml(element.doc)}</textarea>
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

    /** Elements of a library (e.g. a role of the SYSMOD methodology) are read-only; they are changed by specializing them. */
    editableFor(element) {
        return this.state.editable && !element.external && !element.library;
    }

    deleteButton(element, label = `Delete ${element.kindLabel.toLowerCase()}`) {
        return this.editableFor(element)
            ? `<section class="fv-section fv-danger"><button type="button" data-command="delete" data-id="${escapeHtml(element.id)}">${escapeHtml(label)}</button></section>`
            : "";
    }

    findingsList(findings) {
        if (!findings.length) return '<p class="fv-muted">No findings.</p>';
        return `<ul class="fv-findings">${findings.map(f => `<li class="${f.severity}">
            <button type="button" class="fv-link" data-select="${escapeHtml(f.id)}">${escapeHtml(f.message)}</button></li>`).join("")}</ul>`;
    }


    // ---------- pages ----------

    ratingChip(r) {
        return `<span class="eval-chip eval-${r.rating}">${escapeHtml(RATINGS[r.rating].label)}${r.priority ? ` · ${r.priority}` : ""}</span>`;
    }

    analysisForm(analysis) {
        const { model, analyses, editable } = this.state;
        const result = analyses.get(analysis.id);
        const id = escapeHtml(analysis.id);
        const stepper = [1, 2, 3, 4].map(n => {
            const p = result.progress[n];
            const count = result.findings.filter(f => f.step === n).length;
            return `<li class="fv-step${p.done ? " done" : ""}">
                <span class="fv-step-number">${p.done ? "✓" : n}</span>
                <div><strong>DTFA Step #${n}</strong> ${escapeHtml(STEP_NAMES[n])}<br><span class="fv-muted">${escapeHtml(p.text)}${count ? ` · ${count} open` : ""}</span></div></li>`;
        }).join("");
        const bottlenecks = result.bottlenecks.map(t => {
            const handovers = model.handoversRatedBy(t);
            return `<tr><td class="fv-prio">${t.priority ?? "–"}</td><td>${this.link(t.id)}</td>
                <td>${this.link(t.sourceId)} → ${this.link(t.targetId)}</td><td>${handovers.map(h => this.link(h.id)).join(", ") || '<span class="fv-muted">none</span>'}</td>
                <td>${model.measuresFor(t).map(m => this.link(m.id)).join(", ") || '<span class="fv-muted">none</span>'}</td></tr>`;
        }).join("");
        const kinds = [...result.kinds.values()];
        const axes = model.matrixAxes(analysis);
        const counts = `<dl class="fv-dl fv-counts">
            <dt>Roles</dt><dd>${axes.roles.length}</dd>
            <dt>Tools</dt><dd>${axes.tools.length}</dd>
            <dt>Process steps</dt><dd>${analysis.steps.length}</dd>
            <dt>Hand-overs</dt><dd>${analysis.handovers.length}: ${kinds.filter(k => k.toolBreak).length} tool breaks, ${kinds.filter(k => k.humanInterface).length} human interfaces</dd>
            <dt>Tool transitions</dt><dd>${analysis.transitions.length}</dd>
        </dl>`;
        const findings = [1, 2, 3, 4].map(n => {
            const list = result.findings.filter(f => f.step === n);
            return list.length ? `<h4>DTFA Step #${n}</h4>${this.findingsList(list)}` : "";
        }).join("");
        return this.header(analysis)
            + `<p class="fv-line">Digital Thread Flow Analysis of the MBSE environment ${analysis.environmentId ? this.link(analysis.environmentId) : '<span class="fv-muted">– (declare it in an environment)</span>'}
                ${analysis.environmentId ? '<button type="button" class="fv-link" data-view="environment">Open environment</button>' : ""}</p>`
            + `<ol class="fv-stepper">${stepper}</ol>`
            + counts
            + (editable ? `<div class="fv-buttons">
                <button type="button" data-command="addStep" data-id="${id}">+ Process step</button>
                <button type="button" data-command="addHandover" data-id="${id}">+ Hand-over</button>
                <button type="button" data-command="addTransition" data-id="${id}">+ Tool transition</button>
                <button type="button" data-command="addMeasure" data-id="${id}">+ Measure</button>
                <button type="button" data-view="matrix">Open matrix</button></div>` : "")
            + `<section class="fv-section"><h3>Bottlenecks by priority</h3>${bottlenecks
                ? `<div class="fv-matrix-wrap"><table class="fv-table"><thead><tr><th>Prio</th><th>Tool transition</th><th>Tools</th><th>Hand-overs</th><th>Measures</th></tr></thead><tbody>${bottlenecks}</tbody></table></div>`
                : '<p class="fv-muted">No bottlenecks yet. Rate the hand-overs in the matrix (DTFA Step #2).</p>'}</section>`
            + `<section class="fv-section"><h3>Findings</h3>${findings || '<p class="fv-muted">No findings: all four DTFA steps are complete.</p>'}
                <p class="fv-note">The findings come from the editor's evaluation of the method; the SysML engine checks the SysML (see Problems).</p></section>`
            + this.docSection(analysis);
    }

    /** A method as a process step of the analyses: role, tool, tool policy, step definition, hand-overs. */
    stepSections(method) {
        const { model, editable } = this.state;
        const uses = this.allSteps().filter(u => u.step.id === method.id);
        if (!uses.length) {
            const analyses = model.analyses.filter(a => a.environmentId && model.methodologyTree(a.environmentId).some(n => n.element.id === method.id));
            return analyses.length && editable ? `<section class="fv-section"><h3>Process step</h3><p class="fv-muted">No role performs ${escapeHtml(method.name)} with a tool yet.</p>
                <div class="fv-buttons">${analyses.map(a => `<button type="button" data-command="addStep" data-id="${escapeHtml(a.id)}">Perform it in ${escapeHtml(a.name)}</button>`).join("")}</div></section>` : "";
        }
        return uses.map(({ analysis, step }) => {
            const policy = model.policyStatus(analysis.environmentId, step.toolId, step.id);
            const handovers = model.handoversOf(analysis, step.id);
            const roles = model.inScope(model.roles, analysis.environmentId), tools = model.inScope(model.tools, analysis.environmentId);
            const select = (feature, options, current, label) => `<label class="fv-field"><span>${escapeHtml(label)}</span>
                <select data-step-place="${feature}" data-analysis="${escapeHtml(analysis.id)}" data-focus-key="place:${feature}" ${editable ? "" : "disabled"}>
                    <option value="">–</option>
                    ${options.map(o => `<option value="${escapeHtml(o.id)}"${o.id === current ? " selected" : ""}>${escapeHtml(o.name)}</option>`).join("")}
                </select>${current ? this.link(current) : ""}</label>`;
            const lanes = STEP_DEFINITION_LANES.map(lane => {
                const value = laneValue(method, lane.feature);
                const text = lane.kind === "text" ? escapeHtml(value || "–")
                    : lane.kind === "artifacts" ? (value.map(id => this.link(id)).join(", ") || "–")
                        : (value.map(v => escapeHtml(v)).join("; ") || "–");
                return `<dt>${escapeHtml(lane.label)}</dt><dd>${text}</dd>`;
            }).join("");
            const result = this.state.analyses.get(analysis.id);
            const findings = result ? result.findings.filter(f => f.id === step.id) : [];
            return `<section class="fv-section"><h3>Process step in ${this.link(analysis.id)} <span class="fv-muted">${escapeHtml(model.nameOf(analysis.environmentId))}</span></h3>
                <div class="fv-grid3">
                    ${select("primaryPerformer", roles, step.roleId, "Role (primary performer, row)")}
                    ${select("facilitationTools", tools, step.toolId, "Tool (facilitation tool, column)")}
                </div>
                ${policy ? `<p class="fv-line">Tool policy: <span class="pv-chip status-${policy.status}">${POLICY_STATUS[policy.status].label}</span>
                    ${escapeHtml(model.nameOf(step.toolId))} for ${escapeHtml(method.name)} (${this.link(policy.rule.id)})</p>`
                    : step.toolId ? `<p class="fv-line fv-muted">The tool policy has no rule for ${escapeHtml(model.nameOf(step.toolId))} with ${escapeHtml(method.name)}.</p>` : ""}
                ${findings.length ? this.findingsList(findings) : ""}
                <h4>Step definition <button type="button" class="fv-link" data-view="steps">Open diagram</button></h4>
                <dl class="fv-dl">${lanes}</dl>
                <h4>Hand-overs</h4>${handovers.length ? `<ul class="fv-list">${handovers.map(h => `<li>${this.link(h.id)}
                    <span class="fv-muted">${h.productIds.map(p => escapeHtml(model.nameOf(p))).join(", ")}</span> ${this.ratingChip(h)}</li>`).join("")}</ul>` : '<p class="fv-muted">No hand-overs: no other step needs a product of this step, or produces one that it needs.</p>'}
                ${editable ? `<div class="fv-buttons"><button type="button" data-command="addHandover" data-id="${escapeHtml(step.id)}">+ Hand-over from ${escapeHtml(method.name)}</button></div>` : ""}
            </section>`;
        }).join("");
    }

    handoverForm(h) {
        const { model, analyses, editable } = this.state;
        const analysis = model.get(h.analysisId);
        const result = analyses.get(h.analysisId);
        const kind = result ? result.kinds.get(h.id) : null;
        const source = analysis.stepOf(h.sourceId), target = analysis.stepOf(h.targetId);
        const side = (step, label) => step ? `<div class="fv-side"><span class="fv-muted">${label}</span>${this.link(step.id)}
            <span class="fv-muted">${escapeHtml(model.nameOf(step.roleId))} · ${escapeHtml(model.nameOf(step.toolId))}</span></div>` : `<div class="fv-side fv-muted">unknown</div>`;
        const t = h.transition;
        return `<header class="fv-header"><span class="fv-kind">Hand-over</span><h2 class="fv-title">${escapeHtml(h.name)}</h2>
                <span class="fv-source fv-muted">derived: outputs of ${escapeHtml(source ? source.name : "")} that are inputs of ${escapeHtml(target ? target.name : "")}</span></header>`
            + `<div class="fv-handover">${side(source, "hands over")}<span class="fv-arrow" aria-hidden="true">→</span>${side(target, "takes over")}</div>`
            + `<p class="fv-line">Products handed over: ${h.productIds.map(id => this.link(id)).join(", ")}</p>`
            + (kind && kind.known ? `<p class="fv-line">Kind: <strong>${escapeHtml(kind.label)}</strong>${kind.toolBreak ? " — the tool changes (column transition)" : ""}${kind.humanInterface ? `${kind.toolBreak ? ";" : " —"} the role changes (row transition)` : ""}.</p>` : "")
            + this.ratingFieldset(h, t ? `Rates the tool transition ${this.link(t.id)} (${escapeHtml(model.nameOf(t.sourceId))} → ${escapeHtml(model.nameOf(t.targetId))}), which also rates ${model.handoversRatedBy(t).length - 1} other hand-over(s).`
                : `No tool transition rates it yet: rating it creates the tool transition ${escapeHtml(model.nameOf(source && source.toolId))} → ${escapeHtml(model.nameOf(target && target.toolId))} in ${this.link(analysis.id)}.`)
            + (t ? `<section class="fv-section"><h3>Conversions</h3>${t.conversions.length ? `<ul class="fv-list">${t.conversions.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>` : '<p class="fv-muted">None.</p>'}
                ${editable ? `<div class="fv-buttons"><button type="button" data-command="editConversions" data-id="${escapeHtml(t.id)}">Edit conversions</button></div>` : ""}</section>
                <section class="fv-section"><h3>Measures that address it</h3>${this.chips(model.measuresFor(t).map(m => m.id), "No measures.")}
                ${editable ? `<div class="fv-buttons"><button type="button" data-command="addMeasure" data-id="${escapeHtml(t.id)}">+ Measure</button></div>` : ""}</section>` : "")
            + `<p class="fv-line"><button type="button" class="fv-link" data-view="steps">Open step definitions</button></p>`
            + (editable ? `<section class="fv-section fv-danger"><button type="button" data-command="delete" data-id="${escapeHtml(h.id)}">Remove the hand-over (the products from the inputs of ${escapeHtml(target ? target.name : "")})</button></section>` : "");
    }

    /** The rating of a hand-over or tool transition: rating, priority, explanation. */
    ratingFieldset(r, note) {
        const { editable } = this.state;
        const ratings = Object.entries(RATINGS).map(([value, e]) => `<label class="fv-radio"><input type="radio" name="evaluation" value="${value}" data-focus-key="eval:${value}"
            ${r.rating === value ? "checked" : ""} ${editable ? "" : "disabled"}><span class="eval-chip eval-${value}">${escapeHtml(e.label)}</span></label>`).join("");
        return `<fieldset class="fv-section"><legend>Rating (DTFA Step #2)</legend><p class="fv-muted">${note}</p><div class="fv-kinds">${ratings}</div>
                ${r.isBottleneck ? `<label class="fv-field fv-inline"><span>Priority</span><input type="number" min="1" step="1" data-priority data-focus-key="priority" value="${r.priority ?? ""}" ${editable ? "" : "disabled"}>
                    <span class="fv-muted">1 is the highest priority</span></label>` : ""}
                <label class="fv-field"><span>Explanation</span>
                    <textarea class="fv-doc" data-explanation-input data-focus-key="explanation" data-original="${escapeHtml(r.explanation)}" rows="2"
                        placeholder="Why is the transition ${r.rating === "unrated" ? "rated so" : RATINGS[r.rating].label.toLowerCase()}? E.g. the data is copied manually." ${editable ? "" : "disabled"}>${escapeHtml(r.explanation)}</textarea></label>
                ${editable ? `<div class="fv-buttons"><button type="button" data-save-explanation data-id="${escapeHtml(r.id)}" disabled>Save explanation</button></div>` : ""}</fieldset>`;
    }

    transitionForm(t) {
        const { model, editable } = this.state;
        const handovers = model.handoversRatedBy(t);
        return this.header(t)
            + `<p class="fv-line">Tool transition of ${this.link(t.analysisId)}: ${this.link(t.sourceId)} → ${this.link(t.targetId)}${t.productIds.length ? ` for ${t.productIds.map(id => this.link(id)).join(", ")}` : " (all products)"}</p>`
            + this.ratingFieldset(t, `Rates ${handovers.length} hand-over(s) from ${escapeHtml(model.nameOf(t.sourceId))} to ${escapeHtml(model.nameOf(t.targetId))}.`)
            + `<section class="fv-section"><h3>Hand-overs</h3>${handovers.length ? `<ul class="fv-list">${handovers.map(h => `<li>${this.link(h.id)} <span class="fv-muted">${h.productIds.map(p => escapeHtml(model.nameOf(p))).join(", ")}</span></li>`).join("")}</ul>` : '<p class="fv-muted">No hand-over flows between the two tools.</p>'}</section>`
            + `<section class="fv-section"><h3>Conversions</h3>${t.conversions.length ? `<ul class="fv-list">${t.conversions.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>` : '<p class="fv-muted">None.</p>'}
                ${editable ? `<div class="fv-buttons"><button type="button" data-command="editConversions" data-id="${escapeHtml(t.id)}">Edit conversions</button></div>` : ""}</section>`
            + `<section class="fv-section"><h3>Measures that address it</h3>${this.chips(model.measuresFor(t).map(m => m.id), "No measures.")}
                ${editable ? `<div class="fv-buttons"><button type="button" data-command="addMeasure" data-id="${escapeHtml(t.id)}">+ Measure</button></div>` : ""}</section>`
            + this.docSection(t)
            + this.deleteButton(t, "Delete tool transition");
    }

    measureForm(measure) {
        const { model, editable } = this.state;
        const analysis = model.get(measure.analysisId);
        const transitions = analysis ? analysis.transitions : [];
        const boxes = transitions.map(t => `<label class="fv-check"><input type="checkbox" data-addressed="${escapeHtml(t.id)}" data-focus-key="addr:${escapeHtml(t.id)}"
            ${measure.addressedTransitionIds.includes(t.id) ? "checked" : ""} ${editable ? "" : "disabled"}>
            ${escapeHtml(t.name)} <span class="fv-muted">${escapeHtml(model.nameOf(t.sourceId))} → ${escapeHtml(model.nameOf(t.targetId))}</span> ${this.ratingChip(t)}</label>`).join("");
        return this.header(measure)
            + `<p class="fv-line">Measure of ${this.link(measure.analysisId)} (DTFA Step #4).</p>`
            + this.docSection(measure)
            + `<section class="fv-section"><h3>Addressed tool transitions</h3><div class="fv-checks">${boxes || '<p class="fv-muted">No tool transitions.</p>'}</div></section>`
            + this.deleteButton(measure, "Delete measure");
    }

    ruleForm(rule) {
        const { model, editable } = this.state;
        const status = Object.entries(POLICY_STATUS).map(([value, s]) => `<label class="fv-radio"><input type="radio" name="status" value="${value}" data-focus-key="status:${value}"
            ${rule.status === value ? "checked" : ""} ${editable ? "" : "disabled"}><span class="pv-chip status-${value}">${escapeHtml(s.label)}</span></label>`).join("");
        const users = this.allSteps().filter(({ step }) => step.toolId === rule.toolId || model.get(step.toolId)?.redefinedIds.includes(rule.toolId))
            .filter(({ step }) => step.id === rule.methodId || step.method.redefinedIds.includes(rule.methodId)).map(u => u.step.id);
        return this.header(rule)
            + `<p class="fv-line">Tool policy rule of ${this.link(rule.environmentId)}: ${this.link(rule.toolId)} for ${this.link(rule.methodId)}
                <span class="fv-muted">(a facilitates connection with a status)</span> <button type="button" class="fv-link" data-view="policy">Open tool policy</button></p>`
            + `<fieldset class="fv-section"><legend>Status</legend><div class="fv-kinds">${status}</div></fieldset>`
            + `<section class="fv-section"><h3>Process steps with this combination</h3>${this.chips([...new Set(users)], "None.")}</section>`
            + this.docSection(rule, "Rationale")
            + this.deleteButton(rule, "Delete rule");
    }

    /** The MBSE environment that declares an element of an environment, and the environments that inherit it. */
    environmentLine(element) {
        const { model } = this.state;
        if (element.external || element.library) return `<p class="fv-line fv-muted">Declared in the library ${escapeHtml(element.document || "")}; read-only here. Specialize it to change it.</p>`;
        if (!element.environmentId) return "";
        const heirs = model.environments.filter(e => e.id !== element.environmentId && model.environmentScope(e.id).includes(element.environmentId));
        return `<p class="fv-line">${escapeHtml(element.kindLabel)} of the MBSE environment ${this.link(element.environmentId)}${heirs.length
            ? `, inherited by ${heirs.map(e => this.link(e.id)).join(", ")}` : ""}.</p>`;
    }

    /** The role editor: the process steps of the role (its row of the matrix), its tools and its human interfaces. */
    roleSections(role) {
        const { model, analyses } = this.state;
        const rows = [], interfaces = [], tools = new Set();
        for (const analysis of model.analyses) {
            const steps = analysis.steps.filter(s => s.roleId === role.id);
            const result = analyses.get(analysis.id);
            for (const step of steps) {
                if (step.toolId) tools.add(step.toolId);
                rows.push(`<tr><td>${this.link(step.id)}</td><td>${this.link(step.toolId)}</td><td>${step.targetArtifactIds.map(id => this.link(id)).join(", ") || "–"}</td><td>${this.link(analysis.id)}</td></tr>`);
            }
            // Human interfaces: hand-overs between a step of the role and a step of another role.
            for (const h of analysis.handovers) {
                const source = analysis.stepOf(h.sourceId), target = analysis.stepOf(h.targetId);
                if (!source || !target) continue;
                const own = source.roleId === role.id, other = own ? target : source;
                if ((own || target.roleId === role.id) && other.roleId !== role.id) {
                    const kind = result && result.kinds.get(h.id);
                    interfaces.push(`<li>${this.link(h.id)} <span class="fv-muted">${own ? "hands over to" : "takes over from"}</span>
                        ${this.link(other.roleId, "a step without role")} <span class="fv-muted">(${h.productIds.map(p => escapeHtml(model.nameOf(p))).join(", ")}${kind && kind.toolBreak ? ", also a tool break" : ""})</span>
                        ${this.ratingChip(h)}</li>`);
                }
            }
        }
        return `<section class="fv-section"><h3>Process steps <span class="fv-muted">the row of the role in the matrix</span>
                ${rows.length ? '<button type="button" class="fv-link" data-view="matrix">Open matrix</button>' : ""}</h3>
                ${rows.length ? `<div class="fv-matrix-wrap"><table class="fv-table"><thead><tr><th>Method</th><th>Tool</th><th>Produces</th><th>Flow analysis</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`
                    : '<p class="fv-muted">The role performs no process step yet.</p>'}</section>
            <section class="fv-section"><h3>Tools of the role</h3>${this.chips([...tools], "None.")}</section>
            <section class="fv-section"><h3>Human interfaces <span class="fv-muted">hand-overs to and from other roles</span></h3>
                ${interfaces.length ? `<ul class="fv-list">${interfaces.join("")}</ul>` : '<p class="fv-muted">None.</p>'}</section>`;
    }

    basicForm(element) {
        const { model } = this.state;
        const steps = this.allSteps().map(u => u.step);
        let usage = "";
        if (element instanceof Role) {
            return this.header(element) + this.environmentLine(element) + this.typesLine(element) + this.docSection(element)
                + this.methodologySection(element, false) + this.roleSections(element) + this.specializedBySection(element) + this.deleteButton(element);
        } else if (element instanceof Method) {
            const rules = model.rules.filter(r => r.methodId === element.id || element.redefinedIds.includes(r.methodId));
            return this.header(element) + this.environmentLine(element) + this.typesLine(element) + this.docSection(element)
                + this.stepSections(element) + this.performersSection(element) + this.behaviorStructureSection(element)
                + `<section class="fv-section"><h3>Tool policy rules</h3>${this.chips(rules.map(r => r.id), "None.")}</section>`
                + this.deleteButton(element);
        } else if (element instanceof Tool) {
            const rules = model.rules.filter(r => r.toolId === element.id || element.redefinedIds.includes(r.toolId));
            usage = `<section class="fv-section"><h3>Process steps</h3>${this.chips([...new Set(steps.filter(s => s.toolId === element.id).map(s => s.id))], "None.")}</section>
                <section class="fv-section"><h3>Tool policy rules</h3>${this.chips(rules.map(r => r.id), "None.")}</section>`
                + this.methodologySection(element, true);
        } else if (element instanceof MBSEEnvironment) {
            const rules = model.rulesOf(element.id);
            usage = `<p class="fv-line">${element.generalIds.length ? `Specializes ${element.generalIds.map(g => this.link(g, g.split("::").pop())).join(", ")}. ` : ""}
                    <button type="button" class="fv-link" data-view="environment">Open environment view</button></p>
                <dl class="fv-dl fv-counts">
                    <dt>Roles</dt><dd>${model.inScope(model.roles, element.id).length}</dd>
                    <dt>Tools</dt><dd>${model.inScope(model.tools, element.id).length}</dd>
                    <dt>Methods</dt><dd>${model.inScope(model.methods, element.id).length}</dd>
                    <dt>Products</dt><dd>${model.productsOf(element.id).length}</dd></dl>
                <section class="fv-section"><h3>Flow analyses</h3>${this.chips(element.analyses.map(a => a.id), "None.")}
                    ${this.state.editable ? `<div class="fv-buttons"><button type="button" data-command="addAnalysis" data-id="${escapeHtml(element.id)}">+ Flow analysis</button></div>` : ""}</section>
                <section class="fv-section"><h3>Tool policy</h3><p class="fv-line">${element.rules.length} rules of this environment${rules.length > element.rules.length ? `, ${rules.length - element.rules.length} inherited` : ""}.
                    <button type="button" class="fv-link" data-view="policy">Open tool policy</button></p>${this.chips(element.rules.map(r => r.id), "")}</section>`;
            return this.header(element) + usage + this.docSection(element);
        } else if (element instanceof Artifact) {
            const produced = [...new Set(steps.filter(s => s.targetArtifactIds.includes(element.id)).map(s => s.id))];
            const needed = [...new Set(steps.filter(s => s.sourceArtifactIds.includes(element.id)).map(s => s.id))];
            // The processes and methods that declare the product as output or input parameter, e.g. the ISO 15288 processes.
            const parameterOf = list => [...model.elements.values()].filter(b => (b instanceof Process || b instanceof Method)
                && (b[list] || []).some(f => f.typeIds.includes(element.id))).map(b => b.id);
            const outputOf = parameterOf("outputFeatures"), inputOf = parameterOf("inputFeatures");
            usage = (outputOf.length || inputOf.length ? `<section class="fv-section"><h3>Output of</h3>${this.chips(outputOf, "No process or method.")}</section>
                <section class="fv-section"><h3>Input of</h3>${this.chips(inputOf, "No process or method.")}</section>` : "")
                + (produced.length || needed.length || !(outputOf.length || inputOf.length) ? `<section class="fv-section"><h3>Produced by</h3>${this.chips(produced, "No process step.")}</section>
                <section class="fv-section"><h3>Needed by</h3>${this.chips(needed, "No process step.")}</section>` : "");
        }
        if (element instanceof Process) usage = this.performersSection(element) + this.behaviorStructureSection(element);
        if (element instanceof Tool || element instanceof Artifact) usage += this.specializedBySection(element);
        return this.header(element) + this.environmentLine(element) + this.typesLine(element) + this.docSection(element) + usage + this.deleteButton(element);
    }

    // ---------- document editor ----------

    /**
     * The editor of a document: its MBSE environments, flow analyses and methodology elements (processes, methods,
     * roles, tools, products, also as definitions, e.g. the processes of ISO15288Processes), grouped by kind.
     */
    documentForm(name) {
        const { model } = this.state;
        const inDocument = e => e.document === name;
        const isBehavior = e => e instanceof Process || e instanceof Method;
        // Top-level elements: not nested in a registered behavior or environment of the document.
        const top = list => list.filter(e => inDocument(e) && !(model.get(e.ownerId) && (isBehavior(model.get(e.ownerId)) || model.get(e.ownerId) instanceof MBSEEnvironment)));
        const description = e => e.doc ? `<div class="fv-clamp" title="${escapeHtml(e.doc)}">${escapeHtml(e.doc)}</div>`
            : e.inheritedDoc ? `<div class="fv-clamp fv-inherited-text" title="Inherited from ${escapeHtml(e.inheritedDoc.fromName)}">${escapeHtml(e.inheritedDoc.text)}</div>` : "";
        const packageOf = e => e.id.split("::").slice(0, -1).join("::");
        const table = (title, list, columns = []) => list.length ? `<section class="fv-section" data-section="${escapeHtml(title)}"><h3>${title} <span class="fv-count">${list.length}</span></h3>
            <div class="fv-matrix-wrap"><table class="fv-table fv-collection"><thead><tr><th>Name</th><th>Specializes</th>${columns.map(c => `<th>${c.label}</th>`).join("")}<th>Description</th></tr></thead>
            <tbody>${list.map(e => `<tr><td>${this.link(e.id)}${packageOf(e).includes("::") ? `<div class="fv-muted fv-origin">${escapeHtml(packageOf(e).split("::").slice(1).join("::"))}</div>` : ""}</td>
                <td>${(e.typeIds || []).slice(0, 3).map(id => this.generalLink(id)).join(", ")}</td>${columns.map(c => `<td>${c.value(e)}</td>`).join("")}
                <td class="fv-desc">${description(e)}</td></tr>`).join("")}</tbody></table></div></section>` : "";
        const behaviors = top([...model.elements.values()].filter(isBehavior));
        const subs = e => this.subBehaviors(e).length || "";
        const performers = e => e.slots.filter(s => s.kind !== "tool").map(s => escapeHtml(this.slotLabel(s))).join(", ");
        const groups = [
            table("MBSE environments", top(model.environments)),
            table("Flow analyses", model.analyses.filter(inDocument)),
            table("Processes", behaviors.filter(e => e instanceof Process), [{ label: "Steps", value: subs }, { label: "Performers", value: performers }]),
            table("Methods", behaviors.filter(e => e instanceof Method), [{ label: "Steps", value: subs }, { label: "Performers", value: performers }]),
            table("Roles", top(model.roles)),
            table("Tools", top(model.tools)),
            table("Products", top(model.artifacts)),
            table("Tool policy rules", model.rules.filter(inDocument)),
        ].filter(Boolean);
        const sections = groups.join("");
        // Jump links to the sections, e.g. from the processes to the products of a library.
        const jump = groups.length > 1 ? `<nav class="fv-jump" aria-label="Sections">${groups.map(g => {
            const title = g.match(/data-section="([^"]*)"/)[1], count = g.match(/fv-count">(\d+)/)[1];
            return `<button type="button" class="fv-link fv-chip" data-jump="${title}">${title} <span class="fv-muted">${count}</span></button>`;
        }).join("")}</nav>` : "";
        return `<header class="fv-header"><span class="fv-kind">Document</span><h2 class="fv-title">${escapeHtml(name)}</h2>
                <span class="fv-source"><button type="button" class="fv-link" data-view="text">Show text</button></span></header>
            ${[...model.elements.values()].some(e => e.library && inDocument(e)) ? '<p class="fv-line fv-muted">A library: read-only. Specialize its elements in your own documents.</p>' : ""}
            ${jump}${sections || '<p class="fv-muted">The document declares no MBSE environment, flow analysis, process, method, role, tool or product. Show its text to see its content.</p>'}`;
    }

    /** The processes and methods of a behavior: owned and inherited (e.g. the steps of a library process). */
    subBehaviors(behavior) {
        const { model } = this.state;
        const isBehavior = e => e instanceof Process || e instanceof Method;
        const owned = [...model.elements.values()].filter(c => c.ownerId === behavior.id && isBehavior(c));
        const redefined = new Set(owned.flatMap(c => c.redefinedIds));
        return [...owned, ...behavior.inheritedIds.map(id => model.get(id)).filter(c => isBehavior(c) && !redefined.has(c.id))];
    }

    /** A performer or tool slot as text, e.g. "projectManager : ProjectManager". */
    slotLabel(slot) {
        const { model } = this.state;
        const name = model.get(slot.slotId) ? model.nameOf(slot.slotId) : slot.slotId.includes("<") ? "" : slot.slotId.split("::").pop();
        const types = slot.valueIds.length ? slot.valueIds.map(id => model.nameOf(id, id.split("::").pop())) : slot.typeIds.slice(0, 1).map(t => (model.generals[t] && model.generals[t].name) || t.split("::").pop());
        return [name, types.join(", ")].filter(Boolean).join(" : ");
    }

    /**
     * The structure of a process or method as its declaration states it, e.g. of a process definition of a library:
     * its steps (owned and inherited), its declared performers and tools, and its inputs and outputs.
     */
    behaviorStructureSection(behavior) {
        const { model } = this.state;
        const steps = this.subBehaviors(behavior);
        const kinds = { primary: "Responsible", additional: "Supporting", tool: "Tools" };
        const slots = Object.entries(kinds).map(([kind, label]) => [label, behavior.slots.filter(s => s.kind === kind)]).filter(([, list]) => list.length);
        // A parameter with a link to its product, e.g. "systemRequirements : SystemRequirements".
        const param = p => `<li${p.doc ? ` title="${escapeHtml(p.doc)}"` : ""}>${escapeHtml(p.name)}${p.typeIds.length ? ` <span class="fv-muted">:</span> ${p.typeIds.slice(0, 1).map(t => this.generalLink(t)).join(", ")}` : ""}${p.inherited ? ' <span class="fv-muted">(inherited)</span>' : ""}</li>`;
        const parts = [];
        if (steps.length) parts.push(`<dt>Steps</dt><dd>${this.chips(steps.map(s => s.id), "")}</dd>`);
        for (const [label, list] of slots) parts.push(`<dt>${label}</dt><dd>${list.map(s => escapeHtml(this.slotLabel(s))).join(", ")}</dd>`);
        if (behavior.inputFeatures && behavior.inputFeatures.length) parts.push(`<dt>Inputs</dt><dd><ul class="fv-list">${behavior.inputFeatures.map(param).join("")}</ul></dd>`);
        if (behavior.outputFeatures && behavior.outputFeatures.length) parts.push(`<dt>Outputs</dt><dd><ul class="fv-list">${behavior.outputFeatures.map(param).join("")}</ul></dd>`);
        const specializedBy = [...model.elements.values()].filter(e => e !== behavior && (e.typeIds.includes(behavior.id) || e.redefinedIds.includes(behavior.id)));
        if (specializedBy.length) parts.push(`<dt>Specialized by</dt><dd>${this.chips(specializedBy.map(e => e.id), "")}</dd>`);
        if (!parts.length) return "";
        return `<section class="fv-section"><h3>${behavior instanceof Process ? "Process" : "Method"} <span class="fv-muted">as declared${behavior.isDefinition ? " by the definition" : ""}</span>
                ${steps.length ? '<button type="button" class="fv-link" data-view="process">Open diagram</button>' : ""}</h3>
            <dl class="fv-dl">${parts.join("")}</dl></section>`;
    }

    /** The elements that specialize a definition, e.g. the roles typed by a role definition. */
    specializedBySection(element) {
        const { model } = this.state;
        const users = [...model.elements.values()].filter(e => e !== element && e.typeIds.includes(element.id));
        return users.length ? `<section class="fv-section"><h3>Specialized by</h3>${this.chips(users.map(e => e.id), "")}</section>` : "";
    }

    // ---------- collection editors ----------

    /**
     * The editor of a collection of an MBSE environment: its roles, tools, methods (the methodology) or products, own and
     * inherited from the environments it specializes and from libraries, with the command to create a new one.
     */
    collectionForm(environment, kind) {
        const { model } = this.state;
        const spec = COLLECTIONS[kind] || COLLECTIONS.roles;
        const steps = model.analyses.filter(c => c.environmentId && (model.environmentScope(c.environmentId).includes(environment.id)
            || model.environmentScope(environment.id).includes(c.environmentId))).flatMap(c => c.steps);
        // Inherited elements name their origin below their name: a general environment or a library.
        const origin = e => e.environmentId === environment.id ? ""
            : `<div class="fv-muted fv-origin">from ${e.environmentId && model.get(e.environmentId) ? this.link(e.environmentId)
                : escapeHtml(e.library ? `library ${e.document}` : e.document || "–")}</div>`;
        // The first lines of the description; the full text is the tooltip.
        const description = e => e.doc ? `<div class="fv-clamp" title="${escapeHtml(e.doc)}">${escapeHtml(e.doc)}</div>`
            : e.inheritedDoc ? `<div class="fv-clamp fv-inherited-text" title="Inherited from ${escapeHtml(e.inheritedDoc.fromName)}:\n${escapeHtml(e.inheritedDoc.text)}">${escapeHtml(e.inheritedDoc.text)}</div>` : "";
        const types = e => (e.typeIds || []).map(id => this.generalLink(id)).join(", ");
        const used = (e, key) => {
            const n = steps.filter(s => s[key] === e.id || (Array.isArray(s[key]) && s[key].includes(e.id))).length;
            return n ? String(n) : "";
        };
        let head, rows, count;
        if (kind === "methods") {
            const tree = model.methodologyTree(environment.id);
            count = tree.length;
            const performers = (e, kinds) => model.performersOf(e, environment.id, kinds).map(r => this.link(r.id)).join(", ");
            head = ["Process / method", "Responsible", "Supporting", "Tools", "Steps", "Description"];
            rows = tree.map(({ element: e, depth, inherited }) => `<tr${inherited ? ' class="fv-inherited"' : ""}>
                <td style="padding-left:${8 + depth * 18}px">${this.link(e.id)}${e instanceof Process ? ' <span class="fv-muted">process</span>' : ""}${inherited ? origin(e) : ""}</td>
                <td>${performers(e, ["primary"])}</td><td>${performers(e, ["additional"])}</td><td>${performers(e, ["tool"])}</td>
                <td>${used(e, "id")}</td><td class="fv-desc">${description(e)}</td></tr>`);
        } else {
            const list = kind === "products" ? model.productsOf(environment.id) : model.inScope(model[spec.list], environment.id);
            count = list.length;
            const extra = kind === "roles"
                ? e => { const tree = model.methodologyTree(environment.id);
                    return tree.filter(n => model.performersOf(n.element, environment.id).includes(e)).length || ""; }
                : kind === "tools"
                    ? e => model.methodologyTree(environment.id).filter(n => model.performersOf(n.element, environment.id, ["tool"]).includes(e)).length || ""
                    : null;
            // A product: how many steps (parameters and process steps of the analyses) produce and need it.
            const tree = model.methodologyTree(environment.id).map(n => n.element);
            const productUse = e => {
                const out = tree.filter(b => model.parameterProductIds(b, "outputFeatures").includes(e.id)).length + Number(used(e, "targetArtifactIds") || 0);
                const inp = tree.filter(b => model.parameterProductIds(b, "inputFeatures").includes(e.id)).length + Number(used(e, "sourceArtifactIds") || 0);
                return [out && `produced by ${out}`, inp && `needed by ${inp}`].filter(Boolean).join(", ");
            };
            head = ["Name", "Specializes", ...(extra ? [kind === "roles" ? "Methods" : "Facilitates"] : []), kind === "products" ? "Methods" : spec.usedLabel, "Description"];
            rows = list.map(e => `<tr${e.environmentId !== environment.id ? ' class="fv-inherited"' : ""}>
                <td>${this.link(e.id)}${origin(e)}</td><td>${types(e)}</td>${extra ? `<td>${extra(e)}</td>` : ""}
                <td>${kind === "products" ? productUse(e) : used(e, spec.stepKey)}</td>
                <td class="fv-desc">${description(e)}</td></tr>`);
        }
        const others = Object.entries(COLLECTIONS).filter(([k]) => k !== kind)
            .map(([k, c]) => `<button type="button" class="fv-link" data-collection="${k}" data-id="${escapeHtml(environment.id)}">${c.title}</button>`).join(" · ");
        return `<nav class="fv-crumbs" aria-label="Location"><button type="button" class="fv-link" data-select="${escapeHtml(environment.id)}">${escapeHtml(environment.name)}</button>
                <span class="fv-sep">›</span><span aria-current="page">${spec.title}</span></nav>
            <header class="fv-header"><span class="fv-kind">${spec.title}</span><h2 class="fv-title">${spec.title} of ${escapeHtml(environment.name)}</h2>
                <span class="ev-modes" role="group" aria-label="Show the ${escapeHtml(spec.title.toLowerCase())} as">
                    <button type="button" data-collection="${kind}" data-id="${escapeHtml(environment.id)}" aria-pressed="false" title="List and diagram of the ${escapeHtml(spec.title.toLowerCase())}">Diagram</button>
                    <button type="button" class="active" aria-pressed="true">Table</button>
                </span>
                <span class="fv-source">${others}</span></header>
            <p class="fv-line fv-muted">${spec.hint} Including the ${spec.title.toLowerCase()} inherited from the environments that ${escapeHtml(environment.name)} specializes and from libraries (shaded).</p>
            ${this.state.editable ? `<div class="fv-buttons fv-collection-add"><button type="button" data-command="${spec.command}" data-id="${escapeHtml(environment.id)}">${spec.add}</button></div>` : ""}
            <section class="fv-section"><h3>${spec.title} <span class="fv-count">${count}</span></h3>
                ${rows.length ? `<div class="fv-matrix-wrap"><table class="fv-table fv-collection"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
                    : `<p class="fv-muted">No ${spec.title.toLowerCase()} yet.</p>`}</section>`;
    }

    // ---------- events ----------

    emit(command, id, args = {}) {
        this.dispatchEvent(new CustomEvent("command", { detail: { command, id, args } }));
    }

    onClick(e) {
        const collection = e.target.closest("[data-collection]");
        if (collection) {
            this.dispatchEvent(new CustomEvent("select", { detail: { id: collection.dataset.id, open: true, collection: collection.dataset.collection } }));
            return;
        }
        const command = e.target.closest("[data-command]");
        if (command) { this.emit(command.dataset.command, command.dataset.id); return; }
        if (e.target.closest("[data-rename]")) { this.rename(this.root.querySelector("[data-rename-input]")); return; }
        const saveExplanation = e.target.closest("[data-save-explanation]");
        if (saveExplanation) { this.emit("setExplanation", saveExplanation.dataset.id, { text: this.root.querySelector("[data-explanation-input]").value }); return; }
        const saveDoc = e.target.closest("[data-save-doc]");
        if (saveDoc) { this.emit("setDoc", saveDoc.dataset.id, { text: this.root.querySelector("[data-doc-input]").value.trim() }); return; }
        const jump = e.target.closest("[data-jump]");
        if (jump) { this.scrollToSection(jump.dataset.jump); return; }
        const view = e.target.closest("[data-view]");
        if (view) { this.dispatchEvent(new CustomEvent("view", { detail: { view: view.dataset.view } })); return; }
        const reveal = e.target.closest("[data-reveal]");
        if (reveal) { this.dispatchEvent(new CustomEvent("reveal", { detail: { id: reveal.dataset.reveal } })); return; }
        const select = e.target.closest("[data-select]");
        // A link opens the editor of the element, e.g. the role editor (see App.openElement).
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select, open: select.classList.contains("fv-link") } }));
    }

    /** Scrolls the document form to a section, e.g. "Products". */
    scrollToSection(title) {
        const section = this.root.querySelector(`[data-section="${CSS.escape(title)}"]`);
        if (section) section.scrollIntoView({ block: "start", behavior: "smooth" });
    }

    onChange(e) {
        const target = e.target;
        const selectedId = this.state.selectedId || (this.root.querySelector("[data-reveal]") || {}).dataset?.reveal;
        if (target.matches("[data-step-place]")) {
            this.emit("placeStep", selectedId, { analysisId: target.dataset.analysis, feature: target.dataset.stepPlace, targetId: target.value || null });
        } else if (target.name === "evaluation" && target.checked) {
            this.emit("setRating", selectedId, { rating: target.value });
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
