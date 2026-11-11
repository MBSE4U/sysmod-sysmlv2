// Projects of a SysML v2 API server (prepared, not available in the user interface yet).
//
// The repository will let the user browse projects, branches and commits, and open a commit as the
// editor's model. Unlike a file, the opened model is not a text document: the session uses
// SysmlApiModelProvider and SysmlApiModelEditor instead of the text provider and editor.

import { ModelRepository } from "./ModelRepository.js";
import { NotImplementedError } from "../sysml-api/SysmlApiModelProvider.js";

export class SysmlApiRepository extends ModelRepository {
    /** @param {import("../sysml-api/SysmlApiClient.js").SysmlApiClient} client */
    constructor(client) {
        super("sysml-api", "SysML v2 API");
        this.client = client;
        this.capabilities = { open: false, save: false, saveAs: false, browse: true };
    }

    /** Projects and their branches for a picker dialog. */
    async browse() {
        const projects = await this.client.getProjects();
        return Promise.all(projects.map(async project => ({
            id: project["@id"],
            name: project.name,
            branches: (await this.client.getBranches(project["@id"])).map(b => ({ id: b["@id"], name: b.name })),
        })));
    }

    async open() {
        throw new NotImplementedError("Opening a SysML v2 API project");
    }
}
