// Downloads the SysML engine (@sysml/wasm of the Open-MBEE sysml-toolkit) into vendor/. The served editor loads
// it from there: the package is published on GitHub only, which browsers cannot download from (no CORS).
//
// Usage (from the repository root):  node tools/fetch-engine.mjs
// The release and each file are verified against the hashes in src/config.js. vendor/ is not committed (.gitignore).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { downloadEnginePackage, mb } from "./engine-package.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { config } = await import(pathToFileURL(resolve(root, "src/config.js")).href);
const local = config.engine.sources.find(s => !/^https?:/.test(s.base));
const target = resolve(root, local.base);

try {
    const files = await downloadEnginePackage(config.engine);
    for (const [path, bytes] of files) {
        await mkdir(dirname(resolve(target, path)), { recursive: true });
        await writeFile(resolve(target, path), bytes);
        console.log(`  ${path} (${mb(bytes.length)})`);
    }
    console.log(`${config.engine.name} ${config.engine.version} is in ${target}`);
} catch (e) {
    console.error(`Download failed: ${e.message}`);
    process.exit(1);
}
