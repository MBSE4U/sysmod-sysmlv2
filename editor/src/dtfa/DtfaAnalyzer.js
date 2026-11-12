// The editor's own evaluation of the Digital Thread Flow Analysis on the domain model.
//
// The SysML engine checks syntax, names and SysML rules. This analyzer adds what the DTFA asks for:
// - the kind of each hand-over in the Tools Roles Methods Matrix (DTFA Step #1):
//     tool break          the tool changes: a column transition
//     human interface     the role changes: a row transition
// - the progress of the four DTFA steps of each analysis
// - findings: open work and inconsistencies, e.g. an unrated hand-over, a bottleneck without priority, a step at a
//   bottleneck without a step definition, or a tool/method combination that the tool policy forbids

/** The kind of a hand-over from the roles and tools of its process steps. */
export function handoverKind(analysis, handover) {
    const source = analysis.stepOf(handover.sourceId), target = analysis.stepOf(handover.targetId);
    if (!source || !target) return { known: false, toolBreak: false, humanInterface: false, label: "incomplete" };
    const toolBreak = (source.toolId || "") !== (target.toolId || "");
    const humanInterface = (source.roleId || "") !== (target.roleId || "");
    const label = toolBreak && humanInterface ? "tool break and human interface"
        : toolBreak ? "tool break" : humanInterface ? "human interface" : "same role and tool";
    return { known: true, toolBreak, humanInterface, label };
}

/**
 * Analyzes a flow analysis.
 * @returns {{kinds: Map<string, object>, findings: {severity: string, step: number, message: string, id: string}[],
 *            bottlenecks: object[], progress: object}}
 */
export function analyzeFlow(model, analysis) {
    const findings = [];
    const kinds = new Map();
    const add = (severity, step, id, message) => findings.push({ severity, step, id, message });
    const name = id => model.nameOf(id);

    // DTFA Step #1: flow mapping
    if (!analysis.environmentId) add("warning", 1, analysis.id, `${analysis.name} is not owned by an MBSE environment: declare it as an analysis of the environment (:> analyses).`);
    for (const step of analysis.steps) {
        if (!step.roleId) add("warning", 1, step.id, `${step.name} has no primary performer: it has no row in the matrix.`);
        if (!step.toolId) add("warning", 1, step.id, `${step.name} has no facilitation tool: it has no column in the matrix.`);
        if (!step.sourceArtifactIds.length && !step.targetArtifactIds.length) add("info", 1, step.id, `${step.name} needs and produces no products: it is not part of the digital thread yet.`);
        const policy = model.policyStatus(analysis.environmentId, step.toolId, step.id);
        if (policy && policy.status === "forbidden") {
            add("warning", 1, step.id, `${step.name} uses ${name(step.toolId)}, which the tool policy forbids (${policy.rule.name}).`);
        }
    }
    for (const h of analysis.handovers) kinds.set(h.id, handoverKind(analysis, h));
    for (const t of analysis.transitions) {
        if (!t.sourceId || !t.targetId) add("warning", 2, t.id, `The tool transition ${t.name} does not connect two tools of the environment.`);
        else if (!model.handoversRatedBy(t).length) add("info", 2, t.id, `No hand-over flows from ${name(t.sourceId)} to ${name(t.targetId)}${t.productIds.length ? ` with ${t.productIds.map(name).join(", ")}` : ""}: ${t.name} rates nothing.`);
    }

    // DTFA Step #2: rating
    const rated = analysis.handovers.filter(h => h.rating !== "unrated");
    const bottleneckTransitions = analysis.transitions.filter(t => t.isBottleneck);
    for (const h of analysis.handovers) {
        if (h.rating === "unrated") add("info", 2, h.id, `The hand-over ${h.name} (${name(analysis.stepOf(h.sourceId).toolId)} → ${name(analysis.stepOf(h.targetId).toolId)}) is not rated yet.`);
    }
    for (const t of analysis.transitions) {
        if (t.isBottleneck && t.priority === null) add("warning", 2, t.id, `The bottleneck ${t.name} has no priority.`);
        if (!t.isBottleneck && t.priority !== null) add("info", 2, t.id, `${t.name} has a priority but is not a bottleneck.`);
    }
    const byPriority = new Map();
    for (const t of bottleneckTransitions.filter(b => b.priority !== null)) {
        if (!byPriority.has(t.priority)) byPriority.set(t.priority, []);
        byPriority.get(t.priority).push(t);
    }
    for (const [priority, list] of byPriority) {
        if (list.length > 1) add("info", 2, list[1].id, `The bottlenecks ${list.map(t => t.name).join(", ")} have the same priority ${priority}.`);
    }

    // DTFA Step #3: step definitions of the steps at the bottlenecks
    const bottleneckHandovers = analysis.handovers.filter(h => h.isBottleneck);
    const bottleneckSteps = [...new Set(bottleneckHandovers.flatMap(h => [h.sourceId, h.targetId]))].map(id => analysis.stepOf(id)).filter(Boolean);
    for (const step of bottleneckSteps) {
        if (!step.isDefined) add("info", 3, step.id, `${step.name} is at a bottleneck; its step definition has no goal yet.`);
    }

    // DTFA Step #4: measures for the bottlenecks
    const addressed = bottleneckTransitions.filter(t => model.measuresFor(t).length);
    for (const t of bottleneckTransitions) {
        if (!model.measuresFor(t).length) add("info", 4, t.id, `No measure addresses the bottleneck ${t.name} yet.`);
    }

    const sortedBottlenecks = [...bottleneckTransitions].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
    return {
        kinds,
        findings,
        bottlenecks: sortedBottlenecks,
        progress: {
            1: { done: analysis.steps.length > 0 && analysis.handovers.length > 0, text: `${analysis.steps.length} process steps, ${analysis.handovers.length} hand-overs` },
            2: { done: analysis.handovers.length > 0 && rated.length === analysis.handovers.length, text: `${rated.length} of ${analysis.handovers.length} hand-overs rated, ${bottleneckTransitions.length} bottleneck transitions` },
            3: { done: bottleneckSteps.length > 0 && bottleneckSteps.every(s => s.isDefined), text: `${bottleneckSteps.filter(s => s.isDefined).length} of ${bottleneckSteps.length} steps at bottlenecks defined` },
            4: { done: bottleneckTransitions.length > 0 && addressed.length === bottleneckTransitions.length, text: `${addressed.length} of ${bottleneckTransitions.length} bottlenecks addressed by measures` },
        },
    };
}

/** Findings of the tool policy of an environment: rules without tool, method or status, and contradicting rules. */
export function analyzePolicy(model, environment) {
    const findings = [];
    const seen = new Map();
    for (const rule of environment.rules) {
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

/** Analyzes all flow analyses and tool policies. @returns {Map<string, object>} by analysis or environment id */
export function analyzeAll(model) {
    const results = new Map();
    for (const analysis of model.analyses) results.set(analysis.id, analyzeFlow(model, analysis));
    for (const environment of model.environments) if (environment.rules.length) results.set(environment.id, analyzePolicy(model, environment));
    return results;
}
