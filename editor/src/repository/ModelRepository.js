// Model repositories: where models are read from and written to.
//
// The editor talks to repositories through this interface, so a new storage only needs a new class.
//
//   id             short identifier, e.g. "local" or "sysml-api"
//   label          name shown in the user interface
//   capabilities   { open, save, saveAs, browse }
//   open()         -> SourceDocument props[]   (the user picks what to open)
//   save(document) -> { name?, handle? }        (writes the document where it came from)
//   saveAs(document) -> { name, handle }        (the user picks the target)
//
// Implementations:
//   LocalFileRepository  files on the user's computer (File System Access API, with download fallback)
//   SysmlApiRepository   projects of a SysML v2 API server (prepared, see SysmlApiRepository.js)

export class ModelRepository {
    constructor(id, label) {
        this.id = id;
        this.label = label;
        this.capabilities = { open: false, save: false, saveAs: false, browse: false };
    }

    async open() {
        throw new Error(`${this.label} cannot open models.`);
    }

    async save(document) {
        throw new Error(`${this.label} cannot save ${document.name}.`);
    }

    async saveAs(document) {
        throw new Error(`${this.label} cannot save ${document.name}.`);
    }
}

/** Thrown when the user cancels a file dialog; the editor ignores it. */
export class CancelledError extends Error {
    constructor() {
        super("cancelled");
        this.name = "CancelledError";
    }
}
