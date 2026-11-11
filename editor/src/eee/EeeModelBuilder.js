// Builds the EEE domain model from the symbols of the SysML engine (see engine-core.js).
//
// EEE extends the MBSE methodology concepts of MBSEMethodology (SYSMOD library). The elements are recognized by
// what the engine reports about them, not by their keywords:
// - an element conforms to an EEE or MBSEMethodology definition (symbol.types), e.g. a process step with the keyword
//   #processStep conforms to EEE::ProcessStep, a part subsetting MBSEEnvironment::tools conforms to MBSEMethodology::Tool
// - its metaclass fits the definition, e.g. a role is a part usage, an MBSE environment an occurrence definition;
//   reference usages (":>> role = x;") are the values of an element, not elements
// - processes and methods of a methodology are listed also if they redefine a feature, e.g. the steps of a tailored
//   SYSMOD process ("action :>> setupProject")
// - roles, tools and products that redefine a feature (e.g. "part :>> tools") are not listed, unless a
//   process step or rule refers to them; elements that are referred to but not declared in the user's documents
//   (e.g. a method of a library methodology) become external elements
// - the values of an element are its redefining features (role, tool, method, evaluation, ...), read from their
//   evaluated feature values; the source and target of a transition are its connector ends ("connect a to b")
//
// The builder relies on these semantic facts. The source-specific parts are passed in as hooks:
//   documentOf(id) -> name of the declaring document

import {
    EeeModel, MBSEEnvironment, EeeCheck, Role, Process, Tool, Method, Artifact, ProcessStep, StepTransition, Measure, ToolPolicy, ToolPolicyRule,
} from "./model.js";

/** The EEE and MBSEMethodology definitions whose conformance the engine reports for each symbol. */
export const LANGUAGE_TYPES = [
    "EEE::EeeCheck", "EEE::ProcessStep", "EEE::StepTransition", "EEE::Measure", "EEE::ToolPolicy", "EEE::ToolPolicyRule",
    "MBSEMethodology::MBSEEnvironment", "MBSEMethodology::Role", "MBSEMethodology::Tool", "MBSEMethodology::Process",
    "MBSEMethodology::Method", "MBSEMethodology::Product",
];

// The element class of a symbol: the definition it conforms to and the metaclasses it may have, in priority order
// (a process step is a methodology behavior like a method, so it is tested first).
const KINDS = [
    { type: "EEE::EeeCheck", Class: EeeCheck, kinds: ["occurrenceDefinition", "occurrenceUsage", "partDefinition", "partUsage"] },
    { type: "EEE::ToolPolicy", Class: ToolPolicy, kinds: ["occurrenceDefinition", "occurrenceUsage", "partDefinition", "partUsage"] },
    { type: "MBSEMethodology::MBSEEnvironment", Class: MBSEEnvironment, kinds: ["occurrenceDefinition"] },
    { type: "EEE::ProcessStep", Class: ProcessStep, kinds: ["actionUsage"] },
    { type: "EEE::StepTransition", Class: StepTransition, kinds: ["connectionUsage"] },
    { type: "EEE::Measure", Class: Measure, kinds: ["occurrenceUsage"] },
    { type: "EEE::ToolPolicyRule", Class: ToolPolicyRule, kinds: ["occurrenceUsage"] },
    { type: "MBSEMethodology::Role", Class: Role, kinds: ["partUsage"], environment: true },
    { type: "MBSEMethodology::Tool", Class: Tool, kinds: ["partUsage"], environment: true },
    { type: "MBSEMethodology::Process", Class: Process, kinds: ["actionUsage"] },
    { type: "MBSEMethodology::Method", Class: Method, kinds: ["actionUsage"] },
    { type: "MBSEMethodology::Product", Class: Artifact, kinds: ["itemUsage"], environment: true },
];

const isRedefinition = symbol => (symbol.specializations || []).some(s => s.kind === "redefines");

/** @param {{referenced?: boolean}} options referenced: the element is the value of a reference, so redefinitions count */
export function elementClassOf(symbol, { referenced = false } = {}) {
    if (!symbol.types || !symbol.types.length) return null;
    const kind = KINDS.find(k => symbol.types.includes(k.type) && k.kinds.includes(symbol.kind));
    if (!kind) return null;
    if (kind.environment && isRedefinition(symbol) && !referenced) return null;
    return kind.Class;
}

function ownerOf(id) {
    const i = id.lastIndexOf("::");
    return i < 0 ? "" : id.slice(0, i);
}

function lastSegment(id) {
    const i = id.lastIndexOf("::");
    return i < 0 ? id : id.slice(i + 2);
}

/** The names in a value expression, e.g. "(a, b)" -> ["a", "b"], "P::a" -> ["P::a"]; enum values keep their last segment. */
function namesInValueText(text) {
    return String(text || "").replace(/^\s*\(([\s\S]*)\)\s*$/, "$1").split(",")
        .map(s => s.trim()).filter(s => /^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/.test(s));
}

/**
 * @param {Object<string, object>} symbols the engine symbols by qualified name
 * @param {{documentOf?: function, truncated?: boolean}} hooks
 * @returns {EeeModel}
 */
export function buildEeeModel(symbols, { documentOf = () => "", truncated = false } = {}) {
    const model = new EeeModel();
    if (truncated) model.notes.push("The model is large: only part of it was read.");
    const get = id => symbols[id] || null;

    // 1. The elements, in declaration order (the engine visits the documents depth first).
    for (const symbol of Object.values(symbols)) {
        const Class = elementClassOf(symbol);
        if (!Class) continue;
        const element = model.register(new Class({
            id: symbol.id, name: symbol.name, document: documentOf(symbol.id), doc: (symbol.docs || []).join("\n\n"),
        }));
        if (element instanceof MBSEEnvironment) model.environments.push(element);
        else if (element instanceof EeeCheck) model.checks.push(element);
        else if (element instanceof ToolPolicy) model.policies.push(element);
        else if (element instanceof Role) model.roles.push(element);
        else if (element instanceof Tool) model.tools.push(element);
        else if (element instanceof Method) model.methods.push(element);
        else if (element instanceof Process) model.processes.push(element);
        else if (element instanceof Artifact) model.artifacts.push(element);
    }

    // 2. Owners: the nearest EEE element that contains the element; the environment that declares it.
    const placeElement = element => {
        for (let id = ownerOf(element.id); id; id = ownerOf(id)) {
            if (model.get(id)) { element.ownerId = id; break; }
        }
        if ("environmentId" in element && !(element instanceof EeeCheck) && !(element instanceof ToolPolicy)) {
            for (let id = ownerOf(element.id); id; id = ownerOf(id)) {
                if (model.get(id) instanceof MBSEEnvironment) { element.environmentId = id; break; }
            }
        }
    };
    for (const element of model.elements.values()) placeElement(element);

    // Environments: their general environments and their methodology.
    for (const environment of model.environments) {
        const symbol = get(environment.id);
        environment.generalIds = (symbol.specializations || []).filter(s => s.kind === "specializes").map(s => s.targetId).filter(Boolean);
        const methodology = (symbol.childIds || []).map(get).find(c => c && (c.specializations || [])
            .some(s => s.kind === "redefines" && /(^|::)methodology$/.test(s.targetId)));
        environment.methodologyId = methodology ? methodology.id : null;
    }

    /** Registers an element that is referred to but not listed, e.g. "part :>> tools" or a method of a library. */
    const lists = new Map([[Role, model.roles], [Tool, model.tools], [Method, model.methods], [Artifact, model.artifacts]]);
    const registerReferenced = (id, Class) => {
        if (model.get(id)) return model.get(id);
        if (!lists.has(Class)) return null;
        const symbol = get(id);
        if (symbol && elementClassOf(symbol, { referenced: true }) !== Class) return null;
        const element = model.register(new Class({
            id, name: symbol ? symbol.name : lastSegment(id), document: symbol ? documentOf(id) : "",
            doc: symbol ? (symbol.docs || []).join("\n\n") : "", external: !symbol,
        }));
        placeElement(element);
        lists.get(Class).push(element);
        return element;
    };

    // Resolves a referenced element: from the evaluated value, else by name in the scope of the element.
    const byName = new Map();
    for (const element of model.elements.values()) {
        if (!byName.has(element.name)) byName.set(element.name, []);
        byName.get(element.name).push(element);
    }
    const resolveName = (name, contextId, Class) => {
        if (name.includes("::")) {
            const exact = [...model.elements.values()].find(e => e instanceof Class && (e.id === name || e.id.endsWith("::" + name)));
            return exact ? exact.id : null;
        }
        const candidates = (byName.get(name) || []).filter(e => e instanceof Class);
        // The candidate whose owner encloses the context most closely.
        let best = null, bestLength = -1;
        for (const c of candidates) {
            const scope = ownerOf(c.id);
            if ((contextId === scope || contextId.startsWith(scope + "::") || !scope) && scope.length > bestLength) {
                best = c;
                bestLength = scope.length;
            }
        }
        return best ? best.id : candidates.length === 1 ? candidates[0].id : null;
    };
    /** The value of the feature `feature` of the element: element ids (refs) or literals, as a list. */
    const values = (element, feature, Class = null) => {
        const symbol = get(`${element.id}::${feature}`);
        if (!symbol) return [];
        const raw = symbol.value === undefined ? undefined : Array.isArray(symbol.value) ? symbol.value : [symbol.value];
        if (Class) {
            if (raw && raw.every(v => v && v.ref)) return raw.map(v => v.ref).filter(id => (model.get(id) || registerReferenced(id, Class)) instanceof Class);
            return namesInValueText(symbol.valueText).map(n => resolveName(n, element.id, Class)).filter(Boolean);
        }
        if (raw) return raw.filter(v => v !== null && v !== undefined).map(v => (v && v.ref ? lastSegment(v.ref) : v));
        return namesInValueText(symbol.valueText).map(lastSegment);
    };
    const one = (element, feature, Class) => values(element, feature, Class)[0] || null;

    // 3. Properties and containment.
    for (const element of [...model.elements.values()]) {
        const owner = model.get(element.ownerId);
        if (element instanceof EeeCheck || element instanceof ToolPolicy) {
            // The usage that redefines EeeCheck::environment (ToolPolicy::environment), typed by the environment or bound to it.
            const usage = (get(element.id).childIds || []).map(get).find(c => c && (c.specializations || [])
                .some(sp => sp.kind === "redefines" && /(^|::)environment$/.test(sp.targetId)));
            if (usage) {
                element.environmentUsage = usage.name;
                const typing = (usage.specializations || []).find(sp => sp.kind === "typing" && model.get(sp.targetId) instanceof MBSEEnvironment);
                const value = usage.value && usage.value.ref ? usage.value.ref : null;
                element.environmentId = typing ? typing.targetId : value && model.get(value) instanceof MBSEEnvironment ? value : null;
            }
        }
        if (element instanceof ProcessStep) {
            element.roleId = one(element, "role", Role);
            element.toolId = one(element, "tool", Tool);
            element.methodId = one(element, "method", Method);
            element.goal = String(values(element, "goal")[0] ?? "");
            element.sourceArtifactIds = values(element, "sourceArtifacts", Artifact);
            element.targetArtifactIds = values(element, "targetArtifacts", Artifact);
            element.viewpoints = values(element, "viewpoints").map(String);
            element.automationSteps = values(element, "automationSteps").map(String);
            element.artifactConversions = values(element, "artifactConversions").map(String);
        } else if (element instanceof StepTransition) {
            const end = name => {
                const symbol = get(`${element.id}::${name}`);
                return symbol && symbol.referencedId && model.get(symbol.referencedId) instanceof ProcessStep ? symbol.referencedId : null;
            };
            element.sourceId = end("source");
            element.targetId = end("target");
            const evaluation = String(values(element, "evaluation")[0] || "unrated");
            element.evaluation = ["efficient", "bottleneck"].includes(evaluation) ? evaluation : "unrated";
            const priority = Number(values(element, "priority")[0]);
            element.priority = Number.isFinite(priority) && priority > 0 ? priority : null;
        } else if (element instanceof Measure) {
            element.stepId = owner instanceof ProcessStep ? owner.id : null;
            element.addressedTransitionIds = values(element, "addressedTransitions", StepTransition);
            if (owner instanceof ProcessStep) owner.measures.push(element);
        } else if (element instanceof ToolPolicyRule) {
            element.toolId = one(element, "tool", Tool);
            element.methodId = one(element, "method", Method);
            const status = String(values(element, "status")[0] || "");
            element.status = ["recommended", "allowed", "forbidden"].includes(status) ? status : "";
            const policy = model.policyOf(element.id);
            if (policy) policy.rules.push(element);
        }

        const check = !(element instanceof EeeCheck) ? model.checkOf(element.id) : null;
        if (check) {
            if (element instanceof Role) check.roles.push(element);
            else if (element instanceof Tool) check.tools.push(element);
            else if (element instanceof Method) check.methods.push(element);
            else if (element instanceof Artifact) check.artifacts.push(element);
            else if (element instanceof ProcessStep) check.steps.push(element);
            else if (element instanceof StepTransition) check.transitions.push(element);
        }
        const policy = !(element instanceof ToolPolicy) ? model.policyOf(element.id) : null;
        if (policy) {
            if (element instanceof Tool) policy.tools.push(element);
            else if (element instanceof Method) policy.methods.push(element);
        }
    }
    return model;
}
