// Files on the user's computer.
//
// With the File System Access API (Chrome, Edge) the editor saves back to the opened file.
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
        this.capabilities = { open: true, save: true, saveAs: true, browse: false };
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

function pickFiles() {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = ".sysml,.kerml,text/plain";
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
