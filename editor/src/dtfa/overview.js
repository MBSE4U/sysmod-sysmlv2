// The overview of a process for management and non-technical engineers: the stages of the process in their order, who
// leads and supports them, what they deliver, the sub-projects (e.g. suppliers) that run their own process, and the
// activities without a fixed position (on demand, e.g. a trade study for an architecture decision).
//
// Pure functions on the domain model (no DOM), shared by the Overview and the Processes view and tested in Node.

import { Process, Method, Artifact } from "./model.js";

const isBehavior = e => e instanceof Process || e instanceof Method;
const lastSegment = id => String(id || "").split("::").pop();

/** A name in plain words: "modelSubProject" -> "Model sub-project", "SystemArchitect" -> "System architect". */
export function humanize(name) {
    const words = String(name || "").replace(/^'|'$/g, "")
        .replace(/[_-]+/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    if (words[0] === "Setup" || words[0] === "setup") words.splice(0, 1, "Set", "up");
    const text = words.map((w, i) => (i && !/^[A-Z0-9]{2,}$/.test(w) ? w.toLowerCase() : w)).join(" ")
        .replace(/\bsub (?=[a-z])/g, "sub-").replace(/\bSub (?=[a-z])/g, "Sub-");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The first sentence of a doc comment in plain words: without SysML references in parentheses, e.g. "(brownfieldContext)",
 * and without markup. Shortened to about max characters.
 */
export function plainSummary(doc, max = 220) {
    let text = String(doc || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    // Parentheses that name model elements (camelCase, qualified names, code) say nothing to a non-technical reader.
    for (let i = 0; i < 3; i++) text = text.replace(/\s*\((?:[^()]*?(?:[a-z][A-Z]|::|#|`|\be\.g\.)[^()]*?)\)/g, "");
    text = text.replace(/`([^`]*)`/g, "$1").replace(/\s+([,.;:])/g, "$1");
    // Remaining model names in plain words, e.g. "modelFunctionalArchitecture" -> "model functional architecture".
    text = text.replace(/\b(?:[a-z]+(?:[A-Z][a-z0-9]*)+|[A-Z][a-z]+(?:[A-Z][a-z0-9]*)+)\b/g, w => humanize(w).toLowerCase());
    const match = text.match(/^(.{30,}?[.!?])(\s|$)/);
    let sentence = match ? match[1] : text;
    // A long sentence: up to its first colon, if that says enough.
    const colon = sentence.indexOf(": ");
    if (sentence.length > max && colon > 40) sentence = sentence.slice(0, colon) + ".";
    if (sentence.length > max) sentence = sentence.slice(0, max).replace(/\s+\S*$/, "").replace(/[,;:]$/, "") + "…";
    return sentence;
}

/** True if a product is a project, e.g. SYSMODProcesses::Products::Project or a product that specializes it. */
export function isProjectProduct(product) {
    return product instanceof Artifact && (product.name === "Project" || (product.typeIds || []).some(t => lastSegment(t) === "Project"));
}

/** The type names (products) of the input or output parameters of a behavior, without duplicates. */
function productsOfStep(model, step, list) {
    const result = [];
    for (const f of step[list] || []) {
        const id = f.typeIds[0];
        const product = id ? model.get(id) : null;
        const name = product ? product.name : (id && model.generals[id] && model.generals[id].name) || (id ? lastSegment(id) : f.name);
        if (!result.some(r => r.name === name)) result.push({ id: product ? product.id : id || null, name, label: humanize(name), product });
    }
    return result;
}

/** The environment in whose scope a process is performed, or null for a definition. */
export function environmentOf(model, behavior) {
    for (let e = behavior; e; e = model.get(e.ownerId)) if (e.environmentId && model.get(e.environmentId)) return e.environmentId;
    return null;
}

/**
 * The people of a step: the roles of the environment that perform it as the methodology declares it, otherwise the
 * declared performer types (e.g. "System architect"). staffed: false if the environment has no role for a declared slot.
 */
function peopleOf(model, step, environmentId, kind) {
    const result = [];
    const add = entry => { if (entry.label && !result.some(r => r.key === entry.key)) result.push(entry); };
    if (environmentId) {
        for (const role of model.performersOf(step, environmentId, [kind])) add({ key: role.id, id: role.id, label: humanize(role.name), staffed: true });
    }
    if (result.length) return result;
    for (const slot of step.slots || []) {
        if (slot.kind !== kind || slot.ofEnclosing) continue;
        const type = slot.typeIds.length ? ((model.generals[slot.typeIds[0]] && model.generals[slot.typeIds[0]].name) || lastSegment(slot.typeIds[0])) : "";
        const value = slot.valueIds.length ? model.nameOf(slot.valueIds[0], lastSegment(slot.valueIds[0])) : "";
        const name = type || value || (slot.slotId.includes("<") ? "" : lastSegment(slot.slotId));
        if (!name) continue;
        const label = humanize(name);
        add({ key: `type:${label}`, id: slot.valueIds[0] && model.get(slot.valueIds[0]) ? slot.valueIds[0] : null, label, staffed: !environmentId });
    }
    return result;
}

/** The order of the steps along the successions (longest path from the start); null for steps without a succession. */
function ranks(steps, successions) {
    const rank = new Map([["start", 0]]);
    for (let changed = true, guard = 0; changed && guard < steps.length + 2; guard++) {
        changed = false;
        for (const s of successions) {
            if (!rank.has(s.sourceId) || s.targetId === "start") continue;
            const r = rank.get(s.sourceId) + 1;
            if (!rank.has(s.targetId) || rank.get(s.targetId) < r) { rank.set(s.targetId, r); changed = true; }
        }
    }
    for (const s of steps) if (!rank.has(s.id) && successions.some(x => x.targetId === s.id || x.sourceId === s.id)) {
        const before = successions.filter(x => x.targetId === s.id && rank.has(x.sourceId)).map(x => rank.get(x.sourceId) + 1);
        rank.set(s.id, before.length ? Math.max(...before) : 1);
    }
    return rank;
}

/**
 * The sub-project span of a flow: the step that hands over to sub-projects (it outputs a project, and it is not the first
 * step, which sets up the project itself) and the later step that takes the projects back (it needs a project), e.g.
 * modelSubProject and integrateSubProjects of SYSMODDefaultProcess. In between, each sub-project performs its own process.
 * @param {{step: object, inputs: object[], outputs: object[]}[]} stages in their order
 * @returns {{from: object, to: object|null, products: object[]}|null}
 */
export function subProjectSpan(stages) {
    for (let i = 1; i < stages.length; i++) {
        const products = stages[i].outputs.filter(p => isProjectProduct(p.product));
        if (!products.length) continue;
        const back = stages.slice(i + 1).find(s => s.inputs.some(p => isProjectProduct(p.product)));
        return { from: stages[i].step, to: back ? back.step : null, products };
    }
    return null;
}

/**
 * The overview of a process (or a method with steps) for management.
 * @returns {{process, environmentId, title, summary, stages: object[], onDemand: object[], roles: object[],
 *            deliverables: object[], subProjects: object|null}}
 *   stage: { step, number, title, summary, leads, supports, outputs, inputs, owners, includes, inherited }
 *   role: { key, id, label, staffed }; deliverable: { key, id, label, producedBy: stage[], owners: string[], usedBy: stage[] }
 */
export function buildOverview(model, process) {
    const environmentId = environmentOf(model, process);
    const { steps, successions } = model.flowOf(process);
    const rank = ranks(steps, successions);
    const index = new Map(steps.map((s, i) => [s.id, i]));
    const ordered = steps.filter(s => rank.has(s.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id) || index.get(a.id) - index.get(b.id));
    const free = steps.filter(s => !rank.has(s.id));

    const stageOf = (step, number) => {
        const owners = model.productOwnersOf(step, environmentId).map(o => ({ product: o.product.name, roles: o.roles.map(r => humanize(r.name)) }));
        const sub = model.subBehaviors(step);
        const leads = peopleOf(model, step, environmentId, "primary");
        const supports = peopleOf(model, step, environmentId, "additional").filter(p => !leads.some(l => l.key === p.key || l.label === p.label));
        return {
            step, number, title: humanize(step.name),
            summary: plainSummary(step.doc || (step.inheritedDoc ? step.inheritedDoc.text : "")),
            leads, supports, owners,
            outputs: productsOfStep(model, step, "outputFeatures"),
            // Informal inputs, e.g. a ProjectDescription, are named but are not deliverables of other stages.
            inputs: productsOfStep(model, step, "inputFeatures"),
            includes: sub.map(s => humanize(s.name)),
            nested: sub.length,
            inherited: !step.id.startsWith(process.id + "::"),
        };
    };
    const stages = ordered.map((s, i) => stageOf(s, i + 1));
    const onDemand = free.map(s => stageOf(s, null));
    const all = [...stages, ...onDemand];

    // The roles, in the order of their first appearance as lead, then as support.
    const roles = [];
    for (const kind of ["leads", "supports"]) for (const stage of all) for (const p of stage[kind]) {
        if (!roles.some(r => r.key === p.key || r.label === p.label)) roles.push(p);
    }

    // The projects that a stage hands over to sub-projects are the sub-projects, not the project itself.
    const subProjects = subProjectSpan(stages);
    if (subProjects) for (const p of subProjects.products) { p.label = "Sub-project"; p.subProject = true; }

    // The deliverables: the outputs of the stages, with the stages that produce and need them.
    const deliverables = [];
    for (const stage of all) for (const out of stage.outputs) {
        let d = deliverables.find(x => x.key === (out.id || out.name) && !!x.subProject === !!out.subProject);
        if (!d) { d = { key: out.id || out.name, id: out.id, name: out.name, label: out.label, subProject: !!out.subProject, producedBy: [], owners: [], usedBy: [] }; deliverables.push(d); }
        if (!d.producedBy.includes(stage)) d.producedBy.push(stage);
        for (const o of stage.owners) if (o.product === out.name) o.roles.forEach(r => { if (!d.owners.includes(r)) d.owners.push(r); });
    }
    for (const stage of all) for (const input of stage.inputs) {
        // A stage that takes projects back (e.g. integrateSubProjects) uses the sub-projects.
        const back = subProjects && subProjects.to === stage.step && isProjectProduct(input.product);
        const d = deliverables.find(x => x.key === (input.id || input.name) && (!back || x.subProject)) || (back ? deliverables.find(x => x.subProject) : null);
        if (d && !d.producedBy.includes(stage) && !d.usedBy.includes(stage)) d.usedBy.push(stage);
    }

    const processDoc = process.doc || (process.inheritedDoc ? process.inheritedDoc.text : "");
    return {
        process, environmentId,
        title: humanize(process.name),
        summary: plainSummary(processDoc, 320),
        stages, onDemand, roles, deliverables, subProjects,
    };
}

/** The top-level processes and methods with steps that the overview can show (not the steps of other behaviors). */
export function overviewCandidates(model) {
    return [...model.elements.values()].filter(e => isBehavior(e) && model.subBehaviors(e).length && !isBehavior(model.get(e.ownerId)));
}
