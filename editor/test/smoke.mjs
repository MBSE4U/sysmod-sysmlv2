// Smoke test of the editor's engine, model and text layers in Node, without a browser.
//
// Usage (from the editor directory):
//   node tools/fetch-engine.mjs          (once: the engine package in vendor/)
//   node test/smoke.mjs [--repo <sysmod-sysmlv2 repository>]
// The libraries (MBSEMethodology, DTFA, SYSMOD) and examples are read from the repository (default: the parent directory).

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";

import { config } from "../src/config.js";
import { analyze as analyzeWith, createEngine } from "../src/engine/engine-core.js";
import { buildFromAnalysis } from "../src/workspace/TextModelProvider.js";
import { ANALYSIS_OPTIONS } from "../src/dtfa/DtfaModelBuilder.js";
import { analyzeFlow, analyzeAll } from "../src/dtfa/DtfaAnalyzer.js";
import { behaviorEdits } from "../src/dtfa/edits.js";
import {
    TextModelEditor, applyEditsToText, toolTransitionLines, measureLines, policyRuleLines, environmentElementLines, analysisLines, methodLines,
    stringLiteral, listValue,
} from "../src/workspace/TextModelEditor.js";
import { SNIPPETS, emptyPackage, environmentDocument } from "../src/dtfa/templates.js";
import { buildOutline } from "../src/text/sysml-text.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const repoArg = args[0] === "--repo" ? args[1] : null;
const repo = [repoArg, resolve(root, "..")]
    .filter(Boolean).map(d => resolve(d)).find(d => existsSync(resolve(d, "MBSEMethodology.sysml")) && existsSync(resolve(d, "DTFA.sysml")));
if (!repo) {
    console.error("MBSEMethodology.sysml and DTFA.sysml not found. Usage: node test/smoke.mjs [--repo <sysmod-sysmlv2 repository>]");
    process.exit(2);
}
const read = path => readFileSync(resolve(repo, path), "utf8");

const enginePackage = resolve(root, config.engine.sources[0].base);
const engineFile = kind => {
    const path = resolve(enginePackage, config.engine.files[kind].path);
    if (!existsSync(path)) {
        console.error(`${path} is missing. Run "node tools/fetch-engine.mjs" first.`);
        process.exit(2);
    }
    const bytes = readFileSync(path);
    return config.engine.files[kind].gzip ? gunzipSync(bytes) : bytes;
};
const engine = await createEngine(engineFile("glue").toString("utf8"), engineFile("wasm"), {
    libraryBundle: engineFile("libraryBundle").toString("utf8"),
    libraryPrepared: new Uint8Array(engineFile("libraryPrepared")),
});
console.log("engine", engine.version, "· libraries from", repo);

let failures = 0;
const check = (label, fn) => {
    try { fn(); console.log("ok  ", label); }
    catch (e) { failures++; console.log("FAIL", label, "\n     ", e.message); }
};

const libraries = config.libraries.map(l => ({ name: l.name, content: read(l.name) }));
const libraryNames = libraries.map(l => l.name);
const load = documents => buildFromAnalysis(
    analyzeWith(engine, [...libraries, ...documents], { libraryNames, ...ANALYSIS_OPTIONS }), [...libraries, ...documents], { libraryNames });
const errorsOf = result => result.diagnostics.filter(d => d.severity === "error");

// --- the library itself ---
const alone = load([]);
check("MBSEMethodology and DTFA libraries have no errors or warnings", () =>
    assert.deepEqual(alone.diagnostics.filter(d => ["MBSEMethodology.sysml", "DTFA.sysml"].includes(d.file)), []));
check("all libraries have no errors", () => assert.deepEqual(errorsOf(alone), []));
check("the editor includes every library file of the repository (read-only)", () => {
    const files = readdirSync(repo).filter(f => f.endsWith(".sysml")).sort();
    assert.deepEqual(config.libraries.map(l => l.name).sort(), files);
});

// --- Example: control unit engineering ---
const exampleDocument = { name: "DTFAControlUnit.sysml", content: read("examples/DTFAControlUnit.sysml") };
const example = load([exampleDocument]);
const model = example.model;
const P = "DTFAExampleControlUnit::";
const TEAM = P + "ControlUnitTeamEnvironment", COMPANY = P + "CompanyEnvironment";
const flow = model.analyses[0];
const id = name => `${TEAM}::flowAnalysis::${name}`;
const method = name => `${TEAM}::companyMethodology::${name}`;
const handover = (a, b) => flow.handovers.find(h => model.nameOf(h.sourceId) === a && model.nameOf(h.targetId) === b);

check("example has no errors and no warnings", () => assert.deepEqual(example.diagnostics.filter(d => d.file === exampleDocument.name), []));
check("MBSE environments: the company environment and the team environment that specializes it", () => {
    assert.deepEqual(model.environments.map(e => e.name), ["CompanyEnvironment", "ControlUnitTeamEnvironment"]);
    assert.deepEqual(model.get(TEAM).generalIds, [COMPANY]);
    assert.equal(model.get(COMPANY).methodologyId, COMPANY + "::companyMethodology");
    assert.equal(model.get(TEAM).methodologyId, TEAM + "::companyMethodology", "the team redefines the company methodology");
    assert.deepEqual(model.environmentScope(TEAM), [TEAM, COMPANY]);
});
check("the flow analysis is an analysis of the team environment", () => {
    assert.deepEqual(model.analyses.map(a => a.id), [TEAM + "::flowAnalysis"]);
    assert.equal(flow.environmentId, TEAM);
    assert.deepEqual(model.get(TEAM).analyses, [flow]);
});
check("roles, tools, methods and products of the environments", () => {
    assert.deepEqual(model.tools.map(t => t.name), ["wordProcessor", "requirementsTool", "modelingTool", "spreadsheet", "ide", "testTool"]);
    assert.ok(model.tools.every(t => t.environmentId === COMPANY));
    assert.equal(model.inScope(model.roles, TEAM).length, 4);
    assert.equal(model.inScope(model.roles, COMPANY).length, 0);
    assert.equal(model.inScope(model.artifacts, TEAM).length, 6);
    // The team's methods redefine those of the company: the scope lists the team's ones only.
    assert.deepEqual(model.inScope(model.methods, TEAM).map(m => m.id), model.methodologyTree(TEAM).map(n => n.element.id));
    assert.ok(model.methodologyTree(TEAM).every(n => n.element.id.startsWith(TEAM)));
});
check("process steps are the methods that a role performs with a tool", () => {
    assert.deepEqual(flow.steps.map(s => s.name), ["stakeholderInterviews", "textualRequirements", "sysmodArchitecture", "interfaceDefinition", "codeReview", "requirementsBasedTesting"]);
    const step = flow.stepOf(method("sysmodArchitecture"));
    assert.equal(model.nameOf(step.roleId), "systemArchitect");
    assert.equal(model.nameOf(step.toolId), "modelingTool");
    assert.deepEqual(step.method.redefinedIds, [COMPANY + "::companyMethodology::sysmodArchitecture"]);
    assert.equal(step.goal, "Define a system architecture that satisfies the requirements");
    assert.deepEqual(step.viewpoints, ["Requirements traced to architecture elements", "Functional architecture"]);
    assert.deepEqual(step.automationSteps, ["Architecture document generated from the model"]);
    assert.deepEqual(step.sourceArtifactIds.map(i => model.nameOf(i)), ["requirementsSpecification"]);
    assert.deepEqual(flow.stepOf(method("codeReview")).sourceArtifactIds.map(i => model.nameOf(i)), ["interfaceList", "requirementsSpecification"]);
});
check("hand-overs: products from one step to the next, rated by tool transitions", () => {
    assert.equal(flow.handovers.length, 6);
    const h = handover("textualRequirements", "sysmodArchitecture");
    assert.deepEqual(h.productIds.map(i => model.nameOf(i)), ["requirementsSpecification"]);
    assert.equal(h.transition.id, id("requirementsToModel"));
    assert.equal(h.rating, "bottleneck");
    assert.equal(h.priority, 1);
    assert.equal(handover("textualRequirements", "requirementsBasedTesting").rating, "unrated");
    assert.equal(handover("textualRequirements", "requirementsBasedTesting").transition, null);
});
check("tool transitions: tools, rating, priority, explanation, conversions", () => {
    const t = model.get(id("requirementsToModel"));
    assert.equal(model.nameOf(t.sourceId), "requirementsTool");
    assert.equal(model.nameOf(t.targetId), "modelingTool");
    assert.equal(t.rating, "bottleneck");
    assert.equal(t.priority, 1);
    assert.equal(t.explanation, "The requirements are copied manually from the requirements tool into the model.");
    assert.deepEqual(t.conversions, ["Requirements copied manually from the requirements tool into the model"]);
    assert.equal(model.get(id("notesToRequirements")).rating, "efficient");
});
check("measures and their addressed tool transitions (also a sequence of connections)", () => {
    const measure = model.get(id("modelInterfaces"));
    assert.deepEqual(measure.addressedTransitionIds.map(i => model.nameOf(i)), ["modelToSpreadsheet", "spreadsheetToCode"]);
    assert.ok(measure.doc.startsWith("Define the interfaces"));
    assert.deepEqual(model.measuresFor(model.get(id("requirementsToModel"))).map(m => m.name), ["linkRequirements"]);
});
check("tool policy: rated facilitates connections of the company environment apply to the team's methods", () => {
    assert.equal(model.get(COMPANY).rules.length, 5);
    assert.equal(model.rulesOf(TEAM).length, 5);
    assert.equal(model.policyStatus(TEAM, COMPANY + "::spreadsheet", method("interfaceDefinition")).status, "forbidden");
    assert.equal(model.policyStatus(TEAM, COMPANY + "::wordProcessor", method("textualRequirements")).status, "allowed");
    // A policy rule rates a tool; it does not make the tool the tool of a process step.
    assert.deepEqual(model.performersOf(model.get(method("interfaceDefinition")), TEAM, ["tool"]).map(t => t.name), ["spreadsheet"]);
});
check("analyzer: hand-over kinds, progress and findings", () => {
    const analysis = analyzeFlow(model, flow);
    assert.equal(analysis.kinds.get(handover("sysmodArchitecture", "interfaceDefinition").id).label, "tool break");
    assert.equal(analysis.kinds.get(handover("textualRequirements", "sysmodArchitecture").id).label, "tool break and human interface");
    assert.deepEqual(analysis.bottlenecks.map(t => t.priority), [1, 2, 3]);
    assert.equal(analysis.progress[2].done, false);
    assert.equal(analysis.progress[4].done, true);
    assert.ok(analysis.findings.some(f => f.step === 1 && /forbids/.test(f.message)), "forbidden combination is reported");
    assert.ok(analysis.findings.some(f => f.step === 2 && /requirementsBasedTesting/.test(f.message)), "unrated hand-over is reported");
    assert.ok(analysis.findings.some(f => f.step === 3 && /textualRequirements/.test(f.message)), "missing goal is reported");
});
check("matrix axes", () => {
    const axes = model.matrixAxes(flow);
    assert.equal(axes.roles.length, 4);
    assert.equal(axes.tools.length, 6);
    assert.equal(axes.hasUnassignedRole, false);
});

// --- Text model editor ---
const session = () => {
    const documents = [{ ...exampleDocument }];
    const apply = edits => { documents[0].content = applyEditsToText(documents[0].content, edits); };
    const reload = () => load(documents);
    const editorFor = result => new TextModelEditor({ locate: result.locate, documentText: () => documents[0].content });
    return { documents, apply, reload, editorFor };
};
check("text editor sets, changes and removes values", () => {
    const { documents, apply, reload, editorFor } = session();
    let result = reload();
    apply(editorFor(result).setValue(id("notesToRequirements"), "rating", "DTFA::TransitionRating::bottleneck"));
    result = reload();
    apply(editorFor(result).setValue(id("notesToRequirements"), "priority", "4"));
    result = reload();
    apply(editorFor(result).setValue(id("requirementsToModel"), "priority", null));
    result = reload();
    apply(editorFor(result).setValue(id("requirementsToModel"), "explanation", stringLiteral('Copied "by hand"')));
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.equal(result.model.get(id("notesToRequirements")).rating, "bottleneck");
    assert.equal(result.model.get(id("notesToRequirements")).priority, 4);
    assert.equal(result.model.get(id("requirementsToModel")).priority, null);
    assert.equal(result.model.get(id("requirementsToModel")).explanation, 'Copied "by hand"');

    // doc comments: change, insert into a body, insert into a declaration without body
    apply(editorFor(result).setDoc(TEAM + "::requirementsEngineer", "Writes the requirements."));
    result = reload();
    apply(editorFor(result).setDoc(TEAM + "::sourceCode", "The code."));
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.equal(result.model.get(TEAM + "::requirementsEngineer").doc, "Writes the requirements.");
    assert.equal(result.model.get(TEAM + "::sourceCode").doc, "The code.");
});
check("behavior edits: a step of the team, a company method performed by the team, the step definition", () => {
    const { documents, apply, reload, editorFor } = session();
    let result = reload();
    const team = () => result.model.get(TEAM);
    // Move a local step to another cell (role and tool in one edit).
    apply(behaviorEdits(result.model, editorFor(result), team(), [{ id: method("requirementsBasedTesting"), pairs: [["primaryPerformer", "systemArchitect"], ["facilitationTools", "modelingTool"]] }]).edits);
    result = reload();
    let step = result.model.analyses[0].stepOf(method("requirementsBasedTesting"));
    assert.equal(result.model.nameOf(step.roleId), "systemArchitect");
    assert.equal(result.model.nameOf(step.toolId), "modelingTool");
    // A step definition for a local step without one, and a change of an existing one.
    apply(behaviorEdits(result.model, editorFor(result), team(), [{ id: method("codeReview"), definition: [["goal", stringLiteral("Review the code")]] }]).edits);
    result = reload();
    apply(behaviorEdits(result.model, editorFor(result), team(), [{ id: method("sysmodArchitecture"), definition: [["viewpoints", listValue(["A", "B"].map(stringLiteral))]] }]).edits);
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.equal(result.model.get(method("codeReview")).goal, "Review the code");
    assert.deepEqual(result.model.get(method("sysmodArchitecture")).viewpoints, ["A", "B"]);
    assert.equal(result.model.get(method("sysmodArchitecture")).goal, "Define a system architecture that satisfies the requirements");

    // A new company method that the team performs: redefined in the team methodology, with inputs and a definition.
    apply(editorFor(result).addElement(COMPANY + "::companyMethodology", methodLines({ name: "safetyAnalysis" })));
    result = reload();
    const companyMethod = COMPANY + "::companyMethodology::safetyAnalysis";
    assert.ok(result.model.methodologyTree(TEAM).some(n => n.element.id === companyMethod && n.inherited === false || n.element.id === companyMethod));
    const { edits, ids } = behaviorEdits(result.model, editorFor(result), team(), [
        { id: companyMethod, pairs: [["primaryPerformer", "systemArchitect"], ["facilitationTools", "modelingTool"], ["inputs", "architectureModel"]],
            definition: [["goal", stringLiteral("Find the hazards")]] },
        { id: method("interfaceDefinition"), pairs: [["outputs", "(interfaceList, architectureModel)"]] },
    ]);
    assert.equal(ids.get(companyMethod), method("safetyAnalysis"));
    apply(edits);
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.deepEqual(result.diagnostics.filter(d => d.file === documents[0].name), [], documents[0].content);
    const flowAfter = result.model.analyses[0];
    step = flowAfter.stepOf(method("safetyAnalysis"));
    assert.ok(step, "the company method performed by the team is a process step");
    assert.equal(step.goal, "Find the hazards");
    assert.deepEqual(step.method.redefinedIds, [companyMethod]);
    assert.ok(flowAfter.handovers.some(h => h.sourceId === method("sysmodArchitecture") && h.targetId === method("safetyAnalysis")), "hand-over to the new step");
});
check("behavior edits: an environment that does not redefine the methodology yet", () => {
    const content = `package Plain {
        private import MBSEMethodology::*;
        occurrence def Base :> MBSEEnvironment {
            part tool :> tools;
            part baseMethodology :>> methodology { action design : Method; }
        }
        occurrence def Team :> Base {
            part designer : Role :> roles;
            analysis flowAnalysis : DTFA::DigitalThreadFlowAnalysis :> analyses;
        }
    }`;
    const documents = [{ name: "Plain.sysml", content }];
    let result = load(documents);
    const editor = new TextModelEditor({ locate: result.locate, documentText: () => documents[0].content });
    const { edits, ids } = behaviorEdits(result.model, editor, result.model.get("Plain::Team"), [{ id: "Plain::Base::baseMethodology::design", pairs: [["primaryPerformer", "designer"], ["facilitationTools", "tool"]] }]);
    documents[0].content = applyEditsToText(documents[0].content, edits);
    result = load(documents);
    assert.deepEqual(result.diagnostics.filter(d => d.file === "Plain.sysml"), [], documents[0].content);
    assert.equal(ids.get("Plain::Base::baseMethodology::design"), "Plain::Team::baseMethodology::design");
    const step = result.model.analyses[0].stepOf("Plain::Team::baseMethodology::design");
    assert.ok(step && result.model.nameOf(step.roleId) === "designer", documents[0].content);
});
check("text editor adds DTFA elements, renames and deletes", () => {
    const { documents, apply, reload, editorFor } = session();
    let result = reload();
    apply(editorFor(result).addElement(TEAM, environmentElementLines("role", "safetyEngineer", "Safety analyses")));
    result = reload();
    apply(editorFor(result).addElement(COMPANY, environmentElementLines("tool", "safetyTool")));
    result = reload();
    apply(editorFor(result).addElement(TEAM + "::companyMethodology", methodLines({ name: "hazardAnalysis", pairs: [["primaryPerformer", "safetyEngineer"], ["facilitationTools", "safetyTool"], ["inputs", "architectureModel"]] })));
    result = reload();
    apply(editorFor(result).addElement(TEAM + "::flowAnalysis", toolTransitionLines({ name: "modelToHazards", source: "modelingTool", target: "safetyTool", products: "architectureModel", rating: "bottleneck", priority: 5 })));
    result = reload();
    apply(editorFor(result).addElement(TEAM + "::flowAnalysis", measureLines({ name: "hazardsInModel", description: "Analyze the hazards\nin the model.", transitions: ["modelToHazards"] })));
    result = reload();
    apply(editorFor(result).addElement(COMPANY, policyRuleLines({ name: "safetyToolRule", tool: "safetyTool", method: "companyMethodology.codeReview", status: "allowed" })));
    result = reload();
    apply(editorFor(result).addElement(COMPANY, analysisLines("companyAnalysis")));
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.deepEqual(result.diagnostics.filter(d => d.file === documents[0].name), [], documents[0].content);
    const m = result.model, f = m.get(TEAM + "::flowAnalysis");
    const step = f.stepOf(method("hazardAnalysis"));
    assert.equal(m.nameOf(step.roleId), "safetyEngineer");
    const h = f.handovers.find(x => x.targetId === method("hazardAnalysis"));
    assert.equal(h.transition.id, id("modelToHazards"));
    assert.equal(h.priority, 5);
    assert.deepEqual(m.measuresFor(h.transition).map(x => x.name), ["hazardsInModel"]);
    assert.equal(m.get(COMPANY).rules.length, 6);
    assert.equal(m.policyStatus(TEAM, COMPANY + "::safetyTool", method("codeReview")).status, "allowed");
    assert.equal(m.analyses.length, 2);

    apply(editorFor(result).renameElement(COMPANY + "::modelingTool", "sysmlTool", "DTFAExampleControlUnit", { documents: [documents[0].name] }));
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.equal(result.model.nameOf(result.model.get(TEAM + "::flowAnalysis").stepOf(method("sysmodArchitecture")).toolId), "sysmlTool");

    apply(editorFor(result).deleteElement(id("modelToHazards")));
    result = reload();
    assert.ok(result.diagnostics.some(d => /unresolved reference `modelToHazards`/.test(d.message)), "the measure still refers to the deleted transition");
    apply(editorFor(result).setValue(id("hazardsInModel"), "addressedTransitions", null));
    result = reload();
    assert.deepEqual(result.diagnostics.filter(d => d.file === documents[0].name), [], documents[0].content);
});

check("diagnostic with file and line", () => {
    const broken = load([{ name: "Broken.sysml", content: "package Broken {\n    private import DTFA::*;\n    occurrence r : UnknownType;\n}\n" }]);
    const d = broken.diagnostics.find(x => /unresolved reference `UnknownType`/.test(x.message));
    assert.ok(d, "an unresolved reference is reported");
    assert.equal(d.file, "Broken.sysml");
    assert.equal(d.startLine, 3);
});
check("a parse error is reported, and the rest of the document still builds the model", () => {
    const text = environmentDocument("Typing").replace("part systemArchitect : Role :> roles;", "part systemArchitect : Role :> roles\n        part broken = ;");
    const result = load([{ name: "Typing.sysml", content: text }]);
    assert.ok(errorsOf(result).length > 0);
    assert.ok(result.model.analyses.length === 1 && result.model.analyses[0].steps.length === 2);
});

// --- Templates and snippets ---
check("MBSE environment template is valid and complete", () => {
    const result = load([{ name: "T.sysml", content: environmentDocument("T") }]);
    assert.deepEqual(result.diagnostics.filter(d => d.file === "T.sysml"), []);
    assert.equal(result.model.environments.length, 1);
    const analysis = result.model.analyses[0];
    assert.equal(analysis.environmentId, "T::TEnvironment");
    assert.equal(analysis.steps.length, 2);
    assert.equal(analysis.handovers.length, 1);
    assert.equal(analysis.handovers[0].transition.name, "requirementsToModel");
    assert.equal(result.model.rules.length, 1);
    assert.equal(analyzeAll(result.model).get(analysis.id).kinds.size, 1);
});
check("empty package template is valid", () => {
    assert.deepEqual(errorsOf(load([{ name: "E.sysml", content: emptyPackage("E") }])), []);
});
check("insert snippets parse", () => {
    for (const snippet of SNIPPETS) {
        const text = `package S {\n    private import MBSEMethodology::*;\n    private import DTFA::*;\n${snippet.text.split("\n").map(l => "    " + l).join("\n")}\n}\n`;
        const parseErrors = load([{ name: "S.sysml", content: text }]).diagnostics.filter(d => d.code === "parse");
        assert.deepEqual(parseErrors, [], snippet.label);
    }
});
check("SYSMOD Delivery Drone example: its MBSE environment and the SYSMOD steps of its methodology", () => {
    const names = ["Project", "ControlStationProject", "ControlStationHandover", "DomainLibrary", "Stakeholders", "Idea", "Specification",
        "BrownfieldArchitecture", "FunctionalArchitecture", "LogicalArchitecture", "ProductArchitecture"];
    const drone = load(names.map(n => ({ name: `DeliveryDroneSystem${n}.sysml`, content: read(`examples/DeliveryDroneSystem${n}.sysml`) })));
    assert.deepEqual(drone.diagnostics.filter(d => d.code === "parse"), []);
    const environment = drone.model.environments.find(e => e.name === "Delivery Drone MBSE Environment");
    assert.ok(environment, drone.model.environments.map(e => e.name).join());
    assert.deepEqual(drone.model.inScope(drone.model.tools, environment.id).map(t => t.name), ["matlab", "requirementsTool"]);
    assert.equal(drone.model.inScope(drone.model.roles, environment.id).length, 4);
    assert.ok(drone.model.inScope(drone.model.methods, environment.id).some(m => m.name === "setupProject"), "the redefined SYSMOD steps are methods");
    assert.ok(drone.model.inScope(drone.model.processes, environment.id).length >= 1);
    assert.ok(drone.locate(environment.id), "an environment with an unrestricted name is found in the text");

    // Specializations: the role systemArchitect is typed by ISO15288Processes::Stakeholders::SystemArchitect
    const architect = drone.model.inScope(drone.model.roles, environment.id).find(r => r.name === "systemArchitect");
    assert.ok(architect, "systemArchitect role");
    assert.ok(architect.typeIds.some(t => t.endsWith("SystemArchitect")), `types of systemArchitect: ${architect.typeIds}`);
    assert.ok(architect.doc || architect.inheritedDoc, "systemArchitect has an own or an inherited doc");
    const tree = drone.model.methodologyTree(environment.id);
    assert.ok(tree.some(n => n.inherited), "the methodology tree contains inherited behaviors");
    const performed = tree.filter(n => drone.model.performersOf(n.element, environment.id).some(r => r.id === architect.id));
    assert.deepEqual(performed.map(n => n.element.name).filter(n => n !== "SYSMODDefaultProcess"),
        ["modelBrownfieldSystem", "describeSystemIdea", "specifySystem", "modelSolutionArchitecture", "modelSubProjects", "integrateSubProjects",
            "specifyVerificationContext", "specifyTradeStudy", "defineSystemObjectives"],
        "systemArchitect performs the steps that SYSMOD assigns to SystemArchitect (anonymous responsibleFor and supports connections)");
    assert.deepEqual(tree.filter(n => drone.model.performersOf(n.element, environment.id, ["primary"]).some(r => r.id === architect.id)).map(n => n.element.name),
        ["modelBrownfieldSystem", "modelSolutionArchitecture", "modelSubProjects", "integrateSubProjects", "specifyTradeStudy"],
        "systemArchitect is responsible for the architecture steps");
    assert.ok(tree.some(n => n.inherited && n.element.name === "defineSystemObjectives"), "inherited step of the library process");
    // Only the declared performers: no performers of the enclosing process.
    const step = name => tree.find(n => n.element.name === name).element;
    const performerNames = (b, kinds) => drone.model.performersOf(b, environment.id, kinds).map(r => r.name);
    // describeProblemStatement: the productManager (responsibleFor) is no role of the drone environment, the requirementsEngineer supports it;
    // the projectManager of the enclosing process is not a performer of the step.
    assert.deepEqual(performerNames(step("describeProblemStatement"), ["primary", "additional"]), ["requirementsEngineer"], "describeProblemStatement: only its declared performers");
    assert.deepEqual(performerNames(step("setupProject"), ["primary", "additional"]), ["projectManager"], "setupProject: projectManager (responsibleFor)");
    // The products of the environment include the products of the parameters of the SYSMOD steps.
    const products = drone.model.productsOf(environment.id).map(p => p.name);
    for (const p of ["ProjectCover", "SystemSpecification", "ProductArchitecture", "VerificationReport"]) assert.ok(products.includes(p), `product ${p}: ${products}`);
    // The roles that SYSMOD declares make the steps; the drone environment has no flow analysis yet.
    assert.equal(drone.model.analyses.length, 0);
});
check("specializations: a role inherits the doc and the responsibilities of its general role", () => {
    const result = load([{ name: "Spec.sysml", content: `package Spec {
        private import MBSEMethodology::*;
        part def Reviewer :> Role { doc /* Reviews the work products. */ }
        part def Writer :> Role;
        occurrence def BaseEnvironment :> MBSEEnvironment {
            part writer : Writer :> roles;
            part editor :> tools;
            part baseMethodology :>> methodology {
                action review : Method { ref part reviewer : Reviewer :> additionalPerformers; }
                action write : Method;
                connection :> responsibleFor connect writer to write;
                connection :> facilitates connect editor to write;
            }
        }
        occurrence def TeamEnvironment :> BaseEnvironment {
            part qa : Reviewer :> roles;
        }
    }` }]);
    assert.deepEqual(errorsOf(result), []);
    const m = result.model;
    const team = m.environments.find(e => e.name === "TeamEnvironment");
    const qa = m.inScope(m.roles, team.id).find(r => r.name === "qa");
    const writer = m.inScope(m.roles, team.id).find(r => r.name === "writer");
    assert.deepEqual(qa.typeIds, ["Spec::Reviewer"]);
    assert.equal(qa.inheritedDoc && qa.inheritedDoc.text, "Reviews the work products.");
    const tree = m.methodologyTree(team.id);
    const byName = name => tree.find(n => n.element.name === name).element;
    assert.deepEqual(m.performersOf(byName("review"), team.id, ["additional"]).map(r => r.name), ["qa"], "typed slot matches the specialized role");
    assert.deepEqual(m.performersOf(byName("write"), team.id, ["primary"]).map(r => r.id), [writer.id], "anonymous connection");
    assert.deepEqual(m.performersOf(byName("write"), team.id, ["tool"]).map(t => t.name), ["editor"], "anonymous facilitates connection");
});
check("outline names", () => {
    const outline = buildOutline("package P { part r : Role; action s { :>> primaryPerformer = r; } }");
    assert.deepEqual(outline.children[0].children.map(c => c.name), ["r", "s"]);
    assert.deepEqual(outline.children[0].children[1].children.map(c => c.name), ["primaryPerformer"]);
});

console.log(failures ? `\n${failures} check${failures === 1 ? "" : "s"} failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
