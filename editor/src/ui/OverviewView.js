// Overview: a simplified view on the methodology for management and non-technical engineers.
//
// No SysML notation and no model names: a process (e.g. SYSMODDefaultProcess) as a numbered sequence of stages in plain
// words, each with what it is about, who leads it, who supports it and what it delivers; the sub-projects (e.g. at a
// supplier) that run their own process between the hand-over and the integration; the activities on demand (e.g. a
// trade study for an architecture decision); who does what (roles × stages); and the deliverables with their owners.
// The content comes from the model (see src/dtfa/overview.js): change the methodology, and the overview follows.
//
// A click on a methodology artifact (a stage, a role, a deliverable) opens its editing canvas: the graph of the element
// in the tab of its kind (Methodology, Roles, Products), where its form is one click away.
//
// Events: "select" { id, open }, "view" { view }

import { Process, Method } from "../dtfa/model.js";
import { buildOverview, overviewCandidates, environmentOf } from "../dtfa/overview.js";

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const isBehavior = e => e instanceof Process || e instanceof Method;

export class OverviewView extends EventTarget {
    constructor(container) {
        super();
        this.root = container;
        this.root.classList.add("overview-view");
        this.state = null;
        this.processId = null;
        this.root.addEventListener("change", e => {
            if (!e.target.matches(".ov-select") || !e.target.value) return;
            this.processId = e.target.value;
            this.dispatchEvent(new CustomEvent("select", { detail: { id: e.target.value } }));
        });
        this.root.addEventListener("click", e => {
            const action = e.target.closest("[data-ov-action]");
            if (action) {
                if (action.dataset.ovAction === "print") window.print();
                if (action.dataset.ovAction === "flow") {
                    this.dispatchEvent(new CustomEvent("select", { detail: { id: this.processId } }));
                    this.dispatchEvent(new CustomEvent("view", { detail: { view: "process" } }));
                }
                return;
            }
            const node = e.target.closest("[data-open]");
            if (node) this.open(node.dataset.open);
        });
        this.root.addEventListener("keydown", e => {
            const node = e.target.closest("[data-open]");
            if (node && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.open(node.dataset.open); }
        });
    }

    /** Opens the editing canvas of a methodology artifact: its graph in the tab of its kind. */
    open(id) {
        this.dispatchEvent(new CustomEvent("select", { detail: { id, open: true } }));
    }

    /**
     * The process to show: the top-level process of the selected element; the one shown before; the process of the
     * environment; the process of the active document; otherwise the first process of the user, then of the libraries.
     */
    processFor(state) {
        const { model } = state;
        const candidates = overviewCandidates(model);
        const topLevel = e => { while (e && isBehavior(model.get(e.ownerId))) e = model.get(e.ownerId); return e; };
        const selected = model.get(state.selectedId);
        if (isBehavior(selected)) {
            const top = topLevel(selected);
            if (candidates.includes(top)) return top;
        }
        const current = model.get(this.processId);
        if (candidates.includes(current)) return current;
        if (state.environmentId) {
            const inEnvironment = candidates.find(p => environmentOf(model, p) === state.environmentId);
            if (inEnvironment) return inEnvironment;
        }
        return candidates.find(p => p.document === state.activeDocument)
            || candidates.find(p => !p.library)
            || candidates.find(p => p.name === "SYSMODDefaultProcess")
            || candidates[0] || null;
    }

    show(state) {
        this.state = state;
        const { model } = state;
        if (!model) {
            this.root.innerHTML = `<div class="fv-empty">${escapeHtml(state.message || "Waiting for the model check…")}</div>`;
            return;
        }
        const process = this.processFor(state);
        if (!process) {
            this.root.innerHTML = `<div class="fv-empty"><p>No process with steps yet.</p>
                <p>Open an example, e.g. the SYSMOD Delivery Drone project, or the library <strong>SYSMODProcesses.sysml</strong> in the Libraries panel.</p></div>`;
            return;
        }
        this.processId = process.id;
        this.render(buildOverview(model, process), model.get(state.selectedId));
    }

    render(o, selected) {
        const { model } = this.state;
        const environment = o.environmentId ? model.get(o.environmentId) : null;
        const isSelected = stage => selected && selected.id === stage.step.id;
        const openable = id => !!(id && model.get(id));
        const openAttrs = (id, tip) => openable(id) ? ` data-open="${escapeHtml(id)}" tabindex="0" role="link" title="${escapeHtml(tip)}"` : "";
        const person = p => {
            const tip = p.staffed ? `${p.label}: open the role` : environment ? `${environment.name} has no role for this yet` : "a role of the methodology";
            return `<span class="ov-person${p.staffed ? "" : " unstaffed"}${openable(p.id) ? " ov-open" : ""}"${openable(p.id) ? openAttrs(p.id, `${tip}${p.staffed ? "" : " · click: open the role"}`) : ` title="${escapeHtml(tip)}"`}>${escapeHtml(p.label)}</span>`;
        };
        const people = list => list.length ? list.map(person).join("") : `<span class="ov-none">–</span>`;
        const deliverables = stage => stage.outputs.length
            ? `<ul class="ov-delivers">${stage.outputs.map(p => `<li${openable(p.id) ? ` class="ov-open"${openAttrs(p.id, `${p.label}: open the product`)}` : ""}>${escapeHtml(p.label)}</li>`).join("")}</ul>` : `<span class="ov-none">–</span>`;
        const card = (stage, extraClass = "") => `
            <article class="ov-stage${isSelected(stage) ? " selected" : ""}${extraClass}" data-open="${escapeHtml(stage.step.id)}" tabindex="0"
                    role="link" title="${escapeHtml(`${stage.title}\nClick: open the step in the Methodology tab`)}">
                <header>
                    ${stage.number ? `<span class="ov-number">${stage.number}</span>` : `<span class="ov-number on-demand" aria-label="on demand">⟳</span>`}
                    <h3>${escapeHtml(stage.title)}</h3>
                </header>
                ${stage.summary ? `<p class="ov-summary">${escapeHtml(stage.summary)}</p>` : ""}
                <dl>
                    <dt>Lead</dt><dd>${people(stage.leads)}</dd>
                    ${stage.supports.length ? `<dt>With</dt><dd>${people(stage.supports)}</dd>` : ""}
                    <dt>Delivers</dt><dd>${deliverables(stage)}</dd>
                    ${stage.includes.length ? `<dt>Includes</dt><dd class="ov-includes">${stage.includes.map((label, i) => openable(stage.includeIds[i])
                        ? `<span class="ov-open ov-include"${openAttrs(stage.includeIds[i], `${label}: open the step`)}>${escapeHtml(label)}</span>` : escapeHtml(label)).join(" · ")}</dd>` : ""}
                </dl>
            </article>`;

        // The stages, with the sub-project band after the stage that hands over to the sub-projects.
        const span = o.subProjects;
        const toStage = span && span.to ? o.stages.find(s => s.step === span.to) : null;
        const roadmap = [];
        for (const stage of o.stages) {
            const inSpan = span && stage.step === span.from ? " ov-handover" : toStage && stage === toStage ? " ov-takeback" : "";
            roadmap.push(card(stage, inSpan));
            if (span && stage.step === span.from) {
                roadmap.push(`<aside class="ov-subprojects" aria-label="Sub-projects">
                    <span class="ov-subprojects-icon" aria-hidden="true">⇉</span>
                    <div><strong>Sub-projects work in parallel</strong>
                    <p>Building blocks that another team or a supplier develops become sub-projects. Each one receives a hand-over package
                    with its context, stakeholders and requirements, and runs its own process${o.stages.length ? ` (stages 1–${o.stages.length})` : ""}
                    without access to this project.${toStage ? ` Its results come back in stage ${toStage.number}, <em>${escapeHtml(toStage.title)}</em>.` : ""}</p></div>
                </aside>`);
            }
        }

        const roleCount = o.roles.length;
        const unstaffed = o.roles.filter(r => !r.staffed).length;
        const figures = [
            [o.stages.length, o.stages.length === 1 ? "stage" : "stages"],
            [roleCount, roleCount === 1 ? "role" : "roles"],
            [o.deliverables.length, o.deliverables.length === 1 ? "deliverable" : "deliverables"],
            ...(o.onDemand.length ? [[o.onDemand.length, "on demand"]] : []),
            ...(span ? [["⇉", "sub-projects"]] : []),
        ];

        // Who does what: the stages (rows) and the roles (columns).
        const all = [...o.stages, ...o.onDemand];
        const cell = (stage, role) => {
            const lead = stage.leads.some(p => p.key === role.key || p.label === role.label);
            const support = stage.supports.some(p => p.key === role.key || p.label === role.label);
            const owns = stage.owners.filter(x => x.roles.includes(role.label)).map(x => x.product);
            const label = lead ? "Lead" : support ? "Support" : "";
            const tip = [label && `${role.label}: ${label.toLowerCase()}s ${stage.title.toLowerCase()}`, owns.length && `owns ${owns.join(", ")}`].filter(Boolean).join("; ");
            return `<td class="${lead ? "lead" : support ? "support" : ""}"${tip ? ` title="${escapeHtml(tip)}"` : ""}>${label ? `<span>${label}</span>` : ""}${owns.length ? `<span class="ov-owner" aria-label="owner">★</span>` : ""}</td>`;
        };
        const raci = `<div class="ov-table-wrap"><table class="ov-table ov-raci">
            <thead><tr><th>Stage</th>${o.roles.map(r => `<th class="${r.staffed ? "" : "unstaffed"}"${openAttrs(r.id, `${r.label}: open the role`)}>${escapeHtml(r.label)}</th>`).join("")}</tr></thead>
            <tbody>${all.map(s => `<tr${isSelected(s) ? ' class="selected"' : ""}><th${openAttrs(s.step.id, `${s.title}: open the step`)}>${s.number ? `${s.number}. ` : "⟳ "}${escapeHtml(s.title)}</th>${o.roles.map(r => cell(s, r)).join("")}</tr>`).join("")}</tbody>
        </table></div>`;

        const stageRef = s => `<button type="button" class="fv-link" data-open="${escapeHtml(s.step.id)}">${s.number ? s.number : "⟳"} ${escapeHtml(s.title)}</button>`;
        const register = `<div class="ov-table-wrap"><table class="ov-table ov-register">
            <thead><tr><th>Deliverable</th><th>Produced in</th><th>Owner</th><th>Used in</th></tr></thead>
            <tbody>${o.deliverables.map(d => `<tr>
                <th${openAttrs(d.id, `${d.label}: open the product`)}>${escapeHtml(d.label)}</th>
                <td>${d.producedBy.map(stageRef).join("<br>")}</td>
                <td>${d.ownerRefs.length ? d.ownerRefs.map(o => { const role = o.id && openable(o.id) ? o : null; return role ? `<button type="button" class="fv-link" data-open="${escapeHtml(role.id)}">${escapeHtml(role.label)}</button>` : escapeHtml(o.label || o); }).join(", ") : `<span class="ov-none">–</span>`}</td>
                <td>${d.usedBy.length ? d.usedBy.map(stageRef).join("<br>") : `<span class="ov-none">–</span>`}</td></tr>`).join("")}</tbody>
        </table></div>`;

        const candidates = overviewCandidates(model);
        this.root.innerHTML = `<div class="dg-toolbar ov-toolbar">
                <label class="dg-field">Process <select class="ov-select">${candidates.map(p => `<option value="${escapeHtml(p.id)}"${p === o.process ? " selected" : ""}>${escapeHtml(p.name)}${p.document ? ` (${escapeHtml(p.document)})` : ""}</option>`).join("")}</select></label>
                ${environment ? `<span class="dg-status">in ${escapeHtml(environment.name)}</span>` : ""}
                <span class="dg-spacer"></span>
                <button type="button" class="fv-link" data-ov-action="flow">Show the flow</button>
                <button type="button" class="fv-link" data-ov-action="print">Print</button>
            </div>
            <div class="ov-page">
                <section class="ov-hero">
                    <p class="ov-eyebrow">The methodology at a glance</p>
                    <h2>${escapeHtml(o.title)}</h2>
                    ${o.summary ? `<p class="ov-lead">${escapeHtml(o.summary)}</p>` : ""}
                    <ul class="ov-figures">${figures.map(([n, label]) => `<li><strong>${escapeHtml(n)}</strong> ${escapeHtml(label)}</li>`).join("")}</ul>
                    ${unstaffed && environment ? `<p class="ov-note"><span class="ov-person unstaffed">dashed</span> roles of the methodology that ${escapeHtml(environment.name)} has not staffed yet (${unstaffed}).</p>` : ""}
                </section>

                <section class="ov-section">
                    <h2>The way through the project</h2>
                    <p class="ov-hint">The stages in their usual order. A stage can be skipped or repeated when the project needs it.</p>
                    <div class="ov-roadmap">${roadmap.join("")}</div>
                </section>

                ${o.onDemand.length ? `<section class="ov-section">
                    <h2>When needed</h2>
                    <p class="ov-hint">Activities without a fixed place in the order, performed whenever the situation arises, e.g. for every architecture decision with alternatives.</p>
                    <div class="ov-roadmap on-demand">${o.onDemand.map(s => card(s, " ov-on-demand")).join("")}</div>
                </section>` : ""}

                <section class="ov-section">
                    <h2>Who does what</h2>
                    <p class="ov-hint">Click a stage, a role or a deliverable to open it. <span class="ov-key lead">Lead</span> is responsible for the stage · <span class="ov-key support">Support</span> contributes · ★ owns a deliverable of the stage</p>
                    ${raci}
                </section>

                <section class="ov-section">
                    <h2>Deliverables</h2>
                    <p class="ov-hint">What the stages produce, who owns it and where it is needed next.</p>
                    ${register}
                </section>
            </div>`;
    }
}
