// EEE domain model of the editor.
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

export class EeeElement {
    constructor({ id, qualifiedName = id, name, document = "", doc = "" }) {
        this.id = id;
        this.qualifiedName = qualifiedName;
        this.name = name;
        this.document = document;
        this.doc = doc;
        /** Id of the element that owns this element, if it is an EEE element (e.g. the EEE check). */
        this.ownerId = null;
    }

    get kindLabel() {
        return this.constructor.label;
    }
}

/**
 * An MBSE environment (MBSEMethodology::MBSEEnvironment): the anchor point of EEE checks and tool policies.
 * Its roles, tools, methods and products are those declared in it and in the environments it specializes.
 */
export class MBSEEnvironment extends EeeElement {
    static label = "MBSE environment";
    constructor(props) {
        super(props);
        /** Ids of the environments that this environment specializes. */
        this.generalIds = [];
        /** Id of the usage that redefines MBSEEnvironment::methodology, or null. */
        this.methodologyId = null;
    }
}

/** An EEE check: the analysis of an MBSE environment (#eeeCheck). */
export class EeeCheck extends EeeElement {
    static label = "EEE check";
    constructor(props) {
        super(props);
        /** Id of the analyzed MBSE environment (definition), and the name of the usage that redefines EeeCheck::environment. */
        this.environmentId = null;
        this.environmentUsage = "";
        /** Owned elements by kind. @type {Role[]} */
        this.roles = [];
        /** @type {Tool[]} */
        this.tools = [];
        /** @type {Method[]} */
        this.methods = [];
        /** @type {Artifact[]} */
        this.artifacts = [];
        /** @type {ProcessStep[]} */
        this.steps = [];
        /** @type {StepTransition[]} */
        this.transitions = [];
    }
}

/**
 * Elements of an MBSE environment (MBSEMethodology). environmentId is the environment that declares the element;
 * external is true for an element that is only referenced, e.g. a method of a library methodology.
 */
class EnvironmentElement extends EeeElement {
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

/** A process (MBSEMethodology::Process) of the methodology of an MBSE environment. */
export class Process extends EnvironmentElement { static label = "Process"; }

/** A method (MBSEMethodology::Method) that a process step applies. */
export class Method extends EnvironmentElement { static label = "Method"; }

/** An artifact: a product (MBSEMethodology::Product) that process steps use and produce. */
export class Artifact extends EnvironmentElement { static label = "Artifact"; }

/** The swimlanes of the EEE Process Step Definition Diagram (EEE Step #3), in the order of the diagram. */
export const STEP_DEFINITION_LANES = [
    { feature: "goal", label: "Goal", kind: "text", hint: "Why is the process step done?" },
    { feature: "sourceArtifacts", label: "Source artifacts", kind: "artifacts", hint: "The data that the step needs." },
    { feature: "viewpoints", label: "Viewpoints", kind: "texts", hint: "The views on the data that the step needs. A viewpoint may limit the choice of the tool." },
    { feature: "automationSteps", label: "Automation steps", kind: "texts", hint: "Automated parts of the step, e.g. an automatic import or export." },
    { feature: "targetArtifacts", label: "Target artifacts", kind: "artifacts", hint: "The data that the step produces." },
    { feature: "artifactConversions", label: "Artifact conversions", kind: "texts", hint: "Conversions of data that the step needs, e.g. an import or an export." },
];

/** A process step: a cell entry of the Tools Roles Methods Matrix (#processStep). */
export class ProcessStep extends EeeElement {
    static label = "Process step";
    constructor(props) {
        super(props);
        this.roleId = null;
        this.toolId = null;
        this.methodId = null;
        /** Process step definition (EEE Step #3). */
        this.goal = "";
        this.sourceArtifactIds = [];
        this.viewpoints = [];
        this.automationSteps = [];
        this.targetArtifactIds = [];
        this.artifactConversions = [];
        /** @type {Measure[]} EEE Step #4 */
        this.measures = [];
    }

    /** True if any swimlane of the process step definition is filled. */
    get hasDefinition() {
        return !!(this.goal || this.sourceArtifactIds.length || this.viewpoints.length || this.automationSteps.length
            || this.targetArtifactIds.length || this.artifactConversions.length);
    }

    /** True if the process step definition states the goal of the step, the first question of EEE Step #3. */
    get isDefined() {
        return !!this.goal;
    }

    /** The value of a swimlane: a string, a list of strings or a list of artifact ids. */
    lane(feature) {
        return {
            goal: this.goal, sourceArtifacts: this.sourceArtifactIds, viewpoints: this.viewpoints,
            automationSteps: this.automationSteps, targetArtifacts: this.targetArtifactIds, artifactConversions: this.artifactConversions,
        }[feature];
    }
}

export const EVALUATIONS = {
    unrated: { label: "Not rated", short: "?" },
    efficient: { label: "Efficient", short: "✓" },
    bottleneck: { label: "Bottleneck", short: "!" },
};

/** The transition from one process step to the next one (#stepTransition), evaluated in EEE Step #2. */
export class StepTransition extends EeeElement {
    static label = "Transition";
    constructor(props) {
        super(props);
        this.sourceId = null;
        this.targetId = null;
        /** "unrated", "efficient" or "bottleneck" */
        this.evaluation = "unrated";
        /** Priority of a bottleneck (1 = highest), or null. */
        this.priority = null;
    }

    get isBottleneck() {
        return this.evaluation === "bottleneck";
    }
}

/** A measure that optimizes a process step (#measure), EEE Step #4. */
export class Measure extends EeeElement {
    static label = "Measure";
    constructor(props) {
        super(props);
        this.stepId = null;
        this.addressedTransitionIds = [];
    }
}

/** The company tool policy: the EEE Company Tool Policy Matrix (#toolPolicy). */
export class ToolPolicy extends EeeElement {
    static label = "Tool policy";
    constructor(props) {
        super(props);
        /** @type {ToolPolicyRule[]} */
        this.rules = [];
        /** Tools and methods declared inside the policy. */
        this.tools = [];
        this.methods = [];
        /** Id of the MBSE environment whose tools and methods the policy rates, and the name of its usage. */
        this.environmentId = null;
        this.environmentUsage = "";
    }
}

export const POLICY_STATUS = {
    recommended: { label: "Recommended", short: "R" },
    allowed: { label: "Allowed", short: "A" },
    forbidden: { label: "Forbidden", short: "F" },
};

/** A rule of the tool policy: the status of a tool/method combination (#toolPolicyRule). */
export class ToolPolicyRule extends EeeElement {
    static label = "Policy rule";
    constructor(props) {
        super(props);
        this.toolId = null;
        this.methodId = null;
        /** "recommended", "allowed", "forbidden", or "" if not set */
        this.status = "";
    }
}

export class EeeModel {
    constructor() {
        /** @type {EeeCheck[]} */
        this.checks = [];
        /** @type {ToolPolicy[]} */
        this.policies = [];
        /** @type {MBSEEnvironment[]} */
        this.environments = [];
        /** Processes of the methodologies of the environments. @type {Process[]} */
        this.processes = [];
        /** All roles, tools, methods and artifacts in declaration order, wherever they are declared. */
        this.roles = [];
        this.tools = [];
        this.methods = [];
        this.artifacts = [];
        /** @type {Map<string, EeeElement>} */
        this.elements = new Map();
        /** Notes about the model that the views show, e.g. truncated symbol collection. */
        this.notes = [];
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

    /** The EEE check that contains the element (or is the element), or null. */
    checkOf(id) {
        const element = this.get(id);
        if (element instanceof EeeCheck) return element;
        return this.checks.find(c => id && id.startsWith(c.id + "::")) || null;
    }

    /** The tool policy that contains the element (or is the element), or null. */
    policyOf(id) {
        const element = this.get(id);
        if (element instanceof ToolPolicy) return element;
        return this.policies.find(p => id && id.startsWith(p.id + "::")) || null;
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

    /** The elements of a kind that an environment declares or inherits, e.g. inScope(this.roles, envId). */
    inScope(all, environmentId) {
        const scope = this.environmentScope(environmentId);
        return all.filter(e => scope.includes(e.environmentId));
    }

    /**
     * The rows and columns of the Tools Roles Methods Matrix of a check: the roles and tools of its MBSE environment,
     * its own ones, and those that its process steps use, in declaration order.
     */
    matrixAxes(check) {
        const used = (all, owned, key) => {
            const ids = new Set([...owned.map(e => e.id), ...this.inScope(all, check.environmentId).map(e => e.id),
                ...check.steps.map(s => s[key]).filter(Boolean)]);
            return all.filter(e => ids.has(e.id));
        };
        return {
            roles: used(this.roles, check.roles, "roleId"),
            tools: used(this.tools, check.tools, "toolId"),
            hasUnassignedRole: check.steps.some(s => !this.get(s.roleId)),
            hasUnassignedTool: check.steps.some(s => !this.get(s.toolId)),
        };
    }

    /** Tools and methods that a tool policy shows: those of its rules and its own, in declaration order. */
    policyAxes(policy) {
        const toolIds = new Set([...policy.tools.map(t => t.id), ...policy.rules.map(r => r.toolId).filter(Boolean)]);
        const methodIds = new Set([...policy.methods.map(m => m.id), ...policy.rules.map(r => r.methodId).filter(Boolean)]);
        this.inScope(this.tools, policy.environmentId).forEach(t => toolIds.add(t.id));
        this.inScope(this.methods, policy.environmentId).forEach(m => methodIds.add(m.id));
        return {
            tools: this.tools.filter(t => toolIds.has(t.id)),
            methods: this.methods.filter(m => methodIds.has(m.id)),
        };
    }

    /** The transitions that start or end at a process step. */
    transitionsOf(step) {
        const check = this.checkOf(step.id);
        return check ? check.transitions.filter(t => t.sourceId === step.id || t.targetId === step.id) : [];
    }

    /** The measures that address a transition. */
    measuresFor(transition) {
        const check = this.checkOf(transition.id);
        if (!check) return [];
        return check.steps.flatMap(s => s.measures).filter(m => m.addressedTransitionIds.includes(transition.id));
    }
}
