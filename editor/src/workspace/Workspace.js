// The open documents of the editor.
//
// A document holds the text of one .sysml file. Libraries (EEE.sysml) are read-only documents that are
// parsed with the model but cannot be edited or saved. The workspace dispatches "change" events
// with detail { reason, name }.

export class SourceDocument {
    constructor({ name, content = "", handle = null, readOnly = false, library = false, origin = "" }) {
        this.name = name;
        this.content = content;
        this.savedContent = content;
        /** File handle (File System Access API) or another repository reference to save to. */
        this.handle = handle;
        this.readOnly = readOnly;
        this.library = library;
        /** Where the document came from, e.g. "file", "new", "example", "library" or "draft". */
        this.origin = origin;
    }

    get dirty() {
        return !this.readOnly && this.content !== this.savedContent;
    }

    markSaved() {
        this.savedContent = this.content;
    }
}

export class Workspace extends EventTarget {
    constructor() {
        super();
        /** @type {SourceDocument[]} */
        this.documents = [];
        /** Increases with every change of a document text; detects stale analyses. */
        this.revision = 0;
    }

    get(name) {
        return this.documents.find(d => d.name === name) || null;
    }

    get libraryNames() {
        return this.documents.filter(d => d.library).map(d => d.name);
    }

    get modelDocuments() {
        return this.documents.filter(d => !d.library);
    }

    get dirtyDocuments() {
        return this.documents.filter(d => d.dirty);
    }

    /** Adds a document; a document with the same name is replaced. */
    add(document) {
        const index = this.documents.findIndex(d => d.name === document.name);
        if (index >= 0) this.documents[index] = document;
        else this.documents.push(document);
        this.changed("add", document.name, true);
        return document;
    }

    remove(name) {
        this.documents = this.documents.filter(d => d.name !== name);
        this.changed("remove", name, true);
    }

    rename(name, newName) {
        const document = this.get(name);
        if (!document || name === newName) return;
        if (this.get(newName)) throw new Error(`A document named ${newName} is already open.`);
        document.name = newName;
        this.changed("rename", newName, true);
    }

    setContent(name, content) {
        const document = this.get(name);
        if (!document || document.readOnly || document.content === content) return;
        document.content = content;
        this.changed("edit", name, true);
    }

    /**
     * Applies text edits [{ document, start, end, text }] (non-overlapping per document).
     * @returns {{document: SourceDocument, before: string}[]} the changed documents and their previous text
     */
    applyEdits(edits) {
        const byDocument = new Map();
        for (const edit of edits) {
            if (!byDocument.has(edit.document)) byDocument.set(edit.document, []);
            byDocument.get(edit.document).push(edit);
        }
        const changes = [];
        for (const [name, documentEdits] of byDocument) {
            const document = this.get(name);
            if (!document) throw new Error(`The document ${name} is not open.`);
            if (document.readOnly) throw new Error(`The document ${name} is read-only.`);
            const before = document.content;
            document.content = [...documentEdits].sort((a, b) => b.start - a.start)
                .reduce((text, e) => text.slice(0, e.start) + e.text + text.slice(e.end), before);
            changes.push({ document, before });
        }
        if (changes.length) this.changed("edit", changes[0].document.name, true);
        return changes;
    }

    /** Answers a name that is not used yet, e.g. "untitled-2.sysml". */
    uniqueName(base, extension = ".sysml") {
        let name = base + extension;
        for (let i = 2; this.get(name); i++) name = `${base}-${i}${extension}`;
        return name;
    }

    /** Notifies listeners, e.g. after a document was saved (no change of the text). */
    changed(reason, name, textChanged = false) {
        if (textChanged) this.revision++;
        this.dispatchEvent(new CustomEvent("change", { detail: { reason, name } }));
    }
}
