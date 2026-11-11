// Configuration of the MBSE Methodology editor.

const ENGINE_VERSION = "0.11.3";

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
            sha256: "f2ddf1dc6108ce33426f371b8df1b0903ca1d09dc38c610a4153ed9e8c97b4ef",
        },
        // The files the editor uses, as paths in the package, with their SHA-256. The worker refuses files that do
        // not match. "gzip": the package file is gzip-compressed and is decompressed after the check.
        files: {
            glue: { path: "sysmlv2.js", sha256: "379627ea6c61330fc993ad8ab9aef8bd895294ad793b3397672af960093377f0" },
            wasm: { path: "sysmlv2_bg.wasm", sha256: "b018f4dff2d56db0264d135a78f9c615fb303328f62c105f28727d1dbe3c780a" },
            // The SysML v2 standard library as source units, and the same library resolved and frozen.
            libraryBundle: { path: "stdlib/sysml-library.json.gz", sha256: "04cbfb6549c7cd7ff2cc23f4ed0d6b9126c6a5ecab71a068b0fb87c6f94413bf", gzip: true },
            libraryPrepared: { path: "stdlib/sysml-library.prepared.gz", sha256: "9fd6b542f1ad1484521cd7e8dcdedc8aa3644da82cf0c985c30555f411be2cc5", gzip: true },
        },
        // Tried in order; relative URLs refer to index.html.
        sources: [
            { label: "local copy", base: `vendor/sysml-wasm-${ENGINE_VERSION}/` },
        ],
    },

    // The libraries are parsed together with the user's documents: MBSEMethodology, the EEE extension and SYSMOD.
    // Each library is loaded from the first URL that works: the copy in this repository (when the editor is served
    // from the repository root), then the GitHub copy.
    libraries: [
        "MBSEMethodology.sysml", "EEE.sysml", "ISO15288Processes.sysml", "SYSMODBase.sysml", "SYSMOD.sysml",
        "SYSMODProcesses.sysml", "SYSMOD4AI.sysml", "SYSMODRequirementsBoilerPlates.sysml", "SYSMODViews.sysml",
    ].map(name => ({ name, urls: [`../${name}`, `https://cdn.jsdelivr.net/gh/MBSE4U/sysmod-sysmlv2@main/${name}`] })),

    // Examples of this repository, opened from the "Examples" menu.
    examples: [
        { label: "EEE check: control unit engineering", files: ["../examples/EEECheckControlUnit.sysml"] },
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
    draftStorageKey: "mbse-methodology-editor-drafts-v1",

    // SysML v2 API server for a future version (see src/sysml-api/).
    sysmlApi: { baseUrl: "" },
};
