// Model provider and model editor for a SysML v2 API project (prepared, not implemented yet).
//
// They have the same interfaces as TextModelProvider and TextModelEditor, so the views
// (matrix, step definition, tool policy, form, outline) work unchanged when the model comes from an API server:
//
//   provider.load()  -> { model: DtfaModel, diagnostics: [], locate(id) }
//   editor.addElement / setValue / setDoc / renameElement / deleteElement  -> a commit instead of a text edit
//
// Planned mapping from API elements (JSON, "@type" = metaclass) to the domain model: an element whose type
// conforms to an MBSEMethodology or DTFA definition (via its FeatureTyping, Subsetting or Redefinition):
//   MBSE environment   OccurrenceDefinition conforming to MBSEMethodology::MBSEEnvironment
//   Role, Tool         PartUsage conforming to MBSEMethodology::Role, MBSEMethodology::Tool
//   Process, Method    ActionUsage conforming to MBSEMethodology::Process, MBSEMethodology::Method; primary performer,
//                      facilitation tools, inputs and outputs are the FeatureValues of their redefining features
//   Product            ItemUsage conforming to MBSEMethodology::Product
//   Flow analysis      AnalysisCaseUsage conforming to DTFA::DigitalThreadFlowAnalysis, owned by an environment
//   Tool transition    ConnectionUsage conforming to DTFA::ToolTransition; source and target from its connector ends,
//                      rating, priority, explanation and conversions from FeatureValues
//   Measure            OccurrenceUsage conforming to DTFA::Measure, owned by a flow analysis
//   Tool policy rule   ConnectionUsage conforming to DTFA::ToolPolicyRule, owned by an environment
//   Step definition    MetadataUsage of DTFA::StepDefinition, owned by a method
// The element id is the API's @id (UUID); qualifiedName is the element's qualifiedName.
// The MBSEMethodology and DTFA library elements must be available to the project (e.g. as a project usage) to resolve the types.
//
// Alternative route: keep the text-based editor and convert between SysML text and the API's JSON with
// the SysML engine, which reads and writes interchange JSON (Session.fromInterchangeJson, toFullJson).

export class NotImplementedError extends Error {
    constructor(what) {
        super(`${what} is planned for a future version of the MBSE Methodology editor.`);
        this.name = "NotImplementedError";
    }
}

export class SysmlApiModelProvider {
    /**
     * @param {import("./SysmlApiClient.js").SysmlApiClient} client
     * @param {{projectId: string, commitId: string}} target
     */
    constructor(client, { projectId, commitId }) {
        this.client = client;
        this.projectId = projectId;
        this.commitId = commitId;
    }

    async load() {
        // 1. const elements = await this.client.getElements(this.projectId, this.commitId);
        // 2. index elements by @id, resolve ownership (owningRelatedElement / ownedRelatedElement)
        // 3. map to the domain model as described above
        throw new NotImplementedError("Reading MBSE environments from a SysML v2 API server");
    }
}

export class SysmlApiModelEditor {
    constructor(client, { projectId, branchId }) {
        this.client = client;
        this.projectId = projectId;
        this.branchId = branchId;
    }

    // Each command creates the new elements and relationships as DataVersion changes and posts them
    // with client.postCommit(projectId, { change, previousCommitId }, branchId).
    async addElement() { throw new NotImplementedError("Adding elements via the SysML v2 API"); }
    async setValue() { throw new NotImplementedError("Changing values via the SysML v2 API"); }
    async setDoc() { throw new NotImplementedError("Changing doc comments via the SysML v2 API"); }
}
