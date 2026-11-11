// Model provider and model editor for a SysML v2 API project (prepared, not implemented yet).
//
// They have the same interfaces as TextModelProvider and TextModelEditor, so the views
// (matrix, step definition, tool policy, form, outline) work unchanged when the model comes from an API server:
//
//   provider.load()  -> { model: EeeModel, diagnostics: [], locate(id) }
//   editor.addElement / setValue / setDoc / renameElement / deleteElement  -> a commit instead of a text edit
//
// Planned mapping from API elements (JSON, "@type" = metaclass) to the EEE domain model: an element whose type
// conforms to an EEE definition (via its FeatureTyping, Subsetting or the semantic metadata of its keyword, e.g.
// #role = RoleMetadata with base type EEE::roles):
//   EEE check       PartDefinition/PartUsage conforming to EEE::EeeCheck
//   Role, Tool      PartUsage conforming to EEE::Role, EEE::Tool
//   Method          ActionUsage conforming to EEE::Method
//   Artifact        ItemUsage conforming to EEE::Artifact
//   Process step    ActionUsage conforming to EEE::ProcessStep; role, tool, method and the swimlanes are the
//                   FeatureValues of its features redefining EEE::ProcessStep::role, ::tool, ...
//   Transition      ConnectionUsage conforming to EEE::StepTransition; source and target from its connector ends,
//                   evaluation and priority from FeatureValues
//   Measure         OccurrenceUsage conforming to EEE::Measure, owned by a process step
//   Tool policy     PartDefinition/PartUsage conforming to EEE::ToolPolicy, with ToolPolicyRule occurrences
// The element id is the API's @id (UUID); qualifiedName is the element's qualifiedName.
// The EEE library elements must be available to the project (e.g. as a project usage) to resolve the types.
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
        // 3. map to the EEE domain model as described above
        throw new NotImplementedError("Reading EEE models from a SysML v2 API server");
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
