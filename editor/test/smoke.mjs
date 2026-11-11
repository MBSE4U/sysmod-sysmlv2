// Smoke test of the editor's engine, model and text layers in Node, without a browser.
//
// Usage (from the editor directory):
//   node tools/fetch-engine.mjs          (once: the engine package in vendor/)
//   node test/smoke.mjs [--repo <sysmod-sysmlv2 repository>]
// The libraries (MBSEMethodology, EEE, SYSMOD) and examples are read from the repository (default: the parent directory).

import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";

import { config } from "../src/config.js";
import { analyze as analyzeWith, createEngine } from "../src/engine/engine-core.js";
import { buildFromAnalysis } from "../src/workspace/TextModelProvider.js";
import { LANGUAGE_TYPES } from "../src/eee/EeeModelBuilder.js";
import { analyzeCheck, analyzeAll, policyStatus } from "../src/eee/EeeAnalyzer.js";
import {
    TextModelEditor, applyEditsToText, processStepLines, transitionLines, measureLines, policyRuleLines, environmentElementLines,
    stringLiteral, listValue,
} from "../src/workspace/TextModelEditor.js";
import { SNIPPETS, emptyPackage, environmentDocument } from "../src/eee/templates.js";
import { buildOutline } from "../src/text/sysml-text.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const repoArg = args[0] === "--repo" ? args[1] : null;
const repo = [repoArg, resolve(root, "..")]
    .filter(Boolean).map(d => resolve(d)).find(d => existsSync(resolve(d, "MBSEMethodology.sysml")) && existsSync(resolve(d, "EEE.sysml")));
if (!repo) {
    console.error("MBSEMethodology.sysml and EEE.sysml not found. Usage: node test/smoke.mjs [--repo <sysmod-sysmlv2 repository>]");
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
    analyzeWith(engine, [...libraries, ...documents], { libraryNames, languageTypes: LANGUAGE_TYPES }), [...libraries, ...documents]);
const errorsOf = result => result.diagnostics.filter(d => d.severity === "error");

// --- the library itself ---
const alone = load([]);
check("MBSEMethodology and EEE libraries have no errors or warnings", () =>
    assert.deepEqual(alone.diagnostics.filter(d => ["MBSEMethodology.sysml", "EEE.sysml"].includes(d.file)), []));
check("all libraries have no errors", () => assert.deepEqual(errorsOf(alone), []));

// --- Example: control unit engineering ---
const exampleDocument = { name: "EEECheckControlUnit.sysml", content: read("examples/EEECheckControlUnit.sysml") };
const example = load([exampleDocument]);
const model = example.model;
const unit = model.checks[0];
const id = name => `EEEExampleControlUnit::ControlUnitEngineering::${name}`;

check("example has no errors and no warnings", () => assert.deepEqual(example.diagnostics.filter(d => d.file === exampleDocument.name), []));
check("EEE check with roles, steps and transitions", () => {
    assert.deepEqual(model.checks.map(c => c.name), ["ControlUnitEngineering"]);
    assert.deepEqual(model.matrixAxes(unit).roles.map(r => r.name), ["requirementsEngineer", "systemArchitect", "softwareDeveloper", "testEngineer"]);
    assert.equal(unit.steps.length, 6);
    assert.equal(unit.transitions.length, 5);
});
const P = "EEEExampleControlUnit::";
check("MBSE environments: the company environment and the team environment that specializes it", () => {
    assert.deepEqual(model.environments.map(e => e.name), ["CompanyEnvironment", "ControlUnitTeamEnvironment"]);
    assert.deepEqual(model.get(P + "ControlUnitTeamEnvironment").generalIds, [P + "CompanyEnvironment"]);
    assert.equal(model.get(P + "CompanyEnvironment").methodologyId, P + "CompanyEnvironment::companyMethodology");
    assert.deepEqual(model.environmentScope(P + "ControlUnitTeamEnvironment"), [P + "ControlUnitTeamEnvironment", P + "CompanyEnvironment"]);
});
check("the EEE check and the tool policy are anchored at environments", () => {
    assert.equal(unit.environmentId, P + "ControlUnitTeamEnvironment");
    assert.equal(unit.environmentUsage, "env");
    assert.equal(model.policies[0].environmentId, P + "CompanyEnvironment");
});
check("roles, tools, methods and products of the environments", () => {
    assert.deepEqual(model.tools.map(t => t.name), ["wordProcessor", "requirementsTool", "modelingTool", "spreadsheet", "ide", "testTool"]);
    assert.ok(model.tools.every(t => t.environmentId === P + "CompanyEnvironment"));
    assert.equal(model.inScope(model.roles, P + "ControlUnitTeamEnvironment").length, 4);
    assert.equal(model.inScope(model.roles, P + "CompanyEnvironment").length, 0);
    assert.equal(model.methods.length, 6);
    assert.equal(model.artifacts.length, 6);
});
check("process step references and definition", () => {
    const step = model.get(id("modelArchitecture"));
    assert.equal(model.nameOf(step.roleId), "systemArchitect");
    assert.equal(model.nameOf(step.toolId), "modelingTool");
    assert.equal(model.nameOf(step.methodId), "sysmodArchitecture");
    assert.equal(step.goal, "Define a system architecture that satisfies the requirements");
    assert.deepEqual(step.viewpoints, ["Requirements traced to architecture elements", "Functional architecture"]);
    assert.deepEqual(step.sourceArtifactIds.map(i => model.nameOf(i)), ["requirementsSpecification"]);
    assert.deepEqual(model.get(id("implementSoftware")).sourceArtifactIds.map(i => model.nameOf(i)), ["interfaceList", "requirementsSpecification"]);
    assert.equal(step.doc, "");
});
check("transitions: ends, evaluation, priority", () => {
    const t = model.get(id("specifyToModel"));
    assert.equal(model.nameOf(t.sourceId), "specifyRequirements");
    assert.equal(model.nameOf(t.targetId), "modelArchitecture");
    assert.equal(t.evaluation, "bottleneck");
    assert.equal(t.priority, 1);
    assert.equal(model.get(id("requirementsToTests")).evaluation, "unrated");
});
check("measures and their addressed transitions (also a sequence of connections)", () => {
    const measure = model.get(id("defineInterfaces::modelInterfaces"));
    assert.equal(measure.stepId, id("defineInterfaces"));
    assert.deepEqual(measure.addressedTransitionIds.map(i => model.nameOf(i)), ["modelToInterfaces", "interfacesToCode"]);
    assert.ok(measure.doc.startsWith("Define the interfaces"));
});
check("tool policy rules", () => {
    const policy = model.policies[0];
    assert.equal(policy.rules.length, 5);
    assert.deepEqual(policyStatus(model, P + "CompanyEnvironment::spreadsheet", P + "CompanyEnvironment::companyMethodology::interfaceDefinition").status, "forbidden");
});
check("analyzer: transition kinds, progress and findings", () => {
    const analysis = analyzeCheck(model, unit);
    assert.equal(analysis.kinds.get(id("modelToInterfaces")).label, "method/tool break");
    assert.equal(analysis.kinds.get(id("specifyToModel")).label, "method/tool break and human interface");
    assert.deepEqual(analysis.bottlenecks.map(t => t.priority), [1, 2, 3]);
    assert.equal(analysis.progress[2].done, false);
    assert.equal(analysis.progress[4].done, true);
    assert.ok(analysis.findings.some(f => f.step === 1 && /forbids/.test(f.message)), "forbidden combination is reported");
    assert.ok(analysis.findings.some(f => f.step === 2 && /requirementsToTests/.test(f.message)), "unrated transition is reported");
    assert.ok(analysis.findings.some(f => f.step === 3 && /specifyRequirements/.test(f.message)), "missing goal is reported");
});
check("matrix axes", () => {
    const axes = model.matrixAxes(unit);
    assert.equal(axes.roles.length, 4);
    assert.equal(axes.tools.length, 6);
    assert.equal(axes.hasUnassignedRole, false);
});

// --- Text model editor ---
check("text editor sets, changes and removes values", () => {
    const documents = [{ ...exampleDocument }];
    const apply = edits => { documents[0].content = applyEditsToText(documents[0].content, edits); };
    const reload = () => load(documents);
    const editorFor = result => new TextModelEditor({ locate: result.locate, documentText: () => documents[0].content });

    let result = reload();
    // change an enum value and a literal, add a priority, remove a priority
    apply(editorFor(result).setValue(id("requirementsToTests"), "evaluation", "TransitionEvaluation::bottleneck"));
    result = reload();
    apply(editorFor(result).setValue(id("requirementsToTests"), "priority", "4"));
    result = reload();
    apply(editorFor(result).setValue(id("specifyToModel"), "priority", null));
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.equal(result.model.get(id("requirementsToTests")).evaluation, "bottleneck");
    assert.equal(result.model.get(id("requirementsToTests")).priority, 4);
    assert.equal(result.model.get(id("specifyToModel")).priority, null);

    // a new value statement in a step, a string list, then move a step to another cell in one edit
    apply(editorFor(result).setValue(id("specifyTests"), "viewpoints", listValue(["Test view", "Trace \"view\""].map(stringLiteral))));
    result = reload();
    assert.deepEqual(result.model.get(id("specifyTests")).viewpoints, ["Test view", "Trace \"view\""]);
    const edits = editorFor(result).setValues(id("specifyTests"), [["role", "env.systemArchitect"], ["tool", "env.modelingTool"]]);
    assert.equal(edits.length, 1);
    apply(edits);
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    const moved = result.model.get(id("specifyTests"));
    assert.equal(result.model.nameOf(moved.roleId), "systemArchitect");
    assert.equal(result.model.nameOf(moved.toolId), "modelingTool");

    // doc comments: change, insert into a body, insert into a declaration without body
    apply(editorFor(result).setDoc(P + "ControlUnitTeamEnvironment::requirementsEngineer", "Writes the requirements."));
    result = reload();
    apply(editorFor(result).setDoc(id("specifyTests"), "Derives the tests\nfrom the requirements."));
    result = reload();
    apply(editorFor(result).setDoc(P + "ControlUnitTeamEnvironment::sourceCode", "The code."));
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.equal(result.model.get(P + "ControlUnitTeamEnvironment::requirementsEngineer").doc, "Writes the requirements.");
    assert.equal(result.model.get(id("specifyTests")).doc, "Derives the tests\nfrom the requirements.");
    assert.equal(result.model.get(P + "ControlUnitTeamEnvironment::sourceCode").doc, "The code.");
});

check("text editor adds elements, renames and deletes", () => {
    const documents = [{ ...exampleDocument }];
    const apply = edits => { documents[0].content = applyEditsToText(documents[0].content, edits); };
    const reload = () => load(documents);
    const editorFor = result => new TextModelEditor({ locate: result.locate, documentText: () => documents[0].content });
    const checkId = "EEEExampleControlUnit::ControlUnitEngineering";

    let result = reload();
    apply(editorFor(result).addElement(P + "ControlUnitTeamEnvironment", environmentElementLines("role", "safetyEngineer", "Safety analyses")));
    result = reload();
    apply(editorFor(result).addElement(P + "CompanyEnvironment", environmentElementLines("tool", "safetyTool")));
    result = reload();
    apply(editorFor(result).addElement(P + "CompanyEnvironment::companyMethodology", environmentElementLines("method", "hazardAnalysis")));
    result = reload();
    apply(editorFor(result).addElement(P + "ControlUnitTeamEnvironment", environmentElementLines("product", "hazardList")));
    result = reload();
    apply(editorFor(result).addElement(checkId, processStepLines({ name: "analyzeHazards", role: "env.safetyEngineer", tool: "env.safetyTool", method: "env.companyMethodology.hazardAnalysis" })));
    result = reload();
    apply(editorFor(result).addElement(checkId, transitionLines({ name: "modelToHazards", source: "modelArchitecture", target: "analyzeHazards", evaluation: "bottleneck", priority: 5 })));
    result = reload();
    apply(editorFor(result).addElement(id("analyzeHazards"), measureLines({ name: "hazardsInModel", description: "Analyze the hazards\nin the model.", transitions: ["modelToHazards"] })));
    result = reload();
    apply(editorFor(result).addElement(P + "CompanyToolPolicy", policyRuleLines({ name: "safetyToolRule", tool: "env.safetyTool", method: "env.companyMethodology.hazardAnalysis", status: "allowed" })));
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.deepEqual(result.diagnostics.filter(d => d.file === documents[0].name), [], documents[0].content);
    const step = result.model.get(id("analyzeHazards"));
    assert.equal(result.model.nameOf(step.roleId), "safetyEngineer");
    assert.equal(result.model.nameOf(step.methodId), "hazardAnalysis");
    assert.equal(result.model.get(id("modelToHazards")).priority, 5);
    assert.deepEqual(step.measures.map(m => m.addressedTransitionIds.map(i => result.model.nameOf(i))), [["modelToHazards"]]);
    assert.equal(result.model.policies[0].rules.length, 6);
    assert.equal(policyStatus(result.model, step.toolId, step.methodId).status, "allowed");

    apply(editorFor(result).renameElement(P + "CompanyEnvironment::modelingTool", "sysmlTool", "EEEExampleControlUnit", { documents: [documents[0].name] }));
    result = reload();
    assert.deepEqual(errorsOf(result), [], documents[0].content);
    assert.equal(result.model.nameOf(result.model.get(id("modelArchitecture")).toolId), "sysmlTool");

    apply(editorFor(result).deleteElement(id("modelToHazards")));
    result = reload();
    assert.ok(result.diagnostics.some(d => /unresolved reference `modelToHazards`/.test(d.message)), "the measure still refers to the deleted transition");
    apply(editorFor(result).setValue(id("analyzeHazards::hazardsInModel"), "addressedTransitions", null));
    result = reload();
    assert.deepEqual(result.diagnostics.filter(d => d.file === documents[0].name), [], documents[0].content);
});

check("diagnostic with file and line", () => {
    const broken = load([{ name: "Broken.sysml", content: "package Broken {\n    private import EEE::*;\n    #processStep action r : UnknownType;\n}\n" }]);
    const d = broken.diagnostics.find(x => /unresolved reference `UnknownType`/.test(x.message));
    assert.ok(d, "an unresolved reference is reported");
    assert.equal(d.file, "Broken.sysml");
    assert.equal(d.startLine, 3);
});
check("a parse error is reported, and the rest of the document still builds the model", () => {
    const text = environmentDocument("Typing").replace("part systemArchitect : Role :> roles;", "part systemArchitect : Role :> roles\n        part broken = ;");
    const result = load([{ name: "Typing.sysml", content: text }]);
    assert.ok(errorsOf(result).length > 0);
    assert.ok(result.model.checks.length === 1 && result.model.checks[0].steps.length === 2);
});

// --- Templates and snippets ---
check("MBSE environment template is valid and complete", () => {
    const result = load([{ name: "T.sysml", content: environmentDocument("T") }]);
    assert.deepEqual(result.diagnostics.filter(d => d.file === "T.sysml"), []);
    assert.equal(result.model.environments.length, 1);
    assert.equal(result.model.checks[0].environmentId, "T::TEnvironment");
    const all = analyzeAll(result.model);
    assert.equal(result.model.checks.length, 1);
    assert.equal(result.model.policies.length, 1);
    assert.equal(all.get(result.model.checks[0].id).kinds.size, 1);
});
check("empty package template is valid", () => {
    assert.deepEqual(errorsOf(load([{ name: "E.sysml", content: emptyPackage("E") }])), []);
});
check("insert snippets parse", () => {
    for (const snippet of SNIPPETS) {
        const text = `package S {\n    private import MBSEMethodology::*;\n    private import EEE::*;\n${snippet.text.split("\n").map(l => "    " + l).join("\n")}\n}\n`;
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
});
check("outline names", () => {
    const outline = buildOutline("package P { #role part r; #processStep action s { :>> role = r; } }");
    assert.deepEqual(outline.children[0].children.map(c => c.name), ["r", "s"]);
    assert.deepEqual(outline.children[0].children[1].children.map(c => c.name), ["role"]);
});

console.log(failures ? `\n${failures} check${failures === 1 ? "" : "s"} failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
