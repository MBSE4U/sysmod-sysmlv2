// Model provider for SysML v2 textual notation.
//
// A model provider turns a model source into what the views show:
//   load() -> { model: EeeModel, diagnostics: Diagnostic[], locate(id): SourceLocation | null }
// This provider parses the open .sysml documents (and the EEE library) with the SysML engine.
// A provider for the SysML v2 API answers the same shape from the elements of a project commit.

import { buildEeeModel, LANGUAGE_TYPES } from "../eee/EeeModelBuilder.js";
import { buildOutline, locate } from "../text/sysml-text.js";

/**
 * Builds the provider result from an engine analysis of the given documents.
 * Pure function: the Node smoke test uses it without a worker.
 * @param {object} analysis result of engine.analyze()
 * @param {{name: string, content: string}[]} documents
 */
export function buildFromAnalysis(analysis, documents) {
    const outlines = new Map(documents.map(d => [d.name, buildOutline(d.content)]));

    // Each document root lists the top-level packages declared by the document.
    const documentOfPackage = new Map();
    for (const root of analysis.documentRoots) {
        for (const packageId of root.packageIds) {
            if (!documentOfPackage.has(packageId)) documentOfPackage.set(packageId, root.document);
        }
    }
    const documentOf = id => documentOfPackage.get(id.split("::")[0]) || "";

    const locateNode = id => {
        const document = documentOf(id);
        const outline = outlines.get(document);
        const node = outline ? locate(outline, id) : null;
        return node ? { document, node } : null;
    };

    const model = buildEeeModel(analysis.symbols, { documentOf, truncated: analysis.truncated });

    return {
        model,
        diagnostics: analysis.diagnostics,
        /** Source location of an element: { document, start, end, nameStart, nameEnd, bodyOpen, bodyClose } */
        locate: id => {
            const found = locateNode(id);
            if (!found) return null;
            const { start, end, nameStart, nameEnd, bodyOpen, bodyClose } = found.node;
            return { document: found.document, start, end, nameStart, nameEnd, bodyOpen, bodyClose };
        },
    };
}

export class TextModelProvider {
    /**
     * @param {object} engine parser service with analyze(documents, options)
     * @param {{libraryNames: string[]}} options
     */
    constructor(engine, { libraryNames = [] } = {}) {
        this.engine = engine;
        this.libraryNames = libraryNames;
    }

    /** @param {{name: string, content: string}[]} documents all documents, libraries included */
    async load(documents) {
        const plain = documents.map(d => ({ name: d.name, content: d.content }));
        const analysis = await this.engine.analyze(plain, { libraryNames: this.libraryNames, languageTypes: LANGUAGE_TYPES });
        return buildFromAnalysis(analysis, plain);
    }
}
