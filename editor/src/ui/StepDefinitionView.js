// Editor of the step definitions of a Digital Thread Flow Analysis (DTFA Steps #3 and #4).
//
// The swimlanes of the diagram are rows: goal, source products, viewpoints, automation steps and target products.
// The goal, the viewpoints and the automation steps are the step definition metadata of the method
// (DTFA::StepDefinition); the source and target products are the inputs and outputs of the method.
// For a selected process step, the diagram has one column. For a selected hand-over, it shows the step that hands over
// and the step that takes over side by side, marks the products that are handed over, and shows the tool transition
// that rates the hand-over with its conversions. Below the swimlanes are the measures that address the tool
// transitions of the steps (DTFA Step #4).
//
// Events: "select" { id }, "command" { command, id, args }

import { Method, Handover, ToolTransition, Measure, STEP_DEFINITION_LANES, RATINGS, laneValue } from "../dtfa/model.js";

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
        const analysis = (selected && model.analysisOf(selected.id))
            || model.analyses.find(a => selected && a.stepOf(selected.id)) || model.analyses.find(a => a.stepOf(this.stepId)) || model.analyses[0] || null;
        let steps = [], handover = null;
        if (selected instanceof Handover) handover = selected;
        else if (selected instanceof ToolTransition) handover = model.handoversRatedBy(selected)[0] || null;
        else if (selected instanceof Measure) {
            const transition = model.get(selected.addressedTransitionIds[0]);
            handover = transition ? model.handoversRatedBy(transition)[0] || null : null;
        }
        if (handover && analysis) {
            steps = [analysis.stepOf(handover.sourceId), analysis.stepOf(handover.targetId)].filter(Boolean);
        } else if (selected instanceof Method && analysis && analysis.stepOf(selected.id)) {
            steps = [analysis.stepOf(selected.id)];
        }
        if (!steps.length && analysis) {
            const remembered = analysis.stepOf(this.stepId);
            const firstBottleneck = analysis.handovers.filter(h => h.isBottleneck).sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))[0];
            const fallback = remembered || (firstBottleneck && analysis.stepOf(firstBottleneck.targetId)) || analysis.steps[0];
            if (fallback) steps = [fallback];
        }
        if (steps.length === 1) this.stepId = steps[0].id;
        this.analysis = analysis;

        const options = model.analyses.map(a => `<optgroup label="${escapeHtml(`${a.name} (${model.nameOf(a.environmentId)})`)}">${a.steps.map(s =>
            `<option value="${escapeHtml(s.id)}"${steps.length === 1 && steps[0].id === s.id && a === analysis ? " selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}</optgroup>`).join("");
        const transition = handover && handover.transition;
        const toolbar = `<div class="dg-toolbar sd-toolbar">
            <label class="dg-field">Process step <select class="sd-step-select">${steps.length === 1 ? "" : '<option value="">–</option>'}${options}</select></label>
            ${handover ? `<span class="sd-transition">Hand-over <button type="button" class="fv-link" data-select="${escapeHtml(handover.id)}">${escapeHtml(handover.name)}</button>
                <span class="eval-chip eval-${handover.rating}">${escapeHtml(RATINGS[handover.rating].label)}${handover.priority ? ` · priority ${handover.priority}` : ""}</span>${handover.explanation ? ` <span class="fv-muted">${escapeHtml(handover.explanation)}</span>` : ""}</span>` : ""}
            <span class="dg-spacer"></span>
            <span class="dg-status">Step definition (DTFA Step #3)</span>
        </div>`;
        if (!steps.length) {
            this.root.innerHTML = toolbar + `<div class="fv-empty"><p>No process step yet.</p><p>Add process steps in the <strong>Matrix</strong> view.</p></div>`;
            return;
        }
        this.root.innerHTML = toolbar + `<div class="sd-scroll">${this.diagram(steps, handover, transition)}${this.measures(steps)}</div>`;
    }

    diagram(steps, handover, transition) {
        const { model, editable } = this.state;
        const [first, second] = steps;
        const handedOver = new Set(handover ? handover.productIds : []);
        const columns = steps.length;
        const head = steps.map((step, i) => `<div class="sd-head" style="grid-column:${i + 2}">
            <button type="button" class="fv-link sd-step-name" data-select="${escapeHtml(step.id)}">${escapeHtml(step.name)}</button>
            <div class="sd-meta">
                <span><em>Role</em> ${escapeHtml(model.nameOf(step.roleId))}</span>
                <span><em>Tool</em> ${escapeHtml(model.nameOf(step.toolId))}</span>
            </div>
            ${handover ? `<span class="sd-role-label">${i === 0 ? "hands over" : "takes over"}</span>` : ""}
        </div>`).join("") + (handover ? `<div class="sd-arrow" style="grid-column:2 / span 2" aria-hidden="true">→</div>` : "");

        const lanes = STEP_DEFINITION_LANES.map((lane, row) => {
            const cells = steps.map((step, i) => {
                const value = laneValue(step.method, lane.feature);
                let items;
                if (lane.kind === "text") {
                    items = value ? `<div class="sd-card text">${escapeHtml(value)}</div>` : `<div class="sd-missing">${escapeHtml(lane.hint)}</div>`;
                } else {
                    items = value.map((item, k) => {
                        const isArtifact = lane.kind === "artifacts";
                        const label = isArtifact ? model.nameOf(item, item) : item;
                        const over = isArtifact && handedOver.has(item);
                        const remove = editable ? `<button type="button" class="sd-remove" data-remove="${k}" data-feature="${lane.feature}" data-id="${escapeHtml(step.id)}" aria-label="Remove ${escapeHtml(label)}" title="Remove">×</button>` : "";
                        return `<div class="sd-card${isArtifact ? " artifact" : ""}${over ? " handed-over" : ""}"${over ? ` title="Handed over by ${escapeHtml(handover.name)}"` : ""}>
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
        // The conversions of the tool transition of a hand-over: one row across both columns.
        let conversions = "";
        if (handover) {
            const row = STEP_DEFINITION_LANES.length + 2;
            const items = transition
                ? (transition.conversions.map(c => `<div class="sd-card">${escapeHtml(c)}</div>`).join("") || '<div class="sd-missing">Conversions of the data at the transition, e.g. an export, an import or a manual copy.</div>')
                : '<div class="sd-missing">Rate the hand-over in the matrix to create its tool transition.</div>';
            const edit = editable && transition ? `<button type="button" class="sd-add" data-command="editConversions" data-id="${escapeHtml(transition.id)}" title="Edit the conversions">Edit</button>` : "";
            conversions = `<div class="sd-lane-label" style="grid-row:${row}" title="The conversions of the data between the tools (ToolTransition::conversions)">Conversions</div>
                <div class="sd-cell sd-conversions" style="grid-column:2 / span 2;grid-row:${row}">
                    ${transition ? `<p class="fv-muted">Tool transition <button type="button" class="fv-link" data-select="${escapeHtml(transition.id)}">${escapeHtml(transition.name)}</button>: ${escapeHtml(model.nameOf(transition.sourceId))} → ${escapeHtml(model.nameOf(transition.targetId))}</p>` : ""}
                    ${items}${edit}</div>`;
        }
        return `<div class="sd-grid" style="grid-template-columns: 170px repeat(${columns}, minmax(220px, 1fr))">
            <div class="sd-corner">Swimlane</div>${head}${lanes}${conversions}</div>
            ${handover ? `<p class="fv-note"><span class="sd-card artifact handed-over sd-sample">product ⇄</span> is produced by ${escapeHtml(first.name)} and needed by ${escapeHtml(second ? second.name : "")}: it is handed over.</p>` : ""}`;
    }

    /** The measures that address the tool transitions of the hand-overs of the steps. */
    measures(steps) {
        const { model, editable } = this.state;
        const analysis = this.analysis;
        const transitions = [...new Set(steps.flatMap(s => model.handoversOf(analysis, s.id)).map(h => h.transition).filter(Boolean))];
        const measures = [...new Set(transitions.flatMap(t => model.measuresFor(t)))];
        return `<section class="sd-measures"><h3>Measures <span class="fv-muted">DTFA Step #4: measures for the tool transitions of ${steps.map(s => escapeHtml(s.name)).join(" and ")}</span></h3>
            ${measures.map(m => `<div class="sd-measure${m.id === this.state.selectedId ? " selected" : ""}">
                <button type="button" class="fv-link sd-measure-name" data-select="${escapeHtml(m.id)}">${escapeHtml(m.name)}</button>
                ${m.doc ? `<p>${escapeHtml(m.doc)}</p>` : '<p class="fv-muted">No description.</p>'}
                ${m.addressedTransitionIds.length ? `<p class="fv-muted">Addresses ${m.addressedTransitionIds.map(id => `<button type="button" class="fv-link" data-select="${escapeHtml(id)}">${escapeHtml(model.nameOf(id))}</button>`).join(", ")}</p>` : ""}
            </div>`).join("") || '<p class="fv-muted">No measures.</p>'}
            ${editable && analysis ? `<div class="fv-buttons"><button type="button" data-command="addMeasure" data-id="${escapeHtml(transitions[0] ? transitions[0].id : analysis.id)}">+ Measure</button></div>` : ""}
        </section>`;
    }

    onClick(e) {
        const remove = e.target.closest("[data-remove]");
        if (remove) {
            const method = this.state.model.get(remove.dataset.id);
            const feature = remove.dataset.feature;
            const value = [...laneValue(method, feature)];
            value.splice(Number(remove.dataset.remove), 1);
            this.dispatchEvent(new CustomEvent("command", { detail: { command: "setLane", id: method.id, args: { feature, value } } }));
            return;
        }
        const command = e.target.closest("[data-command]");
        if (command) {
            this.dispatchEvent(new CustomEvent("command", { detail: { command: command.dataset.command, id: command.dataset.id, args: { feature: command.dataset.feature } } }));
            return;
        }
        const select = e.target.closest("[data-select]");
        // A link opens the editor of the element, e.g. the role editor (see App.openElement).
        if (select) this.dispatchEvent(new CustomEvent("select", { detail: { id: select.dataset.select, open: select.classList.contains("fv-link") } }));
    }
}
