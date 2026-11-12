// Builds the domain model from the symbols of the SysML engine (see engine-core.js).
//
// The DTFA extends the MBSE methodology concepts of MBSEMethodology (SYSMOD library). The elements are recognized by
// what the engine reports about them, not by their keywords:
// - an element conforms to a DTFA or MBSEMethodology definition (symbol.types), e.g. a part subsetting
//   MBSEEnvironment::tools conforms to MBSEMethodology::Tool, an analysis typed by DTFA::DigitalThreadFlowAnalysis
//   is a flow analysis
// - its metaclass fits the definition, e.g. a role is a part usage, an MBSE environment an occurrence definition;
//   reference usages (":>> primaryPerformer = x;") are the values of an element, not elements
// - processes and methods of a methodology are listed also if they redefine a feature, e.g. the methods of the
//   company methodology as a team performs them ("action :>> sysmodArchitecture { ... }")
// - the values of an element are its redefining features, read from their evaluated feature values; the ends of a
//   connection are its connector ends ("connect a to b")
// - the process steps of a flow analysis are the methods of the methodology of its environment with a primary
//   performer or a facilitation tool; a hand-over is a product that is an output of one step and an input of another
//
// The builder relies on these semantic facts. The source-specific parts are passed in as hooks:
//   documentOf(id) -> name of the declaring document

import {
    DtfaModel, MBSEEnvironment, FlowAnalysis, Role, Process, Tool, Method, Artifact, Step, Handover, ToolTransition, Measure, ToolPolicyRule,
} from "./model.js";

/** The DTFA and MBSEMethodology definitions whose conformance the engine reports for each symbol. */
export const LANGUAGE_TYPES = [
    "DTFA::DigitalThreadFlowAnalysis", "DTFA::ToolTransition", "DTFA::Measure", "DTFA::ToolPolicyRule", "DTFA::StepDefinition",
    "MBSEMethodology::MBSEEnvironment", "MBSEMethodology::Role", "MBSEMethodology::Tool", "MBSEMethodology::Process",
    "MBSEMethodology::Method", "MBSEMethodology::Product", "MBSEMethodology::Methodology", "MBSEMethodology::MethodologyBehavior",
];

/** The packages of the languages: their features are the metamodel, not elements of the user's methodology. */
export const LANGUAGE_PACKAGES = ["MBSEMethodology", "DTFA"];
const inLanguage = id => LANGUAGE_PACKAGES.some(p => id === p || id.startsWith(p + "::"));

/**
 * The analysis options for the engine: the language types, and the elements whose inherited features are collected
 * (environments, methodologies, processes and methods inherit, e.g., the steps of a library process).
 */
export const ANALYSIS_OPTIONS = {
    languageTypes: LANGUAGE_TYPES,
    inheritingTypes: ["MBSEMethodology::MBSEEnvironment", "MBSEMethodology::Methodology", "MBSEMethodology::MethodologyBehavior"],
    languagePackages: LANGUAGE_PACKAGES,
};

const BEHAVIOR = "MBSEMethodology::MethodologyBehavior";
const RULE = "DTFA::ToolPolicyRule";
const SLOT_OWNERS = [BEHAVIOR, "MBSEMethodology::Methodology", "MBSEMethodology::MBSEEnvironment"];
// The features and connections through which a methodology declares the performers and tools of its behaviors.
const PERFORMER_FEATURES = { "MBSEMethodology::MethodologyBehavior::primaryPerformer": "primary", "MBSEMethodology::MethodologyBehavior::additionalPerformers": "additional" };
const TOOL_FEATURE = "MBSEMethodology::MethodologyBehavior::facilitationTools";
const CONNECTIONS = { "MBSEMethodology::ResponsibleForConnection": "primary", "MBSEMethodology::SupportsConnection": "additional", "MBSEMethodology::FacilitatesConnection": "tool" };

// The element class of a symbol: the definition it conforms to and the metaclasses it may have, in priority order.
const KINDS = [
    { type: "DTFA::DigitalThreadFlowAnalysis", Class: FlowAnalysis, kinds: ["analysisCaseUsage"] },
    { type: "MBSEMethodology::MBSEEnvironment", Class: MBSEEnvironment, kinds: ["occurrenceDefinition"] },
    { type: "DTFA::ToolTransition", Class: ToolTransition, kinds: ["connectionUsage"] },
    { type: RULE, Class: ToolPolicyRule, kinds: ["connectionUsage"] },
    { type: "DTFA::Measure", Class: Measure, kinds: ["occurrenceUsage"] },
    // Usages in an environment, and definitions, e.g. the processes of ISO15288Processes ("action def X :> Process").
    { type: "MBSEMethodology::Role", Class: Role, kinds: ["partUsage", "partDefinition"], environment: true },
    { type: "MBSEMethodology::Tool", Class: Tool, kinds: ["partUsage", "partDefinition"], environment: true },
    { type: "MBSEMethodology::Process", Class: Process, kinds: ["actionUsage", "actionDefinition"] },
    { type: "MBSEMethodology::Method", Class: Method, kinds: ["actionUsage", "actionDefinition"] },
    { type: "MBSEMethodology::Product", Class: Artifact, kinds: ["itemUsage", "itemDefinition"], environment: true },
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

const FRAMING_KINDS = /^(concern|requirement|viewpoint|useCase|constraint)(Definition|Usage)$/;

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
 * @param {{documentOf?: function, truncated?: boolean, generals?: object, libraryNames?: string[]}} hooks
 * @returns {DtfaModel}
 */
export function buildDtfaModel(symbols, { documentOf = () => "", truncated = false, generals = {}, libraryNames = [] } = {}) {
    const model = new DtfaModel();
    if (truncated) model.notes.push("The model is large: only part of it was read.");
    const get = id => symbols[id] || null;
    model.generals = generals;
    const isBehavior = id => { const symbol = get(id); return !!symbol && (symbol.types || []).includes(BEHAVIOR); };
    /** True if a behavior owns the element, e.g. a performer or a parameter of a process: not a role, tool or product of an environment. */
    const ownedByBehavior = id => { for (let o = ownerOf(id); o; o = ownerOf(o)) if (isBehavior(o)) return true; return false; };
    const ownedByFramingElement = id => { for (let o = ownerOf(id); o; o = ownerOf(o)) if (symbols[o] && FRAMING_KINDS.test(symbols[o].kind)) return true; return false; };
    /** The general types of an element that are not part of the languages, e.g. ISO15288Processes::Stakeholders::SystemArchitect. */
    const typesOf = symbol => (symbol.generalIds || []).filter(g => !inLanguage(g));
    /** The doc of an element, or the doc that it inherits from its first general type with a doc. */
    const inheritedDoc = symbol => {
        if (symbol.docs && symbol.docs.length) return null;
        // Not the docs of the language (e.g. of MBSEMethodology::Tool): they describe the concept, not the element.
        for (const g of (symbol.generalIds || []).filter(g => !inLanguage(g))) {
            const info = generals[g] || get(g);
            if (info && info.docs && info.docs.length) return { text: info.docs.join("\n\n"), fromId: g, fromName: info.name || lastSegment(g) };
        }
        return null;
    };

    // 1. The elements, in declaration order (the engine visits the documents depth first). The features that elements
    //    inherit from library definitions are symbols, too: they are elements where they are used, e.g. the steps of
    //    a library process inherited by the process of an environment.
    for (const symbol of Object.values(symbols)) {
        if (inLanguage(symbol.id)) continue;
        const Class = elementClassOf(symbol);
        if (!Class) continue;
        if ((Class === Role || Class === Tool || Class === Artifact) && ownedByBehavior(symbol.id)) continue;
        // Stakeholders of concerns and requirements (e.g. "stakeholder acquirer : Acquirer" in ISO15288Processes::Concerns)
        // and subjects of viewpoints are not roles, tools or products of a methodology.
        if ((Class === Role || Class === Tool || Class === Artifact) && ownedByFramingElement(symbol.id)) continue;
        const document = documentOf(symbol.id);
        const element = model.register(new Class({
            id: symbol.id, name: symbol.name, document, doc: (symbol.docs || []).join("\n\n"),
        }));
        element.library = libraryNames.includes(document);
        element.isDefinition = /Definition$/.test(symbol.kind);
        element.typeIds = typesOf(symbol);
        element.inheritedDoc = inheritedDoc(symbol);
        element.inheritedIds = symbol.inheritedIds || [];
        if (element instanceof MBSEEnvironment) model.environments.push(element);
        else if (element instanceof FlowAnalysis) model.analyses.push(element);
        else if (element instanceof ToolPolicyRule) model.rules.push(element);
        else if (element instanceof Role) model.roles.push(element);
        else if (element instanceof Tool) model.tools.push(element);
        else if (element instanceof Method) model.methods.push(element);
        else if (element instanceof Process) model.processes.push(element);
        else if (element instanceof Artifact) model.artifacts.push(element);
    }

    // 2. Owners: the nearest registered element that contains the element; the environment that declares it.
    const placeElement = element => {
        for (let id = ownerOf(element.id); id; id = ownerOf(id)) {
            if (model.get(id)) { element.ownerId = id; break; }
        }
        if ("environmentId" in element) {
            for (let id = ownerOf(element.id); id; id = ownerOf(id)) {
                if (model.get(id) instanceof MBSEEnvironment) { element.environmentId = id; break; }
            }
        }
    };
    for (const element of model.elements.values()) placeElement(element);

    // Redefinitions, transitively: e.g. a team's method redefines a method of the company methodology.
    const directRedefined = id => (get(id) && get(id).specializations || []).filter(sp => sp.kind === "redefines" && sp.targetId).map(sp => sp.targetId);
    for (const element of model.elements.values()) {
        const result = [];
        const visit = id => directRedefined(id).forEach(t => { if (!result.includes(t) && !inLanguage(t)) { result.push(t); visit(t); } });
        visit(element.id);
        element.redefinedIds = result;
        // A redefined feature (e.g. the company's method that the team performs) is not a general type to show.
        element.typeIds = element.typeIds.filter(t => !result.includes(t));
    }

    // Environments: their general environments and their methodology.
    const redefinesMethodology = c => c && (c.specializations || []).some(sp => sp.kind === "redefines" && /(^|::)methodology$/.test(sp.targetId));
    for (const environment of model.environments) {
        const symbol = get(environment.id);
        environment.generalIds = (symbol.specializations || []).filter(s => s.kind === "specializes").map(s => s.targetId).filter(Boolean);
        // Its own redefinition of MBSEEnvironment::methodology, or a redefinition of the methodology of a general
        // environment ("part :>> companyMethodology"), or the inherited one (e.g. SYSMODEnvironment::sysmod).
        const owned = (symbol.childIds || []).map(get).filter(Boolean);
        const methodology = owned.find(c => redefinesMethodology(c) || (c.kind === "partUsage" && (c.types || []).includes("MBSEMethodology::Methodology")))
            || (symbol.inheritedIds || []).map(get).find(redefinesMethodology) || null;
        environment.methodologyId = methodology ? methodology.id : null;
        environment.methodologyName = methodology ? methodology.name : "";
        environment.behaviorIds = methodology
            ? [...(methodology.childIds || []), ...(methodology.inheritedIds || [])].filter(id => { const e = model.get(id); return e instanceof Method || e instanceof Process; })
            : [];
    }
    // An environment without a methodology of its own uses the methodology of the environment it specializes.
    for (const environment of model.environments) {
        if (environment.methodologyId) continue;
        const general = model.environmentScope(environment.id).map(id => model.get(id)).find(e => e.methodologyId);
        if (general) environment.methodologyName = general.methodologyName;
    }

    // Inherited members: the registered elements among the inherited features, e.g. the roles of a library environment.
    for (const element of model.elements.values()) element.inheritedIds = element.inheritedIds.filter(id => model.get(id));

    // Values of features: element ids (refs) or literals.
    const rawValues = symbol => (symbol.value === undefined ? [] : Array.isArray(symbol.value) ? symbol.value : [symbol.value]);
    const valueOf = (ownerId, feature) => get(`${ownerId}::${feature}`);
    const refs = (ownerId, feature) => {
        const symbol = valueOf(ownerId, feature);
        return symbol ? rawValues(symbol).filter(v => v && v.ref).map(v => v.ref) : [];
    };
    const literals = (ownerId, feature) => {
        const symbol = valueOf(ownerId, feature);
        if (!symbol) return [];
        const raw = rawValues(symbol);
        if (raw.length) return raw.filter(v => v !== null && v !== undefined).map(v => (v && v.ref ? lastSegment(v.ref) : v));
        return namesInValueText(symbol.valueText).map(lastSegment);
    };
    /** The end of a connection: the feature that the connector end references (also through a feature chain). */
    const endOf = (connectionId, endIndex) => {
        const ends = (get(connectionId).childIds || []).map(get).filter(e => e && (e.referencedId || (e.specializations || []).some(sp => sp.kind === "subsets" && sp.chain)));
        const end = ends[endIndex];
        if (!end) return null;
        if (end.referencedId) return end.referencedId;
        const chained = (end.specializations || []).find(sp => sp.kind === "subsets" && sp.chain);
        return chained ? chained.targetId : null;
    };
    /** The element for an id that may be a redefined one: the element itself, or the element that redefines it. */
    const elementFor = (id, Class) => {
        const direct = model.get(id);
        if (direct instanceof Class) return direct;
        return [...model.elements.values()].find(e => e instanceof Class && e.redefinedIds.includes(id)) || null;
    };

    // 3. Tool policy rules: the tool, the method and the status of the rated facilitates connections.
    for (const rule of model.rules) {
        rule.toolId = endOf(rule.id, 0);
        rule.methodId = endOf(rule.id, 1);
        const status = String(literals(rule.id, "status")[0] || "");
        rule.status = ["recommended", "allowed", "forbidden"].includes(status) ? status : "";
        const environment = model.get(rule.environmentId);
        if (environment) environment.rules.push(rule);
    }

    // Declared performers and tools of the behaviors: features that subset primaryPerformer, additionalPerformers or
    // facilitationTools (e.g. "ref part projectManager : ProjectManager :>> primaryPerformer"), and the connections
    // ResponsibleFor, Supports and Facilitates (e.g. "connection :> responsibleFor connect systemArchitect to step").
    // A slot is matched with the roles and tools of an environment by its value or by its types (model.performersOf).
    const slotOf = (slotSymbol, kind) => ({ slotId: slotSymbol.id, kind, typeIds: typesOf(slotSymbol), valueIds: rawValues(slotSymbol).filter(v => v && v.ref).map(v => v.ref) });
    const slotsByBehavior = new Map();
    const addSlot = (behaviorId, slot) => {
        if (!slotsByBehavior.has(behaviorId)) slotsByBehavior.set(behaviorId, []);
        const list = slotsByBehavior.get(behaviorId);
        if (!list.some(x => x.slotId === slot.slotId && x.kind === slot.kind)) list.push(slot);
    };
    for (const symbol of Object.values(symbols)) {
        // Behaviors, methodologies and environments may declare the performers and tools of behaviors.
        if (!(symbol.types || []).some(t => SLOT_OWNERS.includes(t))) continue;
        for (const featureId of [...(symbol.childIds || []), ...(symbol.inheritedIds || [])]) {
            const feature = get(featureId);
            if (!feature) continue;
            const generalIds = feature.generalIds || [];
            for (const [base, kind] of Object.entries(PERFORMER_FEATURES)) if (generalIds.includes(base)) addSlot(symbol.id, slotOf(feature, kind));
            if (generalIds.includes(TOOL_FEATURE)) addSlot(symbol.id, slotOf(feature, "tool"));
            const connection = Object.entries(CONNECTIONS).find(([def]) => generalIds.includes(def));
            // Tool policy rules are facilitates connections, too; they rate tools, they do not assign them.
            if (feature.kind === "connectionUsage" && connection && !generalIds.includes(RULE)) {
                // "connect <performer or tool> to <behavior>": the ends in the order of the connection definition.
                const ends = [endOf(feature.id, 0), endOf(feature.id, 1)].filter(Boolean);
                const behaviorEnd = ends.find(isBehavior) || ends[1], slotEnd = ends.find(e => e !== behaviorEnd && get(e));
                if (behaviorEnd && slotEnd) addSlot(behaviorEnd, slotOf(get(slotEnd), connection[1]));
            }
        }
    }

    // The parameters of behaviors: features that subset MethodologyBehavior::inputs or ::outputs, e.g. of a process definition.
    const IO = { "MBSEMethodology::MethodologyBehavior::inputs": "inputFeatures", "MBSEMethodology::MethodologyBehavior::outputs": "outputFeatures" };
    for (const element of model.elements.values()) {
        if (!(element instanceof Method || element instanceof Process)) continue;
        element.inputFeatures = [];
        element.outputFeatures = [];
        for (const child of (get(element.id).childIds || []).map(get).filter(Boolean)) {
            for (const [base, list] of Object.entries(IO)) {
                if ((child.generalIds || []).includes(base)) {
                    element[list].push({ id: child.id, name: child.name, typeIds: typesOf(child).filter(t => !(child.specializations || []).some(sp => sp.kind !== "typing" && sp.targetId === t)) });
                }
            }
        }
    }

    // The successions of behaviors ("first a then b"), owned and inherited: [{ sourceId, targetId }], with "start" and
    // "done" for the start and the end of the behavior (Actions::Action::start, ::done).
    const succEnd = id => (id === "Actions::Action::start" ? "start" : id === "Actions::Action::done" ? "done" : id);
    for (const element of model.elements.values()) {
        if (!(element instanceof Method || element instanceof Process)) continue;
        const symbol = get(element.id);
        element.successions = [...(symbol.childIds || []), ...(symbol.inheritedIds || [])].map(get)
            .filter(s => s && s.kind === "successionAsUsage")
            .map(s => ({ sourceId: succEnd(endOf(s.id, 0)), targetId: succEnd(endOf(s.id, 1)) }))
            .filter(s => s.sourceId && s.targetId);
    }

    // Behaviors: their slots (also those of the behaviors they redefine or subset), inputs, outputs and step definition.
    const artifactIds = ids => ids.map(id => elementFor(id, Artifact)).filter(Boolean).map(a => a.id);
    for (const element of model.elements.values()) {
        if (!(element instanceof Method || element instanceof Process)) continue;
        const symbol = get(element.id);
        const ids = [element.id, ...element.redefinedIds, ...(symbol.specializations || []).filter(sp => sp.kind === "subsets").map(sp => sp.targetId)];
        element.slots = ids.flatMap(id => slotsByBehavior.get(id) || []);
        // The values of the most specific declaration win (a redefinition without inputs keeps the inherited ones).
        const firstWith = feature => ids.find(id => valueOf(id, feature) && refs(id, feature).length) || element.id;
        element.inputIds = artifactIds(refs(firstWith("inputs"), "inputs"));
        element.outputIds = artifactIds(refs(firstWith("outputs"), "outputs"));
        // The step definition: a metadata usage of DTFA::StepDefinition owned by the method or by a method it redefines.
        const definition = ids.map(id => (get(id) && get(id).childIds || []).map(get).find(c => c && c.kind === "metadataUsage"
            && ((c.types || []).includes("DTFA::StepDefinition") || (c.specializations || []).some(sp => sp.targetId === "DTFA::StepDefinition")))).find(Boolean);
        if (definition) {
            element.stepDefinitionId = definition.id.startsWith(element.id + "::") ? definition.id : null;
            element.inheritedStepDefinitionId = definition.id;
            element.goal = String(literals(definition.id, "goal")[0] ?? "");
            element.viewpoints = literals(definition.id, "viewpoints").map(String);
            element.automationSteps = literals(definition.id, "automationSteps").map(String);
        }
    }

    // 4. Flow analyses: owned by an environment; their tool transitions and measures.
    for (const analysis of model.analyses) {
        for (let id = ownerOf(analysis.id); id; id = ownerOf(id)) {
            if (model.get(id) instanceof MBSEEnvironment) { analysis.environmentId = id; break; }
        }
        const environment = model.get(analysis.environmentId);
        if (environment) environment.analyses.push(analysis);
    }
    for (const element of model.elements.values()) {
        if (element instanceof ToolTransition || element instanceof Measure) {
            const analysis = model.analysisOf(element.id);
            element.analysisId = analysis ? analysis.id : null;
            if (!analysis) continue;
            if (element instanceof Measure) {
                // A sequence of connections may not evaluate; then the names are resolved among the analysis' transitions.
                const addressed = refs(element.id, "addressedTransitions").filter(id => model.get(id) instanceof ToolTransition);
                const symbol = valueOf(element.id, "addressedTransitions");
                element.addressedTransitionIds = addressed.length || !symbol ? addressed : namesInValueText(symbol.valueText)
                    .map(n => [...model.elements.values()].find(e => e instanceof ToolTransition && e.id === `${analysis.id}::${lastSegment(n)}`))
                    .filter(Boolean).map(e => e.id);
                analysis.measures.push(element);
                continue;
            }
            const tool = id => { const t = id && elementFor(id, Tool); return t ? t.id : null; };
            element.sourceId = tool(endOf(element.id, 0));
            element.targetId = tool(endOf(element.id, 1));
            element.productIds = artifactIds(refs(element.id, "products"));
            const rating = String(literals(element.id, "rating")[0] || "unrated");
            element.rating = ["efficient", "bottleneck"].includes(rating) ? rating : "unrated";
            const priority = Number(literals(element.id, "priority")[0]);
            element.priority = Number.isFinite(priority) && priority > 0 ? priority : null;
            element.explanation = String(literals(element.id, "explanation")[0] ?? "");
            element.conversions = literals(element.id, "conversions").map(String);
            analysis.transitions.push(element);
        }
    }

    // 5. Derived: the process steps and hand-overs of each analysis.
    for (const analysis of model.analyses) deriveFlow(model, analysis);
    return model;
}

/** The process steps of an analysis (methods with a role or a tool) and the hand-overs of products between them. */
export function deriveFlow(model, analysis) {
    analysis.steps = [];
    analysis.handovers = [];
    if (!analysis.environmentId) return;
    const environmentId = analysis.environmentId;
    for (const { element } of model.methodologyTree(environmentId)) {
        if (!(element instanceof Method)) continue;
        const roles = model.performersOf(element, environmentId, ["primary"]);
        const tools = model.performersOf(element, environmentId, ["tool"]);
        if (!roles.length && !tools.length) continue;
        analysis.steps.push(new Step(element, {
            roleId: roles[0] && roles[0].id, toolId: tools[0] && tools[0].id, roleIds: roles.map(r => r.id), toolIds: tools.map(t => t.id),
        }));
    }
    for (const source of analysis.steps) {
        for (const target of analysis.steps) {
            if (source === target) continue;
            const productIds = source.targetArtifactIds.filter(id => target.sourceArtifactIds.includes(id));
            if (!productIds.length) continue;
            const handover = model.register(new Handover({
                id: `${analysis.id}::<${source.id} -> ${target.id}>`, name: `${source.name} → ${target.name}`,
                analysisId: analysis.id, sourceId: source.id, targetId: target.id, productIds,
            }));
            handover.ownerId = analysis.id;
            handover.transition = transitionFor(analysis, source.toolId, target.toolId, productIds);
            analysis.handovers.push(handover);
        }
    }
}

/**
 * The tool transition that rates a hand-over: a transition between the two tools for one of its products, else one
 * between the two tools without products. Null if the analysis has none.
 */
export function transitionFor(analysis, sourceToolId, targetToolId, productIds) {
    if (!sourceToolId || !targetToolId) return null;
    const between = analysis.transitions.filter(t => t.sourceId === sourceToolId && t.targetId === targetToolId);
    return between.find(t => t.productIds.some(id => productIds.includes(id))) || between.find(t => !t.productIds.length) || null;
}
