// Configuration of the MBSE Methodology editor.

const ENGINE_VERSION = "0.12.0";

export const config = {
    engine: {
        // The sysmlv2 toolkit of Open-MBEE (https://github.com/Open-MBEE/sysml-toolkit), compiled to WebAssembly:
        // the package @sysml/wasm (Apache License 2.0; the bundled SysML v2 standard library: EPL-2.0).
        // It is published as a release asset on GitHub only, which browsers cannot download (no CORS), so the
        // editor loads a local copy: "node tools/fetch-engine.mjs" downloads it, the standalone build embeds it.
        name: "sysmlv2",
        version: ENGINE_VERSION,
        release: {
            url: `https://github.com/Open-MBEE/sysml-toolkit/releases/download/v${ENGINE_VERSION}/sysml-wasm-${ENGINE_VERSION}.tgz`,
            // From the release's SHA256SUMS.
            sha256: "1c905c0edfcd3abaf23a82a71e770a52d2cef69a9b06f4e6ad7e49a4aaea08f2",
        },
        // The files the editor uses, as paths in the package, with their SHA-256. The worker refuses files that do
        // not match. "gzip": the package file is gzip-compressed and is decompressed after the check.
        files: {
            glue: { path: "sysmlv2.js", sha256: "596d69bce6abeb0c704e7fc58906af64837628193f6a6b2936aa825a1e0d89cd" },
            wasm: { path: "sysmlv2_bg.wasm", sha256: "ca04ff526171fb4b36a064971efd993f41bc9c10e1cf34f1dfd409b51e07a32f" },
            // The SysML v2 standard library as source units, and the same library resolved and frozen.
            libraryBundle: { path: "stdlib/sysml-library.json.gz", sha256: "04cbfb6549c7cd7ff2cc23f4ed0d6b9126c6a5ecab71a068b0fb87c6f94413bf", gzip: true },
            libraryPrepared: { path: "stdlib/sysml-library.prepared.gz", sha256: "550cdc69c6d74361421a4eda267cde145681a064b851014742419caabe787040", gzip: true },
        },
        // Tried in order; relative URLs refer to index.html.
        sources: [
            { label: "local copy", base: `vendor/sysml-wasm-${ENGINE_VERSION}/` },
        ],
    },

    // The libraries are parsed together with the user's documents: MBSEMethodology, the DTFA extension and SYSMOD.
    // Each library is loaded from the first URL that works: the copy in this repository (when the editor is served
    // from the repository root), then the GitHub copy.
    libraries: [
        "MBSEMethodology.sysml", "DTFA.sysml", "ISO15288Processes.sysml", "SYSMODBase.sysml", "SYSMOD.sysml",
        "SYSMODProcesses.sysml", "SYSMOD4AI.sysml", "SYSMODRequirementsBoilerPlates.sysml", "SYSMODViews.sysml",
    ].map(name => ({ name, urls: [`../${name}`, `https://cdn.jsdelivr.net/gh/MBSE4U/sysmod-sysmlv2@main/${name}`] })),

    // Examples of this repository, opened from the "Examples" menu.
    examples: [
        { label: "Digital Thread Flow Analysis: control unit engineering", files: ["../examples/DTFAControlUnit.sysml"] },
        {
            label: "SYSMOD: Delivery Drone project and MBSE environment",
            files: [
                "../examples/DeliveryDroneSystemProject.sysml",
                "../examples/DeliveryDroneSystemControlStationProject.sysml",
                "../examples/DeliveryDroneSystemControlStationHandover.sysml",
                "../examples/DeliveryDroneSystemDomainLibrary.sysml",
                "../examples/DeliveryDroneSystemStakeholders.sysml",
                "../examples/DeliveryDroneSystemIdea.sysml",
                "../examples/DeliveryDroneSystemSpecification.sysml",
                "../examples/DeliveryDroneSystemBrownfieldArchitecture.sysml",
                "../examples/DeliveryDroneSystemFunctionalArchitecture.sysml",
                "../examples/DeliveryDroneSystemLogicalArchitecture.sysml",
                "../examples/DeliveryDroneSystemProductArchitecture.sysml",
            ],
        },
    ],

    // Delay after the last keystroke before the model is checked again.
    checkDelayMs: 700,

    // Key for the drafts of unsaved documents in the browser's local storage.
    draftStorageKey: "mbse-methodology-editor-drafts-v2",

    // SysML v2 API server for a future version (see src/sysml-api/).
    sysmlApi: { baseUrl: "" },
};
