// Web Worker that runs the SysML engine (sysmlv2 WebAssembly, see engine-core.js) off the UI thread.
//
// Protocol: the page posts { id, op, args }; the worker answers { id, result } or { id, error },
// and posts { type: "progress", stage, label, loaded, total } while it loads the engine.

import * as core from "./engine-core.js";
import { sha256Hex } from "./sha256.js";

let engine = null;
let loaded = null; // the verified engine files, kept to restart a trapped engine

async function verify(buffer, expected, label) {
    if (!expected) return;
    const actual = await sha256Hex(buffer);
    if (actual !== expected) {
        throw new Error(`${label} does not match its published SHA-256 (expected ${expected}, got ${actual})`);
    }
}

/** URLs for error messages; embedded data: URLs are megabytes long. */
function shortUrl(url) {
    return url.startsWith("data:") ? "the embedded copy" : url;
}

function gunzip(buffer) {
    return new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}

async function download(url, label, { gzip = false } = {}) {
    let response = await fetch(url);
    if (!response.ok) throw new Error(`${label} could not be loaded from ${shortUrl(url)} (HTTP ${response.status})`);
    if (gzip) response = new Response(response.body.pipeThrough(new DecompressionStream("gzip")));
    const total = Number(response.headers.get("Content-Length") || 0);
    if (!response.body || !response.body.getReader) return response.arrayBuffer();
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        postMessage({ type: "progress", stage: "download", label, loaded, total });
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes.buffer;
}

/**
 * Downloads and verifies the engine files from the first source that delivers all of them.
 * @param {{label: string, files: Object<string, {url: string, gzip: boolean}>}[]} sources
 *        gzip: compressed for the transport (the standalone build), decompressed before the check
 * @param {Object<string, {path: string, sha256: string, gzip?: boolean}>} files
 *        gzip: the package file is compressed, decompressed after the check
 */
async function loadFiles(sources, files) {
    const failures = [];
    for (const source of sources) {
        try {
            postMessage({ type: "progress", stage: "source", label: source.label });
            const result = { source: source.label };
            for (const [kind, file] of Object.entries(files)) {
                const { url, gzip } = source.files[kind];
                let bytes = await download(url, file.path, { gzip });
                await verify(bytes, file.sha256, file.path);
                if (file.gzip) bytes = await gunzip(bytes);
                result[kind] = bytes;
            }
            return result;
        } catch (e) {
            failures.push(`${source.label}: ${e && e.message ? e.message : e}`);
        }
    }
    throw new Error("The engine files could not be loaded from any source.\n" + failures.join("\n"));
}

async function start() {
    postMessage({ type: "progress", stage: "start", label: loaded.source });
    if (!loaded.module) loaded.module = await WebAssembly.compile(loaded.wasm);
    engine = await core.createEngine(new TextDecoder().decode(loaded.glue), loaded.module, {
        libraryBundle: new TextDecoder().decode(loaded.libraryBundle),
        libraryPrepared: new Uint8Array(loaded.libraryPrepared),
    });
}

async function init({ sources, files }) {
    if (!engine) {
        if (!loaded) loaded = await loadFiles(sources, files);
        await start();
    }
    return { version: engine.version, source: loaded.source };
}

async function analyze({ documents, libraryNames, languageTypes }) {
    try {
        return core.analyze(engine, documents, { libraryNames, languageTypes });
    } catch (e) {
        if (!core.isTrap(e)) throw e;
        // A defect in the engine leaves its instance unusable: start a new one for the next check.
        engine = null;
        await start();
        throw new Error(`The SysML engine failed on this model (${e.message}) and was restarted. Details are in the browser console.`);
    }
}

const operations = { init, analyze };

self.onmessage = async ({ data }) => {
    const { id, op, args } = data;
    try {
        const operation = operations[op];
        if (!operation) throw new Error(`unknown operation ${op}`);
        if (op !== "init" && !engine) throw new Error("the engine is not started");
        postMessage({ id, result: await operation(args || {}) });
    } catch (e) {
        postMessage({ id, error: { message: e && e.message ? e.message : String(e), code: e && e.code } });
    }
};
