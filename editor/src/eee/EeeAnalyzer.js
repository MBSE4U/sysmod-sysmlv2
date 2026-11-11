// The editor's own evaluation of the EEE method on the domain model.
//
// The SysML engine checks syntax, names and SysML rules. This analyzer adds what the EEE method asks for:
// - the kind of each transition in the Tools Roles Methods Matrix (EEE Step #1):
//     method/tool break   the tool changes: a column transition
//     human interface     the role changes: a row transition
// - the progress of the four EEE steps of each check
// - findings: open work and inconsistencies, e.g. an unrated transition, a bottleneck without priority,
//   a bottleneck step without a process step definition, or a tool/method combination that the
//   company tool policy forbids

import { ProcessStep } from "./model.js";

/** The kind of a transition from the roles and tools of its process steps. */
export function transitionKind(model, transition) {
    const source = model.get(transition.sourceId), target = model.get(transition.targetId);
    if (!(source instanceof ProcessStep) || !(target instanceof ProcessStep)) {
        return { known: false, toolBreak: false, humanInterface: false, label: "incomplete" };
    }
    const toolBreak = (source.toolId || "") !== (target.toolId || "");
    const humanInterface = (source.roleId || "") !== (target.roleId || "");
    const label = toolBreak && humanInterface ? "method/tool break and human interface"
        : toolBreak ? "method/tool break" : humanInterface ? "human interface" : "same role and tool";
    return { known: true, toolBreak, humanInterface, label };
}

/** The policy status of a tool/method combination over all policies: { status, rule } or null. */
export function policyStatus(model, toolId, methodId) {
    if (!toolId || !methodId) return null;
    const order = { forbidden: 0, allowed: 1, recommended: 2 };
    let found = null;
    for (const policy of model.policies) {
        for (const rule of policy.rules) {
            if (rule.toolId === toolId && rule.methodId === methodId && rule.status) {
                // The strictest rule wins if several policies rate the same combination.
                if (!found || order[rule.status] < order[found.status]) found = { status: rule.status, rule };
            }
        }
    }
    return found;
}

/**
 * Analyzes an EEE check.
 * @returns {{kinds: Map<string, object>, findings: {severity: string, step: number, message: string, id: string}[],
 *            progress: object}}
 */
export function analyzeCheck(model, check) {
    const findings = [];
    const kinds = new Map();
    const add = (severity, step, id, message) => findings.push({ severity, step, id, message });
    const name = id => model.nameOf(id);

    // EEE Step #1: matrix
    if (!check.environmentId) add("warning", 1, check.id, `${check.name} analyzes no MBSE environment: redefine its feature environment with a usage of an MBSE environment.`);
    for (const step of check.steps) {
        if (!step.roleId) add("warning", 1, step.id, `${step.name} has no role: it has no row in the matrix.`);
        if (!step.toolId) add("warning", 1, step.id, `${step.name} has no tool: it has no column in the matrix.`);
        if (!step.methodId) add("info", 1, step.id, `${step.name} has no method.`);
        const policy = policyStatus(model, step.toolId, step.methodId);
        if (policy && policy.status === "forbidden") {
            add("warning", 1, step.id, `${step.name} uses ${name(step.toolId)} for ${name(step.methodId)}, which the tool policy ${model.policyOf(policy.rule.id).name} forbids.`);
        }
    }
    const steps = new Set(check.steps.map(s => s.id));
    for (const t of check.transitions) {
        const kind = transitionKind(model, t);
        kinds.set(t.id, kind);
        if (!steps.has(t.sourceId) || !steps.has(t.targetId)) {
            add("warning", 1, t.id, `The transition ${t.name} does not connect two process steps of ${check.name}.`);
        } else if (t.sourceId === t.targetId) {
            add("warning", 1, t.id, `The transition ${t.name} connects ${name(t.sourceId)} with itself.`);
        }
    }

    // EEE Step #2: evaluation
    const bottlenecks = check.transitions.filter(t => t.isBottleneck);
    const rated = check.transitions.filter(t => t.evaluation !== "unrated");
    for (const t of check.transitions) {
        if (t.evaluation === "unrated") add("info", 2, t.id, `${t.name} (${name(t.sourceId)} → ${name(t.targetId)}) is not evaluated yet.`);
        if (t.isBottleneck && t.priority === null) add("warning", 2, t.id, `The bottleneck ${t.name} has no priority.`);
        if (!t.isBottleneck && t.priority !== null) add("info", 2, t.id, `${t.name} has a priority but is not a bottleneck.`);
    }
    const byPriority = new Map();
    for (const t of bottlenecks.filter(b => b.priority !== null)) {
        if (!byPriority.has(t.priority)) byPriority.set(t.priority, []);
        byPriority.get(t.priority).push(t);
    }
    for (const [priority, list] of byPriority) {
        if (list.length > 1) add("info", 2, list[1].id, `The bottlenecks ${list.map(t => t.name).join(", ")} have the same priority ${priority}.`);
    }

    // EEE Step #3: process step definitions of the steps at the bottlenecks
    const bottleneckSteps = [...new Set(bottlenecks.flatMap(t => [t.sourceId, t.targetId]).filter(id => steps.has(id)))]
        .map(id => model.get(id));
    for (const step of bottleneckSteps) {
        if (!step.isDefined) add("info", 3, step.id, `${step.name} is at a bottleneck; its process step definition has no goal yet.`);
    }

    // EEE Step #4: measures for the bottlenecks
    const addressed = bottlenecks.filter(t => model.measuresFor(t).length);
    for (const t of bottlenecks) {
        if (!model.measuresFor(t).length) add("info", 4, t.id, `No measure addresses the bottleneck ${t.name} yet.`);
    }

    const sortedBottlenecks = [...bottlenecks].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
    return {
        kinds,
        findings,
        bottlenecks: sortedBottlenecks,
        progress: {
            1: { done: check.steps.length > 0 && check.transitions.length > 0, text: `${check.steps.length} process steps, ${check.transitions.length} transitions` },
            2: { done: check.transitions.length > 0 && rated.length === check.transitions.length, text: `${rated.length} of ${check.transitions.length} transitions evaluated, ${bottlenecks.length} bottlenecks` },
            3: { done: bottleneckSteps.length > 0 && bottleneckSteps.every(s => s.isDefined), text: `${bottleneckSteps.filter(s => s.isDefined).length} of ${bottleneckSteps.length} steps at bottlenecks defined` },
            4: { done: bottlenecks.length > 0 && addressed.length === bottlenecks.length, text: `${addressed.length} of ${bottlenecks.length} bottlenecks addressed by measures` },
        },
    };
}

/** Findings of a tool policy: rules without tool, method or status, and contradicting rules. */
export function analyzePolicy(model, policy) {
    const findings = [];
    const seen = new Map();
    for (const rule of policy.rules) {
        if (!rule.toolId || !rule.methodId) findings.push({ severity: "warning", id: rule.id, message: `The rule ${rule.name} needs a tool and a method.` });
        if (!rule.status) findings.push({ severity: "warning", id: rule.id, message: `The rule ${rule.name} has no status.` });
        const key = `${rule.toolId}|${rule.methodId}`;
        if (rule.toolId && rule.methodId) {
            const other = seen.get(key);
            if (other && other.status !== rule.status) {
                findings.push({ severity: "warning", id: rule.id, message: `${rule.name} and ${other.name} rate the same combination differently.` });
            }
            seen.set(key, rule);
        }
    }
    return { findings };
}

/** Analyzes all checks and policies. @returns {Map<string, object>} by check or policy id */
export function analyzeAll(model) {
    const results = new Map();
    for (const check of model.checks) results.set(check.id, analyzeCheck(model, check));
    for (const policy of model.policies) results.set(policy.id, analyzePolicy(model, policy));
    return results;
}
