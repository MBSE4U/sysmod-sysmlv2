// Files on the user's computer.
//
// With the File System Access API (Chrome, Edge) the editor saves back to the opened file, and an opened folder
// gives the editor all .sysml files in it (not those of its subfolders); new documents are saved into the folder.
// Other browsers, and pages embedded in another page (e.g. the preview of an IDE, where the
// file pickers of that API may not open at all), open files with a file input and save them as a download.

import { ModelRepository, CancelledError } from "./ModelRepository.js";

const FILE_TYPES = [{ description: "SysML v2 / KerML textual notation", accept: { "text/plain": [".sysml", ".kerml"] } }];

/** Only the user's cancel is silent; other refusals (e.g. NotAllowedError, SecurityError) are reported. */
function isCancel(e) {
    return e && e.name === "AbortError";
}

/** True if the editor runs inside a frame, e.g. an IDE preview. */
export function isEmbedded() {
    try {
        return window.self !== window.top;
    } catch (_) {
        return true; // a cross-origin parent cannot be inspected
    }
}

export class LocalFileRepository extends ModelRepository {
    constructor() {
        super("local", "Local files");
        this.embedded = typeof window !== "undefined" && isEmbedded();
        this.hasFileSystemAccess = typeof window !== "undefined" && "showOpenFilePicker" in window && !this.embedded;
        this.hasDirectoryAccess = typeof window !== "undefined" && "showDirectoryPicker" in window && !this.embedded;
        this.capabilities = { open: true, openFolder: true, save: true, saveAs: true, browse: false };
        /** The opened folder: { name, handle } (handle null if the browser cannot write to it), or null. */
        this.folder = null;
    }

    /**
     * Opens a folder: the .sysml and .kerml files in it. Files in subfolders are not opened.
     * @returns {Promise<{folder: {name: string, handle: object|null}, files: object[]}>}
     */
    async openFolder() {
        if (this.hasDirectoryAccess) {
            let root;
            try {
                root = await window.showDirectoryPicker({ id: "mbse-methodology-folder", mode: "readwrite" });
            } catch (e) {
                if (isCancel(e)) throw new CancelledError();
                throw e;
            }
            this.folder = { name: root.name, handle: root };
            return { folder: this.folder, files: await readFolder(root) };
        }
        // Other browsers: read the folder with a file input; the files are saved as downloads.
        const picked = await pickFiles({ folder: true });
        const files = [];
        let folderName = "";
        for (const file of picked) {
            const path = (file.webkitRelativePath || file.name).split("/");
            folderName = folderName || (path.length > 1 ? path[0] : "");
            // Only the files of the folder itself, not those of its subfolders.
            if (!MODEL_FILE.test(file.name) || path.length > 2) continue;
            files.push({ name: file.name, content: await file.text(), handle: null, origin: "folder" });
        }
        this.folder = { name: folderName || "folder", handle: null };
        return { folder: this.folder, files: files.sort((a, b) => a.name.localeCompare(b.name)) };
    }

    /** Reads the files of the opened folder again (File System Access API only). */
    async reloadFolder() {
        if (!this.folder || !this.folder.handle) throw new Error("Open the folder again to read its files.");
        return { folder: this.folder, files: await readFolder(this.folder.handle) };
    }

    async open() {
        if (this.hasFileSystemAccess) {
            let handles;
            try {
                handles = await window.showOpenFilePicker({ multiple: true, types: FILE_TYPES });
            } catch (e) {
                if (isCancel(e)) throw new CancelledError();
                throw e;
            }
            return Promise.all(handles.map(async handle => {
                const file = await handle.getFile();
                return { name: file.name, content: await file.text(), handle, origin: "file" };
            }));
        }
        const files = await pickFiles();
        return Promise.all(files.map(async file => ({ name: file.name, content: await file.text(), handle: null, origin: "file" })));
    }

    async save(document) {
        if (document.handle && document.handle.createWritable) {
            await write(document.handle, document.content);
            return { name: document.name, handle: document.handle };
        }
        // A new document is saved into the opened folder.
        if (this.folder && this.folder.handle) {
            const path = document.name.split("/");
            let directory = this.folder.handle;
            for (const segment of path.slice(0, -1)) directory = await directory.getDirectoryHandle(segment, { create: true });
            const handle = await directory.getFileHandle(path[path.length - 1], { create: true });
            await write(handle, document.content);
            return { name: document.name, handle };
        }
        return this.saveAs(document);
    }

    async saveAs(document) {
        if (this.hasFileSystemAccess) {
            let handle;
            try {
                handle = await window.showSaveFilePicker({ suggestedName: document.name, types: FILE_TYPES });
            } catch (e) {
                if (isCancel(e)) throw new CancelledError();
                throw e;
            }
            await write(handle, document.content);
            return { name: handle.name, handle };
        }
        download(document.name, document.content);
        return { name: document.name, handle: null };
    }
}

async function write(handle, content) {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
}

const MODEL_FILE = /\.(sysml|kerml)$/i;

/** The model files of a folder (not of its subfolders), in alphabetical order. */
async function readFolder(directory) {
    const files = [];
    for await (const [name, handle] of directory.entries()) {
        if (handle.kind !== "file" || !MODEL_FILE.test(name)) continue;
        files.push({ name, content: await (await handle.getFile()).text(), handle, origin: "folder" });
    }
    return files.sort((a, b) => a.name.localeCompare(b.name));
}

function pickFiles({ folder = false } = {}) {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        if (folder) input.webkitdirectory = true;
        else input.accept = ".sysml,.kerml,text/plain";
        input.hidden = true;
        // Some browsers and embedded webviews open the dialog only for an input in the page.
        document.body.appendChild(input);
        const done = () => input.remove();
        input.addEventListener("change", () => { done(); input.files.length ? resolve([...input.files]) : reject(new CancelledError()); });
        input.addEventListener("cancel", () => { done(); reject(new CancelledError()); });
        input.click();
    });
}

function download(name, content) {
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
