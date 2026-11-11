// The engine package (@sysml/wasm of the Open-MBEE sysml-toolkit) for the tools:
// downloaded from the GitHub release, verified, and read from the release tarball.

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export const mb = n => `${(n / 1048576).toFixed(1)} MB`;

/** The license and notice files of the package, passed on with the engine. */
export const LICENSE_FILES = ["LICENSE", "LICENSE-EPL-2.0", "THIRD-PARTY-NOTICES.md"];

/** Reads the files of a .tgz (ustar, as npm pack writes it) into a map path -> Buffer, without the "package/" prefix. */
export function untar(tgz) {
    const tar = gunzipSync(tgz);
    const files = new Map();
    const text = (offset, length) => tar.toString("utf8", offset, offset + length).replace(/\0[\s\S]*$/, "");
    let longName = null;
    for (let offset = 0; offset + 512 <= tar.length;) {
        const name = text(offset, 100);
        if (!name) break;
        const size = parseInt(text(offset + 124, 12).trim() || "0", 8);
        const type = text(offset + 156, 1) || "0";
        const prefix = text(offset + 345, 155);
        const data = tar.subarray(offset + 512, offset + 512 + size);
        if (type === "L") {
            longName = data.toString("utf8").replace(/\0[\s\S]*$/, "");
        } else if (type === "0" || type === "7") {
            const path = longName || (prefix ? `${prefix}/${name}` : name);
            files.set(path.replace(/^package\//, ""), Buffer.from(data));
            longName = null;
        } else if (type !== "x" && type !== "g") {
            longName = null;
        }
        offset += 512 + Math.ceil(size / 512) * 512;
    }
    return files;
}

/**
 * The verified engine files: the ones in config.engine.files plus the license files, as a map path -> Buffer.
 * Taken from the local copy if it is complete and valid, otherwise from the GitHub release.
 */
export async function loadEnginePackage(engineConfig, root) {
    const local = engineConfig.sources.find(s => !/^https?:/.test(s.base));
    if (local) {
        const dir = resolve(root, local.base);
        try {
            const files = new Map();
            for (const path of [...Object.values(engineConfig.files).map(f => f.path), ...LICENSE_FILES]) {
                files.set(path, await readFile(resolve(dir, path)));
            }
            verifyFiles(files, engineConfig);
            console.log(`Engine ${engineConfig.name} ${engineConfig.version} from ${dir}`);
            return files;
        } catch (e) {
            if (e.code !== "ENOENT") console.warn(`The local copy is not usable (${e.message}); downloading the engine.`);
        }
    }
    return downloadEnginePackage(engineConfig);
}

export async function downloadEnginePackage(engineConfig) {
    const { url, sha256: expected } = engineConfig.release;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    const tgz = Buffer.from(await response.arrayBuffer());
    const actual = sha256(tgz);
    if (actual !== expected) throw new Error(`${url} does not match its published SHA-256 (expected ${expected}, got ${actual})`);
    console.log(`Engine ${engineConfig.name} ${engineConfig.version}: ${mb(tgz.length)} from ${url}, SHA-256 verified`);
    const all = untar(tgz);
    const files = new Map();
    for (const path of [...Object.values(engineConfig.files).map(f => f.path), ...LICENSE_FILES]) {
        if (!all.has(path)) throw new Error(`${path} is missing in the engine package`);
        files.set(path, all.get(path));
    }
    verifyFiles(files, engineConfig);
    return files;
}

function verifyFiles(files, engineConfig) {
    for (const { path, sha256: expected } of Object.values(engineConfig.files)) {
        const actual = sha256(files.get(path));
        if (actual !== expected) throw new Error(`${path} does not match the SHA-256 in src/config.js (expected ${expected}, got ${actual})`);
    }
}
