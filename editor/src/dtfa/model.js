// Domain model of the editor: MBSE environments (MBSEMethodology) and their Digital Thread Flow Analyses (DTFA).
//
// The views work on this model only. It does not know where the model comes from:
// the text provider builds it from .sysml files parsed by the SysML engine, a future provider
// builds it from the elements of a SysML v2 API (Systems Modeling API) project.
//
// id            identity of the element in its source: the qualified name for text,
//               the element id (UUID) for the SysML v2 API
// qualifiedName qualified name of the element
// document      name of the document that declares the element (text sources only)
// doc           the text of its doc comments
//
// The DTFA reuses MBSEMethodology: a process step is a method of the methodology of the analyzed environment
// (role = primary performer, tool = facilitation tool, source/target products = inputs/outputs). The model derives
// the process steps (Step) and the hand-overs of products between them (Handover) for each analysis; the analysis
// declares the rated tool transitions (ToolTransition) and the measures.

export class ModelElement {
    constructor({ id, qualifiedName = id, name, document = "", doc = "" }) {
        this.id = id;
        this.qualifiedName = qualifiedName;
        this.name = name;
        this.document = document;
        this.doc = doc;
        /** Declared in a library document (read-only). */
        this.library = false;
        /** Its general types outside the languages, transitively, e.g. ISO15288Processes::Stakeholders::SystemArchitect. */
        this.typeIds = [];
        /** The doc of its first general type with a doc, if it has none: { text, fromId, fromName } or null. */
        this.inheritedDoc = null;
        /** The elements it inherits through its specializations (registered elements only). */
        this.inheritedIds = [];
        /** The elements it redefines, transitively, e.g. the method of the company methodology for a team's method. */
        this.redefinedIds = [];
        /** Id of the nearest registered element that owns this element (e.g. the analysis of a measure). */
        this.ownerId = null;
    }

    get kindLabel() {
        return this.constructor.label;
    }
}

/**
 * An MBSE environment (MBSEMethodology::MBSEEnvironment): the anchor point of the flow analyses and the tool policy.
 * Its roles, tools, methods and products are those declared in it and in the environments it specializes.
 */
export class MBSEEnvironment extends ModelElement {
    static label = "MBSE environment";
    constructor(props) {
        super(props);
        /** Ids of the environments that this environment specializes. */
        this.generalIds = [];
        /** Id of the usage that redefines MBSEEnvironment::methodology (owned or inherited), or null. */
        this.methodologyId = null;
        /** Name of that usage, e.g. "companyMethodology". */
        this.methodologyName = "";
        /** The processes and methods of its methodology, owned and inherited. */
        this.behaviorIds = [];
        /** Its own flow analyses (MBSEEnvironment::analyses). @type {FlowAnalysis[]} */
        this.analyses = [];
        /** The tool policy rules declared in it. @type {ToolPolicyRule[]} */
        this.rules = [];
    }
}

/**
 * Elements of an MBSE environment (MBSEMethodology). environmentId is the environment that declares the element;
 * external is true for an element that is only referenced.
 */
class EnvironmentElement extends ModelElement {
    constructor(props) {
        super(props);
        this.environmentId = props.environmentId || null;
        this.external = !!props.external;
    }
}

/** A role (MBSEMethodology::Role): a row of the Tools Roles Methods Matrix. */
export class Role extends EnvironmentElement { static label = "Role"; }

/** A tool (MBSEMethodology::Tool): a column of the Tools Roles Methods Matrix. */
export class Tool extends EnvironmentElement { static label = "Tool"; }

/** A product (MBSEMethodology::Product): the data of the digital thread that the methods need and produce. */
export class Artifact extends EnvironmentElement { static label = "Product"; }

/** The behaviors of a methodology: processes and methods (MBSEMethodology::MethodologyBehavior). */
class Behavior extends EnvironmentElement {
    constructor(props) {
        super(props);
        /**
         * The performer and tool slots that the methodology declares: { slotId, kind: "primary" | "additional" | "tool",
         * typeIds, valueIds }, from features subsetting primaryPerformer, additionalPerformers, facilitationTools and from
         * ResponsibleFor, Supports and Facilitates connections. See DtfaModel.performersOf.
         */
        this.slots = [];
        /** Its inputs and outputs (MethodologyBehavior::inputs, outputs): product ids. */
        this.inputIds = [];
        this.outputIds = [];
        /** Its successions ("first a then b"): [{ sourceId, targetId }], "start" and "done" for start and end. */
        this.successions = [];
        /** Its step definition (DTFA::StepDefinition metadata), DTFA Step #3, and the id of the metadata usage. */
        this.goal = "";
        this.viewpoints = [];
        this.automationSteps = [];
        this.stepDefinitionId = null;
    }

    /** True if the step definition states the goal, the first question of DTFA Step #3. */
    get isDefined() {
        return !!this.goal;
    }
}

/** A process (MBSEMethodology::Process) of the methodology of an MBSE environment. */
export class Process extends Behavior { static label = "Process"; }

/** A method (MBSEMethodology::Method): a process step if a role performs it with a tool. */
export class Method extends Behavior { static label = "Method"; }

/**
 * The swimlanes of the step definition (DTFA Step #3), in the order of the diagram.
 * store: "metadata" for the features of DTFA::StepDefinition, "behavior" for the inputs and outputs of the method.
 */
export const STEP_DEFINITION_LANES = [
    { feature: "goal", label: "Goal", kind: "text", store: "metadata", hint: "Why is the step done?" },
    { feature: "inputs", label: "Source products", kind: "artifacts", store: "behavior", hint: "The data that the step needs (the inputs of the method)." },
    { feature: "viewpoints", label: "Viewpoints", kind: "texts", store: "metadata", hint: "The views on the data that the step needs. A viewpoint may limit the choice of the tool." },
    { feature: "automationSteps", label: "Automation steps", kind: "texts", store: "metadata", hint: "Automated parts of the step, e.g. an automatic import or export." },
    { feature: "outputs", label: "Target products", kind: "artifacts", store: "behavior", hint: "The data that the step produces (the outputs of the method)." },
];

/** The value of a swimlane of a behavior: a string, a list of strings or a list of product ids. */
export function laneValue(behavior, feature) {
    return {
        goal: behavior.goal, inputs: behavior.inputIds, viewpoints: behavior.viewpoints,
        automationSteps: behavior.automationSteps, outputs: behavior.outputIds,
    }[feature];
}

/**
 * A Digital Thread Flow Analysis (DTFA::DigitalThreadFlowAnalysis): an analysis case owned by the analyzed MBSE
 * environment. The model derives its process steps and hand-overs from the methodology of the environment.
 */
export class FlowAnalysis extends ModelElement {
    static label = "Flow analysis";
    constructor(props) {
        super(props);
        /** Id of the analyzed MBSE environment: the environment that owns the analysis. */
        this.environmentId = null;
        /** @type {ToolTransition[]} rated tool transitions (DTFA Step #2) */
        this.transitions = [];
        /** @type {Measure[]} DTFA Step #4 */
        this.measures = [];
        /** Derived: the process steps and the hand-overs between them. @type {Step[]} */
        this.steps = [];
        /** @type {Handover[]} */
        this.handovers = [];
    }

    /** The process step of a method, or null. */
    stepOf(methodId) {
        return this.steps.find(s => s.id === methodId) || null;
    }
}

/**
 * A process step of a flow analysis (derived): a method of the methodology of the analyzed environment that a role
 * performs with a tool. Its id is the id of the method.
 */
export class Step {
    constructor(method, { roleId, toolId, roleIds, toolIds }) {
        this.method = method;
        this.id = method.id;
        this.name = method.name;
        this.roleId = roleId || null;
        this.toolId = toolId || null;
        this.roleIds = roleIds;
        this.toolIds = toolIds;
    }

    get methodId() { return this.method.id; }
    get goal() { return this.method.goal; }
    get isDefined() { return this.method.isDefined; }
    get sourceArtifactIds() { return this.method.inputIds; }
    get targetArtifactIds() { return this.method.outputIds; }
    get viewpoints() { return this.method.viewpoints; }
    get automationSteps() { return this.method.automationSteps; }
}

export const RATINGS = {
    unrated: { label: "Not rated", short: "?" },
    efficient: { label: "Efficient", short: "✓" },
    bottleneck: { label: "Bottleneck", short: "!" },
};

/** A rated tool transition (DTFA::ToolTransition), DTFA Step #2: products flow from the source to the target tool. */
export class ToolTransition extends ModelElement {
    static label = "Tool transition";
    constructor(props) {
        super(props);
        this.analysisId = null;
        /** The source and target tools. */
        this.sourceId = null;
        this.targetId = null;
        /** The products that the transition rates; empty: all products that flow between the two tools. */
        this.productIds = [];
        /** "unrated", "efficient" or "bottleneck" */
        this.rating = "unrated";
        /** Priority of a bottleneck (1 = highest), or null. */
        this.priority = null;
        /** The explanation of the rating, or "". */
        this.explanation = "";
        /** The conversions of the data at the transition, e.g. an export or a manual copy. */
        this.conversions = [];
    }

    get isBottleneck() {
        return this.rating === "bottleneck";
    }
}

/**
 * A hand-over (derived): a product that a process step produces and the next one needs. It is rated by the tool
 * transition between the tools of the two steps.
 */
export class Handover extends ModelElement {
    static label = "Hand-over";
    constructor(props) {
        super(props);
        this.analysisId = props.analysisId;
        this.sourceId = props.sourceId;
        this.targetId = props.targetId;
        /** The products that flow from the source to the target step. */
        this.productIds = props.productIds || [];
        /** The tool transition that rates the hand-over, or null. @type {ToolTransition|null} */
        this.transition = null;
    }

    get rating() { return this.transition ? this.transition.rating : "unrated"; }
    get priority() { return this.transition ? this.transition.priority : null; }
    get explanation() { return this.transition ? this.transition.explanation : ""; }
    get conversions() { return this.transition ? this.transition.conversions : []; }
    get isBottleneck() { return this.rating === "bottleneck"; }
}

/** A measure that removes bottlenecks (DTFA::Measure), DTFA Step #4. */
export class Measure extends ModelElement {
    static label = "Measure";
    constructor(props) {
        super(props);
        this.analysisId = null;
        this.addressedTransitionIds = [];
    }
}

export const POLICY_STATUS = {
    recommended: { label: "Recommended", short: "R" },
    allowed: { label: "Allowed", short: "A" },
    forbidden: { label: "Forbidden", short: "F" },
};

/** A rule of the tool policy (DTFA::ToolPolicyRule): a facilitates connection of a tool and a method with a status. */
export class ToolPolicyRule extends ModelElement {
    static label = "Tool policy rule";
    constructor(props) {
        super(props);
        /** The environment that declares the rule. */
        this.environmentId = null;
        this.toolId = null;
        this.methodId = null;
        /** "recommended", "allowed", "forbidden", or "" if not set */
        this.status = "";
    }
}

export class DtfaModel {
    constructor() {
        /** @type {MBSEEnvironment[]} */
        this.environments = [];
        /** @type {FlowAnalysis[]} */
        this.analyses = [];
        /** @type {ToolPolicyRule[]} */
        this.rules = [];
        /** Processes of the methodologies of the environments. @type {Process[]} */
        this.processes = [];
        /** All roles, tools, methods and products in declaration order, wherever they are declared. */
        this.roles = [];
        this.tools = [];
        this.methods = [];
        this.artifacts = [];
        /** @type {Map<string, ModelElement>} */
        this.elements = new Map();
        /** Notes about the model that the views show, e.g. truncated symbol collection. */
        this.notes = [];
        /** General types outside the model: { id -> { name, kind, docs } }. */
        this.generals = {};
    }

    register(element) {
        this.elements.set(element.id, element);
        return element;
    }

    get(id) {
        return (id && this.elements.get(id)) || null;
    }

    nameOf(id, fallback = "–") {
        const element = this.get(id);
        return element ? element.name : fallback;
    }

    /** The flow analysis that contains the element (or is the element), or null. */
    analysisOf(id) {
        const element = this.get(id);
        if (element instanceof FlowAnalysis) return element;
        if (element && element.analysisId) return this.get(element.analysisId);
        return this.analyses.find(a => id && id.startsWith(a.id + "::")) || null;
    }

    /** The environment and the environments it specializes, transitively, most specific first. */
    environmentScope(environmentId) {
        const scope = [];
        const visit = id => {
            const environment = this.get(id);
            if (!(environment instanceof MBSEEnvironment) || scope.includes(id)) return;
            scope.push(id);
            environment.generalIds.forEach(visit);
        };
        visit(environmentId);
        return scope;
    }

    /**
     * The elements of a kind that an environment declares or inherits, e.g. inScope(this.roles, envId): those declared in
     * it or in the environments it specializes, those inherited from library environments (e.g. the roles of
     * SYSMODEnvironment), and the processes and methods of its methodology tree. Elements that the environment
     * redefines (e.g. a method of the company methodology that the team methodology redefines) are left out.
     */
    inScope(all, environmentId) {
        this.scopeCache = this.scopeCache || new Map();
        if (!this.scopeCache.has(environmentId)) {
            const ids = new Set();
            for (const id of this.environmentScope(environmentId)) this.get(id).inheritedIds.forEach(i => ids.add(i));
            const tree = this.methodologyTree(environmentId);
            for (const { element } of tree) ids.add(element.id);
            const redefined = new Set(tree.flatMap(n => n.element.redefinedIds));
            this.scopeCache.set(environmentId, { scope: this.environmentScope(environmentId), ids, redefined });
        }
        const { scope, ids, redefined } = this.scopeCache.get(environmentId);
        return all.filter(e => (scope.includes(e.environmentId) || ids.has(e.id)) && !redefined.has(e.id));
    }

    /**
     * The methodology of an environment as a tree of processes and methods, in order: [{ element, depth, inherited, parentId }].
     * The children of a behavior are its owned and its inherited processes and methods, e.g. the steps of a library
     * process that the environment's process does not redefine (inherited: true). parentId is the parent behavior,
     * or null for the behaviors of the methodology itself.
     */
    methodologyTree(environmentId) {
        this.treeCache = this.treeCache || new Map();
        if (!this.treeCache.has(environmentId)) this.treeCache.set(environmentId, this.buildMethodologyTree(environmentId));
        return this.treeCache.get(environmentId);
    }

    buildMethodologyTree(environmentId) {
        const scope = this.environmentScope(environmentId);
        const isBehavior = e => e instanceof Process || e instanceof Method;
        const roots = [];
        const add = e => { if (e && isBehavior(e) && !roots.includes(e)) roots.push(e); };
        // The behaviors of the methodology of the most specific environment that has one.
        const owner = scope.map(id => this.get(id)).find(e => e.methodologyId);
        if (owner) owner.behaviorIds.forEach(b => add(this.get(b)));
        for (const e of this.elements.values()) {
            if (isBehavior(e) && scope.includes(e.environmentId) && !isBehavior(this.get(e.ownerId))) add(e);
        }
        // A behavior that a more specific behavior redefines is not listed twice.
        const redefined = new Set(roots.flatMap(r => r.redefinedIds));
        const result = [], visited = new Set();
        const walk = (e, depth, inherited, parentId) => {
            if (visited.has(e.id) || redefined.has(e.id)) return;
            visited.add(e.id);
            result.push({ element: e, depth, inherited, parentId });
            const owned = [...this.elements.values()].filter(c => c.ownerId === e.id && isBehavior(c));
            owned.forEach(c => walk(c, depth + 1, false, e.id));
            const ownedRedefined = new Set(owned.flatMap(c => c.redefinedIds));
            e.inheritedIds.map(id => this.get(id)).filter(c => isBehavior(c) && !ownedRedefined.has(c.id)).forEach(c => walk(c, depth + 1, true, e.id));
        };
        roots.forEach(r => walk(r, 0, !!r.library || !scope.includes(r.environmentId), null));
        return result;
    }

    /**
     * The roles (or tools) of an environment that perform (facilitate) a behavior as the methodology declares it:
     * the values of its slots, or the roles (tools) of the environment whose types specialize the types of a slot,
     * e.g. the role "part systemArchitect : SystemArchitect" for "connection :> responsibleFor connect systemArchitect to m".
     * @param {string[]} kinds "primary", "additional" or "tool"
     */
    performersOf(behavior, environmentId, kinds = ["primary", "additional"]) {
        const result = [];
        const add = id => { if (!result.includes(id)) result.push(id); };
        for (const kind of kinds) this.declaredPerformersOf(behavior, environmentId, kind).forEach(add);
        return result.map(id => this.get(id));
    }

    /** The parent of a behavior in the methodology tree of an environment, or null. */
    parentInTree(behaviorId, environmentId) {
        this.parentCache = this.parentCache || new Map();
        if (!this.parentCache.has(environmentId)) {
            this.parentCache.set(environmentId, new Map(this.methodologyTree(environmentId).map(n => [n.element.id, n.parentId])));
        }
        return this.parentCache.get(environmentId).get(behaviorId) || null;
    }

    /** The roles (tools) that the methodology declares for the behavior itself (see performersOf), as ids. */
    declaredPerformersOf(behavior, environmentId, kind) {
        const candidates = this.inScope(kind === "tool" ? this.tools : this.roles, environmentId);
        const result = [];
        const add = id => { if (!result.includes(id)) result.push(id); };
        for (const slot of behavior.slots || []) {
            if (slot.kind !== kind) continue;
            // A value may refer to a redefined element, e.g. a tool of the company environment.
            slot.valueIds.forEach(id => { const c = candidates.find(x => x.id === id || x.redefinedIds.includes(id)); if (c) add(c.id); });
            if (!slot.valueIds.length) {
                // The slot itself (e.g. "connect editor to write"), or the roles and tools that specialize its types.
                for (const c of candidates) if (c.id === slot.slotId || slot.typeIds.some(t => c.typeIds.includes(t))) add(c.id);
            }
        }
        // In the order of the slots: the first one is the role (tool) of the process step.
        return result;
    }

    /** The products of the parameters of a behavior: the types of its features that subset inputs or outputs. */
    parameterProductIds(behavior, list) {
        return [...new Set((behavior[list] || []).map(f => f.typeIds[0]).filter(id => this.get(id) instanceof Artifact))];
    }

    /**
     * The products of an environment: those it declares or inherits (inScope), and the products that the processes and
     * methods of its methodology need and produce (the types of their parameters), e.g. the products of the SYSMOD steps.
     * MBSEMethodology: the products of a methodology subset processes.allOutputs.
     */
    productsOf(environmentId) {
        const ids = this.inScope(this.artifacts, environmentId).map(a => a.id);
        for (const { element } of this.methodologyTree(environmentId)) {
            for (const list of ["outputFeatures", "inputFeatures"]) this.parameterProductIds(element, list).forEach(id => { if (!ids.includes(id)) ids.push(id); });
        }
        return ids.map(id => this.get(id));
    }

    /** The rows and columns of the Tools Roles Methods Matrix of an analysis: the roles and tools of its environment. */
    matrixAxes(analysis) {
        const used = (all, key) => {
            const ids = new Set([...this.inScope(all, analysis.environmentId).map(e => e.id), ...analysis.steps.map(s => s[key]).filter(Boolean)]);
            return all.filter(e => ids.has(e.id));
        };
        return {
            roles: used(this.roles, "roleId"),
            tools: used(this.tools, "toolId"),
            hasUnassignedRole: analysis.steps.some(s => !this.get(s.roleId)),
            hasUnassignedTool: analysis.steps.some(s => !this.get(s.toolId)),
        };
    }

    /** The tool policy rules that apply in an environment: its own and those of the environments it specializes. */
    rulesOf(environmentId) {
        const scope = this.environmentScope(environmentId);
        return this.rules.filter(r => scope.includes(r.environmentId));
    }

    /**
     * The status of a tool for a method in an environment: { status, rule } or null. The rule of the most specific
     * environment wins; a rule for a redefined method (e.g. of the company methodology) applies to the redefining one.
     */
    policyStatus(environmentId, toolId, methodId) {
        if (!environmentId || !toolId || !methodId) return null;
        const method = this.get(methodId), tool = this.get(toolId);
        const methodIds = [methodId, ...(method ? method.redefinedIds : [])];
        const toolIds = [toolId, ...(tool ? tool.redefinedIds : [])];
        const scope = this.environmentScope(environmentId);
        let found = null;
        for (const rule of this.rulesOf(environmentId)) {
            if (!rule.status || !toolIds.includes(rule.toolId) || !methodIds.includes(rule.methodId)) continue;
            if (!found || scope.indexOf(rule.environmentId) < scope.indexOf(found.rule.environmentId)) found = { status: rule.status, rule };
        }
        return found;
    }

    /** The methods and tools of the tool policy of an environment: those of its methodology and those of its rules. */
    policyAxes(environmentId) {
        const methods = this.methodologyTree(environmentId).map(n => n.element).filter(e => e instanceof Method);
        const tools = this.inScope(this.tools, environmentId);
        for (const rule of this.rulesOf(environmentId)) {
            const m = this.get(rule.methodId), t = this.get(rule.toolId);
            if (m && !methods.some(x => x.id === m.id || x.redefinedIds.includes(m.id))) methods.push(m);
            if (t && !tools.includes(t)) tools.push(t);
        }
        return { methods, tools };
    }

    /** The processes and methods of a behavior: owned and inherited (e.g. the steps of a library process). */
    subBehaviors(behavior) {
        const isBehavior = e => e instanceof Process || e instanceof Method;
        const owned = [...this.elements.values()].filter(c => c.ownerId === behavior.id && isBehavior(c));
        const redefined = new Set(owned.flatMap(c => c.redefinedIds));
        return [...owned, ...behavior.inheritedIds.map(id => this.get(id)).filter(c => isBehavior(c) && !redefined.has(c.id))];
    }

    /**
     * The flow of a behavior: its steps and the successions between them, mapped to the steps of the behavior (a
     * succession of a library process refers to its steps; a redefining step takes their place).
     * @returns {{steps: object[], successions: {sourceId: string, targetId: string}[]}} ids are step ids, "start" or "done"
     */
    flowOf(behavior) {
        const steps = this.subBehaviors(behavior);
        const stepFor = id => (id === "start" || id === "done" ? id
            : (steps.find(s => s.id === id || s.redefinedIds.includes(id)) || {}).id || null);
        const successions = [];
        for (const s of behavior.successions || []) {
            const sourceId = stepFor(s.sourceId), targetId = stepFor(s.targetId);
            if (sourceId && targetId && !successions.some(x => x.sourceId === sourceId && x.targetId === targetId)) successions.push({ sourceId, targetId });
        }
        return { steps, successions };
    }

    /** The hand-overs that start or end at a process step. */
    handoversOf(analysis, stepId) {
        return analysis ? analysis.handovers.filter(h => h.sourceId === stepId || h.targetId === stepId) : [];
    }

    /** The hand-overs that a tool transition rates. */
    handoversRatedBy(transition) {
        const analysis = this.get(transition.analysisId);
        return analysis ? analysis.handovers.filter(h => h.transition === transition) : [];
    }

    /** The measures that address a tool transition. */
    measuresFor(transition) {
        const analysis = transition ? this.get(transition.analysisId) : null;
        return analysis ? analysis.measures.filter(m => m.addressedTransitionIds.includes(transition.id)) : [];
    }
}
