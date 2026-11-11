// Builds the editor as one self-contained HTML file that works when opened from disk (file://),
// without a web server and without network access.
//
// Usage (from the repository root):
//   node tools/build-standalone.mjs [--repo <sysmod-sysmlv2 repository>] [--out <file>]
//
// The file contains:
//   - the editor code, bundled into one inline module script, and the stylesheets
//   - the engine worker, bundled into a classic script and started from a blob: URL
//     (browsers do not start module workers from file:// URLs)
//   - the SysML engine (sysmlv2 of the Open-MBEE sysml-toolkit) with the prepared SysML v2 standard library,
//     about 12 MB compressed, verified against the hashes in src/config.js; the worker verifies it again
//   - the libraries (MBSEMethodology, EEE, SYSMOD) and the examples
//   - the licenses of the editor, the engine and the standard library
//
// The engine files are taken from the local copy (tools/fetch-engine.mjs) or downloaded from the GitHub release.
// The libraries and examples are read from the repository (--repo, default: the parent directory)
// or downloaded from GitHub via jsDelivr.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { gzipSync, constants as zlib } from "node:zlib";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnginePackage, LICENSE_FILES, mb } from "./engine-package.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { config } = await import(pathToFileURL(resolve(root, "src/config.js")).href);

const args = parseArgs(process.argv.slice(2));
const outFile = resolve(args.out || resolve(root, "dist/mbse-methodology-editor.html"));
const REMOTE = "https://cdn.jsdelivr.net/gh/MBSE4U/sysmod-sysmlv2@main/";

function parseArgs(argv) {
    const result = {};
    for (let i = 0; i < argv.length; i++) {
        const m = /^--(repo|out)$/.exec(argv[i]);
        if (!m || i + 1 >= argv.length) {
            console.error("Usage: node tools/build-standalone.mjs [--repo <sysmod-sysmlv2 repository>] [--out <file>]");
            process.exit(2);
        }
        result[m[1]] = argv[++i];
    }
    return result;
}

const exists = path => access(path).then(() => true, () => false);

async function fetchBytes(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return Buffer.from(await response.arrayBuffer());
}

// ---------- libraries and examples ----------

/** The config paths are relative to index.html, e.g. "../MBSEMethodology.sysml" for the editor inside the repository. */
async function repoRoot() {
    const candidates = args.repo ? [resolve(args.repo)] : [resolve(root, "..")];
    for (const dir of candidates) {
        if (await exists(resolve(dir, config.libraries[0].name))) return dir;
    }
    if (args.repo) throw new Error(`${config.libraries[0].name} not found in ${resolve(args.repo)}`);
    return null;
}

async function repoFile(dir, configPath) {
    const path = configPath.replace(/^(\.\.\/)+/, "");
    if (dir) return readFile(resolve(dir, path), "utf8");
    return (await fetchBytes(REMOTE + path)).toString("utf8");
}

// ---------- bundler ----------
// A minimal bundler for the module style of src/: named imports ("import { a, b as c } from",
// "import * as ns from") and exported declarations ("export class|function|const ..."). Each module
// becomes a function scope; modules are evaluated in dependency order. Anything else is rejected,
// so a new syntax in src/ fails the build instead of producing a broken file.

const IMPORT = /^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?[ \t]*$/gm;
const EXPORT = /^export\s+((?:async\s+)?function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;

async function bundle(entryFile, entrySource) {
    const modules = new Map(); // file -> { id, code, deps }
    const order = [];
    const visiting = new Set();

    async function load(file, source) {
        if (modules.has(file)) return modules.get(file);
        if (visiting.has(file)) throw new Error(`circular import of ${relative(root, file)}`);
        visiting.add(file);
        const text = source ?? await readFile(file, "utf8");
        const deps = [];
        let code = text.replace(IMPORT, (_, bindings, spec) => {
            deps.push(resolve(dirname(file), spec));
            return `\u0000${deps.length - 1}\u0000${bindings}\u0000`;
        });
        const exported = [];
        code = code.replace(EXPORT, (_, kind, name) => { exported.push(name); return `${kind} ${name}`; });
        const rest = /^\s*(import|export)\b[^(\n]*$/m.exec(code);
        if (rest) throw new Error(`${relative(root, file)}: unsupported module syntax: ${rest[0].trim()}`);
        const depModules = [];
        for (const dep of deps) depModules.push(await load(dep));
        code = code.replace(/\u0000(\d+)\u0000([\s\S]*?)\u0000/g, (_, i, bindings) => {
            const target = depModules[Number(i)].id;
            const ns = /^\*\s+as\s+([\w$]+)$/.exec(bindings.trim());
            if (ns) return `const ${ns[1]} = ${target};`;
            const named = /^\{([\s\S]*)\}$/.exec(bindings.trim());
            if (!named) throw new Error(`${relative(root, file)}: unsupported import ${bindings}`);
            const list = named[1].split(",").map(s => s.trim()).filter(Boolean)
                .map(s => s.replace(/^([\w$]+)\s+as\s+([\w$]+)$/, "$1: $2"));
            return `const { ${list.join(", ")} } = ${target};`;
        });
        visiting.delete(file);
        const module = { id: `__module${modules.size}`, file, code, exported };
        modules.set(file, module);
        order.push(module);
        return module;
    }

    await load(entryFile, entrySource);
    return order.map(m =>
        `// ${relative(root, m.file).split(sep).join("/")}\nconst ${m.id} = (() => {\n${m.code.trim()}\nreturn { ${m.exported.join(", ")} };\n})();\n`
    ).join("\n");
}

// ---------- HTML ----------

/** Inline scripts end at the first "</script"; the code must not contain it. */
function inlineScript(code, where) {
    if (/<\/script|<!--/i.test(code)) throw new Error(`${where} contains "</script" or "<!--" and cannot be inlined`);
    return code;
}

/** JSON that is safe inside a <script> element. */
const scriptJson = value => JSON.stringify(value).replace(/</g, "\\u003c");

const STANDALONE_ENTRY = `
import { config } from "./config.js";
import { App } from "./app/App.js";

// Data embedded by tools/build-standalone.mjs.
const text = id => document.getElementById(id).textContent;
const embedded = JSON.parse(text("methodology-embedded"));
const workerUrl = URL.createObjectURL(new Blob([text("engine-worker")], { type: "text/javascript" }));
const embeddedFile = kind => {
    const element = document.getElementById("engine-file-" + kind);
    return { url: "data:application/octet-stream;base64," + element.textContent.trim(), gzip: element.dataset.gzip === "true" };
};

config.standalone = true;
config.engine = {
    ...config.engine,
    worker: { url: workerUrl, type: "classic" },
    sources: [{
        label: "the embedded copy",
        files: Object.fromEntries(Object.keys(config.engine.files).map(kind => [kind, embeddedFile(kind)])),
    }],
};
config.libraries = embedded.libraries;
config.examples = embedded.examples;

const app = new App(config);
app.start();
// Exposed for debugging in the browser console.
window.methodologyEditor = app;
`;

async function build() {
    const { name, version, files } = config.engine;
    const enginePackage = await loadEnginePackage(config.engine, root);
    // Files that the package does not compress are compressed for the embedding.
    const engineScripts = Object.entries(files).map(([kind, file]) => {
        const bytes = enginePackage.get(file.path);
        const gzip = !file.gzip;
        const data = gzip ? gzipSync(bytes, { level: zlib.Z_BEST_COMPRESSION }) : bytes;
        console.log(`  ${file.path}: ${mb(data.length)}${gzip ? " compressed" : ""}`);
        return `<script type="text/plain" id="engine-file-${kind}" data-gzip="${gzip}">${data.toString("base64")}</script>`;
    });

    const repo = await repoRoot();
    console.log(`Libraries and examples from ${repo || REMOTE}`);
    const embedded = {
        libraries: await Promise.all(config.libraries.map(async l => ({ name: l.name, content: await repoFile(repo, l.urls[0]) }))),
        examples: await Promise.all(config.examples.map(async example => ({
            label: example.label,
            files: await Promise.all(example.files.map(async path => ({
                name: path.split("/").pop(),
                content: await repoFile(repo, path),
            }))),
        }))),
    };

    const appCode = await bundle(resolve(root, "src/standalone-main.js"), STANDALONE_ENTRY);
    const workerCode = await bundle(resolve(root, "src/engine/engine.worker.js"));
    const css = (await Promise.all(["css/editor.css", "css/views.css", "css/eee.css"].map(f => readFile(resolve(root, f), "utf8")))).join("\n");
    if (/<\/style/i.test(css)) throw new Error("the stylesheets contain \"</style\"");

    const engineTitle = `SysML engine ${name} ${version} (@sysml/wasm, https://github.com/Open-MBEE/sysml-toolkit), embedded below as "engine-file-*"`;
    const licenses = [
        ["MBSE Methodology editor", await readFile(resolve(root, "LICENSE"), "utf8")],
        ...LICENSE_FILES.map(path => [`${engineTitle}: ${path}`, enginePackage.get(path).toString("utf8")]),
    ];
    const licenseText = licenses.map(([title, text]) => `==== ${title} ====\n\n${text.trim()}\n`).join("\n")
        .replace(/--/g, "- -"); // "--" is not allowed inside an HTML comment

    let html = await readFile(resolve(root, "index.html"), "utf8");
    const replace = (pattern, replacement) => {
        if (!pattern.test(html)) throw new Error(`index.html: ${pattern} not found`);
        html = html.replace(pattern, () => replacement);
    };
    replace(/<!doctype html>/i, `<!doctype html>\n<!--\nMBSE Methodology Editor, standalone build: open this file in a browser, no web server needed.\nBuilt by tools/build-standalone.mjs on ${new Date().toISOString().slice(0, 10)}.\n\n${licenseText}-->`);
    replace(/[ \t]*<link rel="stylesheet" href="css\/editor.css">\s*<link rel="stylesheet" href="css\/views.css">\s*<link rel="stylesheet" href="css\/eee.css">/, `    <style>\n${css}\n    </style>`);
    replace(/<script type="module" src="src\/main.js"><\/script>/, "");
    replace(/<\/body>/, [
        `<script type="application/json" id="methodology-embedded">${scriptJson(embedded)}</script>`,
        `<script type="text/plain" id="engine-worker">${inlineScript(workerCode, "the worker bundle")}</script>`,
        ...engineScripts,
        `<script type="module">\n${inlineScript(appCode, "the editor bundle")}</script>`,
        `</body>`,
    ].join("\n"));

    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, html);
    console.log(`Wrote ${relative(process.cwd(), outFile) || outFile} (${mb(Buffer.byteLength(html))})`);
}

build().catch(e => {
    console.error(`Build failed: ${e.message}`);
    process.exit(1);
});
