// Editor of the EEE Process Step Definition Diagram (EEE Steps #3 and #4).
//
// The swimlanes of the diagram are rows: goal, source artifacts, viewpoints, automation steps, target artifacts and
// artifact conversions. For a selected process step, the diagram has one column. For a selected transition, it
// shows the step that hands over and the step that takes over side by side, and marks the artifacts that the
// transition hands over: produced by the first step and needed by the second one.
// Below the swimlanes are the measures that optimize the steps (EEE Step #4).
//
// Events: "select" { id }, "command" { command, id, args }

import { ProcessStep, StepTransition, Measure, STEP_DEFINITION_LANES, EVALUATIONS } from "../eee/model.js";

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export class StepDefinitionView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("sd-view");
        this.state = null;
        this.stepId = null;
        this.root.addEventListener("click", e => this.onClick(e));
        this.root.addEventListener("change", e => {
            if (e.target.matches(".sd-step-select") && e.target.value) this.dispatchEvent(new CustomEvent("select", { detail: { id: e.target.value } }));
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
        const selected = model.get(state.selectedId);
        let steps = [], transition = null;
        if (selected instanceof StepTransition) {
            transition = selected;
            steps = [model.get(selected.sourceId), model.get(selected.targetId)].filter(s => s instanceof ProcessStep);
        } else if (selected instanceof ProcessStep) {
            steps = [selected];
        } else if (selected instanceof Measure && model.get(selected.stepId)) {
            steps = [model.get(selected.stepId)];
        }
        if (!steps.length) {
            const remembered = model.get(this.stepId);
            const check = (selected && model.checkOf(selected.id)) || model.checks[0];
            const analysis = check && state.analyses ? state.analyses.get(check.id) : null;
            const firstBottleneck = analysis && analysis.bottlenecks[0] ? model.get(analysis.bottlenecks[0].targetId) : null;
            const fallback = remembered instanceof ProcessStep ? remembered : firstBottleneck || (check && check.steps[0]);
            if (fallback) steps = [fallback];
        }
        if (steps.length === 1) this.stepId = steps[0].id;

        const options = model.checks.map(c => `<optgroup label="${escapeHtml(c.name)}">${c.steps.map(s =>
            `<option value="${escapeHtml(s.id)}"${steps.length === 1 && steps[0] === s ? " selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}</optgroup>`).join("");
        const toolbar = `<div class="dg-toolbar sd-toolbar">
            <label class="dg-field">Process step <select class="sd-step-select">${steps.length === 1 ? "" : '<option value="">–</option>'}${options}</select></label>
            ${transition ? `<span class="sd-transition">Transition <button type="button" class="fv-link" data-select="${escapeHtml(transition.id)}">${escapeHtml(transition.name)}</button>
                <span class="eval-chip eval-${transition.evaluation}">${escapeHtml(EVALUATIONS[transition.evaluation].label)}${transition.priority ? ` · priority ${transition.priority}` : ""}</span></span>` : ""}
            <span class="dg-spacer"></span>
            <span class="dg-status">EEE Process Step Definition Diagram</span>
        </div>`;
        if (!steps.length) {
            this.root.innerHTML = toolbar + `<div class="fv-empty"><p>No process step yet.</p><p>Add process steps in the <strong>Matrix</strong> view.</p></div>`;
            return;
        }
        this.root.innerHTML = toolbar + `<div class="sd-scroll">${this.diagram(steps, transition)}${this.measures(steps)}</div>`;
    }

    diagram(steps, transition) {
        const { model, editable } = this.state;
        const [first, second] = steps;
        const handedOver = new Set(second ? first.targetArtifactIds.filter(id => second.sourceArtifactIds.includes(id)) : []);
        const columns = steps.length;
        const head = steps.map((step, i) => `<div class="sd-head" style="grid-column:${i + 2}">
            <button type="button" class="fv-link sd-step-name" data-select="${escapeHtml(step.id)}">${escapeHtml(step.name)}</button>
            <div class="sd-meta">
                <span><em>Role</em> ${escapeHtml(model.nameOf(step.roleId))}</span>
                <span><em>Tool</em> ${escapeHtml(model.nameOf(step.toolId))}</span>
                <span><em>Method</em> ${escapeHtml(model.nameOf(step.methodId))}</span>
            </div>
            ${transition ? `<span class="sd-role-label">${i === 0 ? "hands over" : "takes over"}</span>` : ""}
        </div>`).join("") + (transition ? `<div class="sd-arrow" style="grid-column:2 / span 2" aria-hidden="true">→</div>` : "");

        const lanes = STEP_DEFINITION_LANES.map((lane, row) => {
            const cells = steps.map((step, i) => {
                const value = step.lane(lane.feature);
                let items;
                if (lane.kind === "text") {
                    items = value ? `<div class="sd-card text">${escapeHtml(value)}</div>` : `<div class="sd-missing">${escapeHtml(lane.hint)}</div>`;
                } else {
                    items = value.map((item, k) => {
                        const isArtifact = lane.kind === "artifacts";
                        const label = isArtifact ? model.nameOf(item, item) : item;
                        const over = isArtifact && handedOver.has(item);
                        const remove = editable ? `<button type="button" class="sd-remove" data-remove="${k}" data-feature="${lane.feature}" data-id="${escapeHtml(step.id)}" aria-label="Remove ${escapeHtml(label)}" title="Remove">×</button>` : "";
                        return `<div class="sd-card${isArtifact ? " artifact" : ""}${over ? " handed-over" : ""}"${over ? ` title="Handed over by ${escapeHtml(transition.name)}"` : ""}>
                            ${isArtifact ? `<button type="button" class="fv-link" data-select="${escapeHtml(item)}">${escapeHtml(label)}</button>` : escapeHtml(label)}${over ? ' <span class="sd-over">⇄</span>' : ""}${remove}</div>`;
                    }).join("") || `<div class="sd-missing">${escapeHtml(lane.hint)}</div>`;
                }
                const edit = editable
                    ? `<button type="button" class="sd-add" data-command="editLane" data-id="${escapeHtml(step.id)}" data-feature="${lane.feature}" title="${lane.kind === "text" ? "Edit" : "Add"} ${escapeHtml(lane.label.toLowerCase())}">${lane.kind === "text" ? "Edit" : "+"}</button>`
                    : "";
                return `<div class="sd-cell" style="grid-column:${i + 2};grid-row:${row + 2}">${items}${edit}</div>`;
            }).join("");
            return `<div class="sd-lane-label" style="grid-row:${row + 2}" title="${escapeHtml(lane.hint)}">${escapeHtml(lane.label)}</div>${cells}`;
        }).join("");
        return `<div class="sd-grid" style="grid-template-columns: 170px repeat(${columns}, minmax(220px, 1fr))">
            <div class="sd-corner">Swimlane</div>${head}${lanes}</div>
            ${transition ? `<p class="fv-note"><span class="sd-card artifact handed-over sd-sample">artifact ⇄</span> is produced by ${escapeHtml(first.name)} and needed by ${escapeHtml(second ? second.name : "")}: the transition hands it over.</p>` : ""}`;
    }

    measures(steps) {
        const { model, editable } = this.state;
        return `<section class="sd-measures"><h3>Measures <span class="fv-muted">EEE Step #4: optimization of the process steps</span></h3>
            <div class="sd-measure-columns" style="grid-template-columns: repeat(${steps.length}, minmax(220px, 1fr))">${steps.map(step => `<div>
                <h4>${escapeHtml(step.name)}</h4>
                ${step.measures.map(m => `<div class="sd-measure${m.id === this.state.selectedId ? " selected" : ""}">
                    <button type="button" class="fv-link sd-measure-name" data-select="${escapeHtml(m.id)}">${escapeHtml(m.name)}</button>
                    ${m.doc ? `<p>${escapeHtml(m.doc)}</p>` : '<p class="fv-muted">No description.</p>'}
                    ${m.addressedTransitionIds.length ? `<p class="fv-muted">Addresses ${m.addressedTransitionIds.map(id => `<button type="button" class="fv-link" data-select="${escapeHtml(id)}">${escapeHtml(model.nameOf(id))}</button>`).join(", ")}</p>` : ""}
                </div>`).join("") || '<p class="fv-muted">No measures.</p>'}
                ${editable ? `<div class="fv-buttons"><button type="button" data-command="addMeasure" data-id="${escapeHtml(step.id)}">+ Measure</button></div>` : ""}
            </div>`).join("")}</div></section>`;
    }

    onClick(e) {
        const remove = e.target.closest("[data-remove]");
        if (remove) {
            const step = this.state.model.get(remove.dataset.id);
            const feature = remove.dataset.feature;
            const value = [...step.lane(feature)];
            value.splice(Number(remove.dataset.remove), 1);
            this.dispatchEvent(new CustomEvent("command", { detail: { command: "setLane", id: step.id, args: { feature, value } } }));
            return;
        }
        const command = e.target.closest("[data-command]");
        if (command) {
            this.dispatchEvent(new CustomEvent("command", { detail: { command: command.dataset.command, id: command.dataset.id, args: { feature: command.dataset.feature } } }));
            return;
        }
        const select = e.target.closest("[data-select]");
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select } }));
    }
}
