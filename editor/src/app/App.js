// Application controller: connects workspace, repository, engine, model provider, model editor and views.
//
// The controller depends on interfaces only:
//   repository     ModelRepository      (LocalFileRepository now, SysmlApiRepository later)
//   provider       model provider       (TextModelProvider now, SysmlApiModelProvider later)
//   model editor   createModelEditor()  (TextModelEditor now, SysmlApiModelEditor later)
// The editors (environment, matrix, step definition, tool policy, form, text) show the same model and share one
// selection. The graphical and form editors change the model through commands; each command is one undoable step.

import { Workspace, SourceDocument } from "../workspace/Workspace.js";
import { TextModelProvider } from "../workspace/TextModelProvider.js";
import {
    TextModelEditor, ModelEditError, environmentElementLines, quoteName, analysisLines, methodLines, redefinitionLines, valueLines,
    stepDefinitionLines, toolTransitionLines, measureLines, policyRuleLines, stringLiteral, listValue,
} from "../workspace/TextModelEditor.js";
import { SysmlEngine } from "../engine/SysmlEngine.js";
import { LocalFileRepository } from "../repository/LocalFileRepository.js";
import { CancelledError } from "../repository/ModelRepository.js";
import {
    MBSEEnvironment, FlowAnalysis, Role, Tool, Method, Process, Artifact, Handover, ToolTransition, Measure, ToolPolicyRule,
    STEP_DEFINITION_LANES, RATINGS, POLICY_STATUS, laneValue,
} from "../dtfa/model.js";
import { analyzeAll } from "../dtfa/DtfaAnalyzer.js";
import { behaviorEdits } from "../dtfa/edits.js";
import { SNIPPETS, emptyPackage, environmentDocument } from "../dtfa/templates.js";
import { offsetOf, splitQualifiedName } from "../text/sysml-text.js";
import { CodeEditor } from "../ui/CodeEditor.js";
import { ModelOutlineView } from "../ui/ModelOutlineView.js";
import { ProblemsView } from "../ui/ProblemsView.js";
import { EnvironmentView } from "../ui/EnvironmentView.js";
import { MatrixView } from "../ui/MatrixView.js";
import { StepDefinitionView } from "../ui/StepDefinitionView.js";
import { PolicyView } from "../ui/PolicyView.js";
import { FormView } from "../ui/FormView.js";
import { ProcessView } from "../ui/ProcessView.js";
import { ElementsView } from "../ui/ElementsView.js";
import { formDialog, confirmDialog, infoDialog } from "../ui/FormDialog.js";

const $ = selector => document.querySelector(selector);
const VIEWS = ["environment", "roles", "tools", "methodology", "products", "process", "text", "form", "matrix", "steps", "policy"];
/** Views without a tab of their own: their tab shows only while they are open (the form, the DTFA views). */
const TRANSIENT_VIEWS = ["form", "matrix", "steps", "policy"];
/** The tab of the elements of a collection, and of an element. */
const COLLECTION_TABS = { roles: "roles", tools: "tools", methods: "methodology", products: "products" };
const VIEW_KEY = "mbse-methodology-editor-view";

/** Feature names of the MBSEMethodology and DTFA libraries; an element with such a name would be confused with them in the text. */
const RESERVED_NAMES = new Set(["goal", "viewpoints", "automationSteps", "rating", "priority", "explanation", "conversions", "products",
    "source", "target", "status", "addressedTransitions", "environment", "primaryPerformer", "additionalPerformers", "facilitationTools",
    "inputs", "outputs", "tools", "roles", "methodology", "analyses", "processes", "submethods", "subprocesses"]);

function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function ownerId(id) {
    const i = id.lastIndexOf("::");
    return i < 0 ? "" : id.slice(0, i);
}

function lowerFirst(s) {
    return s.charAt(0).toLowerCase() + s.slice(1);
}

/** A name from a label, e.g. "Model the architecture" -> "modelTheArchitecture". */
function nameFrom(label, fallback) {
    const words = String(label || "").replace(/[^A-Za-z0-9 _]/g, " ").trim().split(/\s+/).filter(Boolean);
    const name = words.map((w, i) => (i ? w.charAt(0).toUpperCase() + w.slice(1) : lowerFirst(w))).join("");
    return /^[A-Za-z_]/.test(name) ? name : fallback;
}

/** Drops edits inside regions that other edits of the same command delete. */
function mergeEdits(edits) {
    const deletions = edits.filter(e => e.text === "" && e.end > e.start);
    const kept = edits.filter(e => !deletions.some(d => d !== e && d.document === e.document && e.start >= d.start && e.end <= d.end));
    const seen = new Set();
    return kept.filter(e => {
        const key = `${e.document}:${e.start}:${e.end}:${e.text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export class App {
    constructor(config) {
        this.config = config;
        this.workspace = new Workspace();
        this.repository = new LocalFileRepository();
        this.engine = new SysmlEngine(config.engine);
        this.provider = new TextModelProvider(this.engine, { libraryNames: config.libraries.map(l => l.name) });
        this.activeName = null;
        this.analysis = null;       // { result, revision }
        this.analyses = new Map();  // flow analysis or environment id -> result of the DTFA analyzer
        this.selectedId = null;
        /** The collection editor shown in the form view, { kind, environmentId }, or null. */
        this.collection = null;
        /** The document whose editor the form view shows (its environments, processes, methods, roles, ...), or null. */
        this.documentView = null;
        /** The opened folder { name, handle }, or null. */
        this.folder = null;
        this.view = "environment";
        this.history = { undo: [], redo: [] };
        this.checkSequence = 0;
        this.engineReady = false;
        this.engineError = null;
        this.checkTimer = null;
        this.draftTimer = null;
    }

    async start() {
        this.editor = new CodeEditor($("#code"));
        this.modelView = new ModelOutlineView($("#model-outline"));
        this.problemsView = new ProblemsView($("#problems"), $("#problem-count"));
        this.environmentView = new EnvironmentView($("#environment"));
        this.matrixView = new MatrixView($("#matrix"));
        this.stepView = new StepDefinitionView($("#steps"));
        this.policyView = new PolicyView($("#policy"));
        this.formView = new FormView($("#form"));
        this.processView = new ProcessView($("#process"));
        this.elementViews = Object.fromEntries(["roles", "tools", "methodology", "products"].map(kind => [kind, new ElementsView($(`#${kind}`), kind)]));
        this.wireUi();

        this.workspace.addEventListener("change", e => this.onWorkspaceChange(e.detail));
        const restored = this.restoreDrafts();
        await this.loadLibraries();
        // Without documents of the user, the text view shows the first library until a file, a folder or an example is opened.
        const first = this.workspace.modelDocuments[0] || this.workspace.documents[0];
        if (this.activeName && this.workspace.get(this.activeName)) this.activate(this.activeName);
        else if (first) this.activate(first.name);
        if (restored) this.status(`Restored ${restored} document${restored === 1 ? "" : "s"} from your last session.`);
        if (this.repository.embedded) {
            this.status("The editor runs inside another page (e.g. an IDE preview): files open with a file dialog and save as downloads. "
                + "Open it directly in Chrome or Edge to save back to the files.", "note");
        }
        let view = "environment";
        try { view = localStorage.getItem(VIEW_KEY) || view; } catch (_) { /* storage unavailable */ }
        this.setView(VIEWS.includes(view) ? view : "environment");
        this.renderModelViews();
        this.startEngine();
    }

    // ---------- engine and checking ----------

    async startEngine() {
        const engineStatus = $("#engine-status");
        engineStatus.classList.remove("error");
        engineStatus.textContent = "Loading SysML engine…";
        this.engineError = null;
        this.renderModelViews("Starting the SysML engine…");
        const downloaded = new Map();
        try {
            const info = await this.engine.start(p => {
                if (p.stage === "download") {
                    downloaded.set(p.label, p.loaded);
                    const total = [...downloaded.values()].reduce((sum, n) => sum + n, 0);
                    engineStatus.textContent = `Loading SysML engine… ${(total / 1048576).toFixed(1)} MB`;
                } else if (p.stage === "start") {
                    engineStatus.textContent = "Starting SysML engine…";
                }
            });
            this.engineReady = true;
            engineStatus.textContent = `SysML engine ${info.version}`;
            engineStatus.title = `sysmlv2 ${info.version} (Open-MBEE sysml-toolkit), running in your browser; loaded from ${info.source}. Click for details.`;
            await this.check();
        } catch (e) {
            this.engineError = e.message;
            engineStatus.textContent = "SysML engine not available – details";
            engineStatus.title = "Click for the reason and what to do";
            engineStatus.classList.add("error");
            this.renderModelViews("The SysML engine could not be started. Click “SysML engine not available” in the toolbar for details.");
            this.status(`The SysML engine could not be started: ${e.message.split("\n")[0]}`, "error");
        }
    }

    showEngineDetails() {
        if (!this.engineError) {
            infoDialog("SysML engine", [
                `sysmlv2 ${this.engine.version} of the Open-MBEE sysml-toolkit, compiled to WebAssembly; loaded from ${this.engine.source}.`,
                "It checks the syntax, the name resolution and the semantic rules of SysML v2 against the standard library. The engine runs in your browser; your model is not uploaded.",
                "sysmlv2: Apache License 2.0 (Open-MBEE). SysML v2 standard library: Eclipse Public License 2.0.",
            ]);
            return;
        }
        const hints = [];
        if (location.protocol === "file:" && !this.config.standalone) hints.push("The editor was opened as a file. Serve the repository with a web server, e.g. “npx http-server . -p 8080”, or build the standalone file with “node tools/build-standalone.mjs”.");
        if (!this.config.standalone && /could not be loaded from any source|Failed to fetch|NetworkError|HTTP/.test(this.engineError)) {
            hints.push("The engine is loaded from the local copy in vendor/. Run “node tools/fetch-engine.mjs” in the editor directory to download it.");
        }
        if (/worker/i.test(this.engineError)) hints.push("Use a current Chrome, Edge, Firefox or Safari; the engine runs in a Web Worker.");
        infoDialog("The SysML engine could not be started", [this.engineError, ...hints], {
            actionLabel: "Retry",
            action: () => {
                this.engine.stop();
                this.engine = new SysmlEngine(this.config.engine);
                this.provider = new TextModelProvider(this.engine, { libraryNames: this.config.libraries.map(l => l.name) });
                this.startEngine();
            },
        });
    }

    scheduleCheck() {
        clearTimeout(this.checkTimer);
        this.checkTimer = setTimeout(() => this.check(), this.config.checkDelayMs);
    }

    /** Parses all documents and updates the views. Results of outdated checks are dropped. */
    async check() {
        clearTimeout(this.checkTimer);
        if (!this.engineReady) return null;
        const sequence = ++this.checkSequence;
        const revision = this.workspace.revision;
        $("#check-status").textContent = "Checking…";
        const started = performance.now();
        let result;
        try {
            result = await this.provider.load(this.workspace.documents, { browseLibraries: this.browsedLibraries() });
        } catch (e) {
            if (sequence === this.checkSequence) {
                $("#check-status").textContent = "Check failed";
                this.status(`The check failed: ${e.message}`, "error");
            }
            return null;
        }
        if (sequence !== this.checkSequence) return null;
        this.analysis = { result, revision };
        this.analyses = analyzeAll(result.model);
        $("#check-status").textContent = `Checked in ${Math.round(performance.now() - started)} ms`;
        if (this.selectedId && !result.model.get(this.selectedId)) this.selectedId = null;
        if (this.collection && !result.model.get(this.collection.environmentId)) this.collection = null;
        this.renderModelViews();
        this.problemsView.show(result.diagnostics, this.workspace.libraryNames);
        this.showDiagnosticsOfActive();
        return result;
    }

    /** Answers an analysis of the current text, checking again if the text changed since the last check. */
    async freshAnalysis() {
        if (this.analysis && this.analysis.revision === this.workspace.revision) return this.analysis.result;
        const result = await this.check();
        if (!result) throw new ModelEditError("The model could not be checked. Wait until the SysML engine has started.");
        return result;
    }

    createModelEditor(result) {
        return new TextModelEditor({ locate: result.locate, documentText: name => this.workspace.get(name).content });
    }

    // ---------- views and selection ----------

    setView(view) {
        // The element the previous view shows, e.g. the process of the graph, for the text view to jump to.
        const context = view === "text" && this.view !== "text" ? this.contextId(this.view) : null;
        this.view = view;
        for (const v of VIEWS) {
            $(`#view-${v}`).hidden = v !== view;
            const tab = document.querySelector(`[data-view-tab="${v}"]`);
            tab.setAttribute("aria-selected", String(v === view));
            tab.classList.toggle("active", v === view);
            if (TRANSIENT_VIEWS.includes(v)) tab.hidden = v !== view;
        }
        try { localStorage.setItem(VIEW_KEY, view); } catch (_) { /* storage unavailable */ }
        if (view === "text" && this.active) {
            if (this.editor.value !== this.active.content) this.editor.setValue(this.active.content, { readOnly: this.active.readOnly, keepView: true });
            this.editor.render();
        }
        this.renderModelViews();
        if (context) {
            const result = this.analysis && this.analysis.result;
            if (result && result.locate(context)) this.reveal(context);
        }
    }

    /**
     * The element a view shows: the element of the graph (Roles, Tools, Methodology, Products), the selected step or the
     * process of the Processes view, the selected element or the environment of the Environment view, the element of the
     * form, or the selection.
     */
    contextId(view) {
        const model = this.analysis && this.analysis.result.model;
        if (!model) return null;
        const selected = model.get(this.selectedId) ? this.selectedId : null;
        if (this.elementViews && this.elementViews[view]) return this.elementViews[view].currentId || selected;
        if (view === "process") {
            const process = model.get(this.processView.processId);
            if (!process || this.processView.overview) return selected;
            const steps = model.flowOf(process).steps;
            return selected && steps.some(s => s.id === selected) ? selected : process.id;
        }
        if (view === "environment") return this.environmentView.environmentId || selected;
        if (view === "form" && this.collection) return this.collection.environmentId;
        return selected;
    }

    viewState(message) {
        const model = this.analysis ? this.analysis.result.model : null;
        return { model, analyses: this.analyses, selectedId: this.selectedId, collection: this.collection, document: this.documentView,
            activeDocument: this.activeName, environmentId: model ? this.currentEnvironmentId(model) : null, editable: true, message };
    }

    /**
     * The MBSE environment the views show: a selected environment; otherwise the one of the active document (a file
     * typically declares one); none for a document with methodology elements but no environment (e.g. the library
     * ISO15288Processes: the views show its elements); otherwise the last or the first environment of the model.
     */
    currentEnvironmentId(model) {
        const selected = model.get(this.selectedId);
        if (selected instanceof MBSEEnvironment) { this.environmentId = selected.id; return selected.id; }
        const own = model.environments.filter(e => e.document === this.activeName);
        if (own.length) {
            if (!own.some(e => e.id === this.environmentId)) this.environmentId = own[0].id;
            return this.environmentId;
        }
        const methodologyElement = e => e.document === this.activeName && (e instanceof Role || e instanceof Tool || e instanceof Method || e instanceof Process || e instanceof Artifact);
        if ([...model.elements.values()].some(methodologyElement)) return null;
        if (!(model.get(this.environmentId) instanceof MBSEEnvironment)) this.environmentId = model.environments[0] ? model.environments[0].id : null;
        return this.environmentId;
    }

    renderModelViews(message) {
        const state = this.viewState(message);
        this.modelView.show(state.model, { editable: true, message, selectedId: this.selectedId, analyses: this.analyses, activeDocument: this.activeName });
        // Hidden views render when they are shown.
        if (this.view === "environment") this.environmentView.show(state);
        if (this.view === "matrix") this.matrixView.show(state);
        if (this.view === "steps") this.stepView.show(state);
        if (this.view === "policy") this.policyView.show(state);
        if (this.view === "form") this.formView.show(state);
        if (this.view === "process") this.processView.show(state);
        if (this.elementViews[this.view]) this.elementViews[this.view].show(state);
    }

    /**
     * Opens the editor of an element, e.g. after a click on a link: the form of a role, tool, method, process or product
     * (the role editor etc.), the environment view of an MBSE environment. Other elements are selected in the current view.
     */
    openElement(id) {
        const model = this.analysis && this.analysis.result.model;
        const element = model && model.get(id);
        this.select(id, { reveal: false });
        // The graph of the element with its connected artifacts, in the tab of its kind; its form is one click away.
        if (element instanceof MBSEEnvironment) this.setView("environment");
        else if (element instanceof Role) this.setView("roles");
        else if (element instanceof Tool) this.setView("tools");
        else if (element instanceof Method || element instanceof Process) this.setView("methodology");
        else if (element instanceof Artifact) this.setView("products");
    }

    /** Opens the form of an element. */
    openForm(id) {
        this.select(id, { reveal: false });
        this.setView("form");
    }

    /**
     * Opens the editor of a collection of an MBSE environment ("roles", "tools", "methods" or "products"): the existing
     * elements, including the inherited ones, and the command to create new ones. The environment stays selected.
     */
    openCollection(kind, environmentId) {
        // The tab of the collection, e.g. Roles, with the elements of the environment.
        if (COLLECTION_TABS[kind]) {
            if (environmentId) this.environmentId = environmentId;
            this.collection = null;
            this.documentView = null;
            this.setView(COLLECTION_TABS[kind]);
            return;
        }
        this.openTable(kind, environmentId);
    }

    /** The table of a collection of an environment in the form view: all elements, with the command to create new ones. */
    openTable(kind, environmentId) {
        this.selectedId = environmentId;
        this.documentView = null;
        this.collection = { kind, environmentId };
        this.setView("form");
    }

    /** Selects an element in all views; in the text view, shows its declaration. */
    select(id, { reveal = this.view === "text" } = {}) {
        this.selectedId = id;
        this.collection = null;
        this.documentView = null;
        const model = this.analysis && this.analysis.result.model;
        const element = model && model.get(id);
        if (element instanceof FlowAnalysis) this.matrixView.selectCheck(id);
        this.renderModelViews();
        if (reveal) this.reveal(id);
    }

    // ---------- documents ----------

    async loadLibraries() {
        const missing = [];
        await Promise.all(this.config.libraries.map(async ({ name, urls = [], content }) => {
            if (content === undefined) { // the standalone build embeds the content
                for (const url of urls) {
                    try {
                        const response = await fetch(url, { cache: "no-cache" });
                        if (response.ok) { content = await response.text(); break; }
                    } catch (_) { /* try the next URL */ }
                }
            }
            if (content === undefined) missing.push(name);
            else this.workspace.add(new SourceDocument({ name, content, readOnly: true, library: true, origin: "library" }));
        }));
        // Keep the configured order of the libraries in the document list.
        const order = this.config.libraries.map(l => l.name);
        this.workspace.documents.sort((a, b) => (a.library && b.library ? order.indexOf(a.name) - order.indexOf(b.name) : 0));
        if (missing.length) this.status(`The libraries ${missing.join(", ")} could not be loaded. Imports of them will not resolve.`, "error");
    }

    addDocument(document) {
        this.workspace.add(document);
        this.activate(document.name);
        return document;
    }

    /** The libraries whose elements the model lists: the library document that is open in the editor. */
    browsedLibraries() {
        const active = this.active;
        return active && active.library ? [active.name] : [];
    }

    activate(name) {
        const document = this.workspace.get(name);
        if (!document) return;
        const browsedBefore = this.browsedLibraries().join();
        this.activeName = name;
        // A library document lists its elements (e.g. the processes of ISO15288Processes): check again.
        if (this.browsedLibraries().join() !== browsedBefore && this.engineReady) this.check();
        this.editor.setValue(document.content, { readOnly: document.readOnly });
        this.showDiagnosticsOfActive();
        this.renderTabs();
        this.renderDocumentList();
        this.updateCursor();
        this.saveDrafts();
    }

    get active() {
        return this.workspace.get(this.activeName);
    }

    onWorkspaceChange({ reason }) {
        this.renderTabs();
        this.renderDocumentList();
        this.updateHistoryButtons();
        if (reason !== "save") {
            this.scheduleCheck();
            this.scheduleDraftSave();
        }
    }

    showDiagnosticsOfActive() {
        const diagnostics = this.analysis ? this.analysis.result.diagnostics : [];
        this.editor.setDiagnostics(diagnostics.filter(d => d.file === this.activeName));
    }

    renderTabs() {
        $("#tabs").innerHTML = this.workspace.documents.map(d => `
            <div class="tab${d.name === this.activeName ? " active" : ""}${d.library ? " library" : ""}" role="presentation">
                <button type="button" role="tab" class="tab-label" data-activate="${escapeHtml(d.name)}" aria-selected="${d.name === this.activeName}"
                    title="${escapeHtml(d.library ? "Library (read-only)" : d.name)}">${d.library ? "🔒 " : ""}${escapeHtml(d.name)}${d.dirty ? '<span class="dirty" aria-label="unsaved changes">●</span>' : ""}</button>
                ${d.library ? "" : `<button type="button" class="tab-close" data-close="${escapeHtml(d.name)}" aria-label="Close ${escapeHtml(d.name)}" title="Close">×</button>`}
            </div>`).join("");
    }

    renderDocumentList() {
        const folder = this.folder;
        $("#documents-title").innerHTML = folder
            ? `Folder <span class="doc-folder" title="All .sysml files of the folder ${escapeHtml(folder.name)} (not of its subfolders)">${escapeHtml(folder.name)}</span>
                ${folder.handle ? '<button type="button" class="doc-reload" data-action="reload-folder" title="Read the files of the folder again">Reload</button>' : ""}`
            : "Documents";
        const item = d => `
            <li><button type="button" data-open-document="${escapeHtml(d.name)}" class="${d.name === this.activeName ? "active" : ""}">
                <span class="doc-name">${escapeHtml(d.name)}</span>
                <span class="doc-state">${d.library ? "" : d.dirty ? "unsaved" : d.handle ? "saved" : d.origin === "file" || d.origin === "folder" ? "opened" : "not saved yet"}</span>
            </button></li>`;
        // The user's documents, and separately the integrated read-only libraries.
        const own = this.workspace.modelDocuments;
        $("#documents").innerHTML = own.length ? own.map(item).join("")
            : '<li class="doc-empty">No documents. Open files or a folder (File), or an example.</li>';
        $("#libraries").innerHTML = this.workspace.documents.filter(d => d.library).map(item).join("");
    }

    async newDocument(kind) {
        const values = await formDialog({
            title: kind === "environment" ? "New MBSE environment with a flow analysis" : "New SysML v2 file",
            submitLabel: "Create",
            fields: [{ name: "packageName", label: "Package name", value: kind === "environment" ? "MyEngineering" : "MyPackage", required: true }],
            validate: v => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(v.packageName) ? null : "Use letters, digits and _ only, no leading digit."),
        });
        if (!values) return;
        const content = kind === "environment" ? environmentDocument(values.packageName) : emptyPackage(values.packageName);
        this.addDocument(new SourceDocument({ name: this.workspace.uniqueName(values.packageName), content, origin: "new" }));
    }

    async open() {
        let opened;
        try {
            opened = await this.repository.open();
        } catch (e) {
            if (!(e instanceof CancelledError)) this.status(`Opening failed: ${e.message}`, "error");
            return;
        }
        for (const props of opened) {
            const existing = this.workspace.get(props.name);
            if (existing && existing.library) {
                this.status(`${props.name} has the name of the library and was not opened.`, "error");
                continue;
            }
            if (existing && existing.dirty && !(await confirmDialog(`${props.name} is open with unsaved changes. Replace it with the file?`, { confirmLabel: "Replace" }))) continue;
            this.addDocument(new SourceDocument(props));
        }
        if (opened.length) {
            await this.check();
            this.openDocument(opened[0].name);
        }
    }

    /**
     * Opens a folder: all its .sysml files (not those of its subfolders) replace the open documents and are checked together
     * with the libraries. The libraries (MBSEMethodology, DTFA, SYSMOD, ...) always come from the editor and stay
     * read-only; copies of them in the folder are not opened.
     */
    async openFolder({ reload = false } = {}) {
        const unsaved = this.workspace.dirtyDocuments;
        if (unsaved.length && !(await confirmDialog(`${unsaved.length} document${unsaved.length === 1 ? " has" : "s have"} unsaved changes (${unsaved.map(d => d.name).join(", ")}). ${reload ? "Read the folder again" : "Open the folder"} anyway?`,
            { confirmLabel: reload ? "Reload without saving" : "Open without saving" }))) return;
        let opened;
        try {
            opened = reload ? await this.repository.reloadFolder() : await this.repository.openFolder();
        } catch (e) {
            if (!(e instanceof CancelledError)) this.status(`Opening the folder failed: ${e.message}`, "error");
            return;
        }
        const libraryNames = new Set(this.workspace.libraryNames);
        const files = opened.files.filter(f => !libraryNames.has(f.name.split("/").pop()));
        const skipped = opened.files.length - files.length;
        for (const document of this.workspace.modelDocuments) this.workspace.remove(document.name);
        this.history = { undo: [], redo: [] };
        this.updateHistoryButtons();
        this.folder = opened.folder;
        files.forEach(props => this.workspace.add(new SourceDocument(props)));
        const firstDocument = this.workspace.modelDocuments[0] || this.workspace.documents[0];
        if (firstDocument) this.activate(firstDocument.name);
        this.renderDocumentList();
        this.status(`${reload ? "Reloaded" : "Opened"} the folder ${opened.folder.name}: ${files.length} file${files.length === 1 ? "" : "s"}`
            + (skipped ? `; ${skipped} copie${skipped === 1 ? "" : "s"} of the libraries not opened (the editor uses its read-only libraries)` : "")
            + (opened.folder.handle ? "." : ". This browser cannot write to the folder: Save downloads the files."));
        const result = await this.check();
        const first = result && (result.model.analyses[0] || result.model.environments.find(e => !e.library));
        if (first) this.select(first.id, { reveal: false });
    }

    /**
     * Opens a document: its editor in the form view lists its methodology elements (environments, flow analyses,
     * processes, methods, roles, tools, products) and opens their editors; in the text view, its text.
     */
    /**
     * Opens a document: its document form, or in the Process view its processes, or in the Text view its text.
     * With { form: true } always the document form, scrolled to { section }, e.g. "Products".
     */
    openDocument(name, { section = null, form = false } = {}) {
        if (!this.workspace.get(name)) return;
        this.activate(name);
        if (this.view === "text" && !form) return;
        this.selectedId = null;
        this.collection = null;
        if (form) {
            this.documentView = name;
            this.setView("form");
            if (section) requestAnimationFrame(() => this.formView.scrollToSection(section));
            return;
        }
        this.documentView = null;
        // A document with an MBSE environment opens the environment; otherwise the Processes view stays, or the tab of its
        // methodology elements opens (e.g. the processes of ISO15288Processes).
        const model = this.analysis && this.analysis.result.model;
        const own = kind => model ? [...model.elements.values()].filter(e => e.document === name && kind(e)).length : 0;
        if (!model || model.environments.some(e => e.document === name)) this.setView("environment");
        else if (this.view === "process" || this.view === "methodology") this.setView(this.view);
        else if (own(e => e instanceof Method || e instanceof Process)) this.setView("methodology");
        else if (own(e => e instanceof Artifact)) this.setView("products");
        else if (own(e => e instanceof Role)) this.setView("roles");
        else if (own(e => e instanceof Tool)) this.setView("tools");
        else this.setView("environment");
    }

    async openExample(example) {
        try {
            const documents = await Promise.all(example.files.map(async path => {
                // The standalone build embeds the examples as { name, content }.
                if (typeof path === "object") return new SourceDocument({ name: path.name, content: path.content, origin: "example" });
                const response = await fetch(path, { cache: "no-cache" });
                if (!response.ok) throw new Error(`${path} (HTTP ${response.status})`);
                return new SourceDocument({ name: path.split("/").pop(), content: await response.text(), origin: "example" });
            }));
            documents.forEach(d => this.workspace.add(d));
            this.activate(documents[0].name);
            this.status(`Opened the example "${example.label}". Save it to keep your changes.`);
            // Show the first flow analysis of the example.
            const result = await this.check();
            const first = result && result.model.analyses.find(c => documents.some(d => d.name === c.document));
            if (first) this.select(first.id, { reveal: false });
        } catch (e) {
            this.status(`The example could not be loaded: ${e.message}. Serve the editor from the repository to use the examples.`, "error");
        }
    }

    async save(document = this.active, { as = false } = {}) {
        if (!document || document.library) return;
        try {
            const saved = as ? await this.repository.saveAs(document) : await this.repository.save(document);
            const wasActive = document.name === this.activeName;
            if (saved.name && saved.name !== document.name) {
                this.workspace.rename(document.name, saved.name);
                if (wasActive) this.activeName = saved.name;
            }
            document.handle = saved.handle;
            document.origin = "file";
            document.markSaved();
            this.workspace.changed("save", document.name);
            this.saveDrafts();
            this.status(saved.handle ? `Saved ${document.name}.` : `Downloaded ${document.name}.`);
        } catch (e) {
            if (!(e instanceof CancelledError)) this.status(`Saving failed: ${e.message}`, "error");
        }
    }

    async close(name = this.activeName) {
        const document = this.workspace.get(name);
        if (!document || document.library) return;
        if (document.dirty && !(await confirmDialog(`${name} has unsaved changes. Close it anyway?`, { confirmLabel: "Close without saving" }))) return;
        this.workspace.remove(name);
        if (this.activeName === name) {
            const next = this.workspace.modelDocuments[0] || this.workspace.documents[0];
            if (next) this.activate(next.name);
        }
        this.saveDrafts();
    }

    /**
     * Closes all opened documents and the opened folder: only the integrated read-only libraries remain.
     * Asks before unsaved changes are lost.
     */
    async closeAll() {
        const unsaved = this.workspace.dirtyDocuments;
        if (unsaved.length && !(await confirmDialog(`${unsaved.length} document${unsaved.length === 1 ? " has" : "s have"} unsaved changes (${unsaved.map(d => d.name).join(", ")}). Close anyway?`,
            { confirmLabel: "Close without saving" }))) return;
        for (const document of this.workspace.modelDocuments) this.workspace.remove(document.name);
        this.folder = null;
        this.repository.folder = null;
        this.history = { undo: [], redo: [] };
        this.updateHistoryButtons();
        this.selectedId = null;
        this.collection = null;
        this.documentView = null;
        const first = this.workspace.documents[0];
        if (first) this.activate(first.name);
        this.renderDocumentList();
        this.saveDrafts();
        this.status("Closed all documents. The libraries remain, read-only.");
        await this.check();
    }

    // ---------- drafts (per browser convenience; files remain the source of truth) ----------

    scheduleDraftSave() {
        clearTimeout(this.draftTimer);
        this.draftTimer = setTimeout(() => this.saveDrafts(), 1000);
    }

    saveDrafts() {
        try {
            const drafts = this.workspace.modelDocuments.map(d => ({ name: d.name, content: d.content, savedContent: d.savedContent, origin: d.origin }));
            localStorage.setItem(this.config.draftStorageKey, JSON.stringify({ active: this.activeName, drafts }));
        } catch (_) { /* storage unavailable or full: drafts are a convenience only */ }
    }

    restoreDrafts() {
        try {
            const stored = JSON.parse(localStorage.getItem(this.config.draftStorageKey) || "null");
            if (!stored || !Array.isArray(stored.drafts)) return 0;
            let restored = 0;
            for (const draft of stored.drafts) {
                if (typeof draft.name !== "string" || typeof draft.content !== "string") continue;
                // The former default document, if it is unchanged.
                if (draft.name === "Engineering.sysml" && draft.content === environmentDocument("Engineering")) continue;
                const document = new SourceDocument({ name: draft.name, content: draft.content, origin: "draft" });
                // Restored documents have lost their file handle; keep their unsaved state visible.
                document.savedContent = typeof draft.savedContent === "string" ? draft.savedContent : "";
                this.workspace.add(document);
                restored++;
            }
            this.activeName = stored.active || null;
            return restored;
        } catch (_) {
            return 0;
        }
    }

    // ---------- editing commands (shared by the environment, matrix, step definition, policy, form and outline views) ----------

    /**
     * Runs an editing command on an element. The handler answers text edits (or null if cancelled);
     * they are applied as one undoable step, and the model is checked again.
     */
    async runCommand(command, id, args = {}) {
        if (this.commandRunning) return;
        this.commandRunning = true;
        try {
            const result = await this.freshAnalysis();
            const element = result.model.get(id);
            if (!element) throw new ModelEditError("The element is no longer in the model. Check the text for errors.");
            const handler = this.commands[command];
            if (!handler) throw new ModelEditError(`Unknown command ${command}.`);
            const outcome = await handler.call(this, element, result, args);
            if (!outcome || !outcome.edits || !outcome.edits.length) return;
            const edits = mergeEdits(outcome.edits);
            this.applyCommandEdits(edits, outcome.label || command);
            if (outcome.select !== undefined) this.selectedId = outcome.select;
            await this.check();
            if (this.view === "text" && edits[0]) {
                const edit = edits.find(e => e.document === this.activeName) || edits[0];
                if (edit.document !== this.activeName) this.activate(edit.document);
                this.editor.reveal(edit.start, edit.start + edit.text.length);
            }
            this.status(outcome.message || "");
        } catch (e) {
            this.status(e.message, "error");
        } finally {
            this.commandRunning = false;
        }
    }

    applyCommandEdits(edits, label) {
        const changes = this.workspace.applyEdits(edits);
        this.history.undo.push({ label, changes: changes.map(c => ({ name: c.document.name, before: c.before, after: c.document.content })) });
        if (this.history.undo.length > 100) this.history.undo.shift();
        this.history.redo = [];
        this.refreshActiveText();
        this.updateHistoryButtons();
    }

    undo(redo = false) {
        const from = redo ? this.history.redo : this.history.undo;
        const to = redo ? this.history.undo : this.history.redo;
        const step = from.pop();
        if (!step) return;
        for (const change of step.changes) {
            const document = this.workspace.get(change.name);
            if (document) this.workspace.setContent(change.name, redo ? change.after : change.before);
        }
        to.push(step);
        this.refreshActiveText();
        this.updateHistoryButtons();
        this.status(`${redo ? "Redone" : "Undone"}: ${step.label}`);
        this.check();
    }

    refreshActiveText() {
        if (this.active && this.editor.value !== this.active.content) this.editor.setValue(this.active.content, { readOnly: this.active.readOnly, keepView: true });
    }

    updateHistoryButtons() {
        const undo = $("#undo"), redo = $("#redo");
        const last = this.history.undo[this.history.undo.length - 1];
        const next = this.history.redo[this.history.redo.length - 1];
        undo.disabled = !last;
        redo.disabled = !next;
        undo.title = last ? `Undo: ${last.label} (Ctrl+Z)` : "Undo (Ctrl+Z)";
        redo.title = next ? `Redo: ${next.label} (Ctrl+Y)` : "Redo (Ctrl+Y)";
    }

    validateNewName(name, ownerElementId, result) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return "Use letters, digits and _ only, no leading digit.";
        if (RESERVED_NAMES.has(name)) return `${name} is a feature name of the MBSEMethodology or DTFA library. Choose another name.`;
        if (result.model.get(`${ownerElementId}::${name}`) || (result.locate && result.locate(`${ownerElementId}::${name}`))) return `${name} already exists here.`;
        // In an MBSE environment, a name must also be free in the environments it specializes and in those that specialize it.
        const { model } = result;
        if (model.get(ownerElementId) instanceof MBSEEnvironment) {
            const related = model.environments.filter(e => e.id !== ownerElementId
                && (model.environmentScope(ownerElementId).includes(e.id) || model.environmentScope(e.id).includes(ownerElementId)));
            const clash = related.find(e => model.get(`${e.id}::${name}`) || (result.locate && result.locate(`${e.id}::${name}`)));
            if (clash) return `${name} already exists in ${clash.name}, which ${model.environmentScope(ownerElementId).includes(clash.id) ? "it specializes" : "specializes it"}.`;
        }
        return null;
    }

    /** A unique default name in a namespace, e.g. "newStep2". */
    freeName(base, ownerElementId, result) {
        for (let i = 1; ; i++) {
            const name = i === 1 ? base : `${base}${i}`;
            if (!this.validateNewName(name, ownerElementId, result)) return name;
        }
    }

    /**
     * The name with which a statement refers to an element of an MBSE environment: its simple name. Statements are
     * written inside the environment (its methodology, its analyses, its rules), where the roles, tools, products and
     * behaviors of the environment and of the environments it specializes are visible by name.
     */
    nameRef(id, model) {
        const element = model.get(id);
        return element ? quoteName(element.name) : id;
    }

    /** The name with which a statement inside contextId refers to targetId: its simple name if visible, else qualified. */
    referenceName(targetId, contextId) {
        const scope = ownerId(targetId);
        if (!scope || contextId === scope || contextId.startsWith(scope + "::")) return targetId.slice(scope.length ? scope.length + 2 : 0);
        return targetId;
    }

    /** The feature chain from an environment to a behavior of its methodology, e.g. "companyMethodology.sysmodArchitecture". */
    behaviorChain(environment, behaviorId, model) {
        const tree = model.methodologyTree(environment.id);
        const byId = new Map(tree.map(n => [n.element.id, n]));
        let node = byId.get(behaviorId);
        if (!node) throw new ModelEditError(`${model.nameOf(behaviorId)} is not a behavior of the methodology of ${environment.name}.`);
        const names = [];
        for (; node; node = node.parentId ? byId.get(node.parentId) : null) names.unshift(quoteName(node.element.name));
        return [quoteName(environment.methodologyName || "methodology"), ...names].join(".");
    }

    /** The MBSE environment that an element belongs to: an environment, its analysis' environment, or its own. */
    environmentOf(element, model) {
        if (element instanceof MBSEEnvironment) return element;
        const analysis = element && model.analysisOf(element.id);
        if (analysis && model.get(analysis.environmentId)) return model.get(analysis.environmentId);
        if (element && (element instanceof Method || element instanceof Process)) {
            const user = model.analyses.find(a => a.stepOf(element.id));
            if (user && model.get(user.environmentId)) return model.get(user.environmentId);
        }
        if (element && element.environmentId && model.get(element.environmentId) instanceof MBSEEnvironment) return model.get(element.environmentId);
        return null;
    }

    /** Asks for the environment of a new element: the given one or one of the environments it specializes. */
    async chooseEnvironment(element, model) {
        const environment = this.environmentOf(element, model) || model.environments[0];
        if (!environment) throw new ModelEditError("Create an MBSE environment first (File ▸ New MBSE environment).");
        return model.environmentScope(environment.id).map(id => model.get(id));
    }

    /** The flow analysis of an element, or the first analysis of its environment, or an error. */
    requireAnalysis(element, model, analysisId = null) {
        const analysis = model.get(analysisId) || model.analysisOf(element.id)
            || (element instanceof MBSEEnvironment ? element.analyses[0] : null)
            || model.analyses.find(a => a.stepOf(element.id));
        if (!(analysis instanceof FlowAnalysis)) throw new ModelEditError("Select a flow analysis or an element of one. Add one with “+ Flow analysis” in the Environment view.");
        if (!model.get(analysis.environmentId)) throw new ModelEditError(`${analysis.name} is not owned by an MBSE environment.`);
        return analysis;
    }

    /** Edits that change behaviors as an environment performs them (see behaviorEdits in dtfa/edits.js). */
    behaviorEdits(result, environment, changes) {
        return behaviorEdits(result.model, this.createModelEditor(result), environment, changes);
    }

    /** The tool transition that rates a hand-over: { id, edits } with edits that create it if the analysis has none. */
    ensureTransition(result, handover, values = []) {
        const { model } = result;
        const analysis = model.get(handover.analysisId);
        if (handover.transition) return { id: handover.transition.id, edits: [], created: false };
        const source = analysis.stepOf(handover.sourceId), target = analysis.stepOf(handover.targetId);
        if (!source || !source.toolId || !target || !target.toolId) throw new ModelEditError("Both process steps of the hand-over need a tool to rate the transition between the tools.");
        const name = this.freeName(nameFrom(`${model.nameOf(source.toolId)} to ${model.nameOf(target.toolId).charAt(0).toUpperCase()}${model.nameOf(target.toolId).slice(1)}`, "toolTransition"), analysis.id, result);
        const lines = toolTransitionLines({ name, source: this.nameRef(source.toolId, model), target: this.nameRef(target.toolId, model),
            products: listValue(handover.productIds.map(id => this.nameRef(id, model))) });
        // The values that the command sets, in place of the defaults.
        const body = lines.slice(1, -1).filter(l => !values.some(([f]) => l.trim().startsWith(`:>> ${f} =`)));
        const all = [lines[0], ...body, ...valueLines(values).map(l => "    " + l), "}"];
        return { id: `${analysis.id}::${name}`, edits: this.createModelEditor(result).addElement(analysis.id, all), created: true };
    }

    /** The tool transition of a rating command: the element itself, or the transition of a hand-over. */
    ratingTarget(element) {
        if (element instanceof ToolTransition) return element;
        if (element instanceof Handover) return element.transition;
        return null;
    }

    /** Sets values of the tool transition of a hand-over (created if needed) or of a tool transition. */
    setTransitionValues(element, result, pairs, label) {
        if (!(element instanceof Handover || element instanceof ToolTransition)) return null;
        const transition = this.ratingTarget(element);
        if (transition) return { edits: this.createModelEditor(result).setValues(transition.id, pairs), label };
        const created = this.ensureTransition(result, element, pairs);
        return { edits: created.edits, label, select: element.id };
    }

    /** Edits that remove the references to deleted elements from the values of other elements. */
    removeReferences(model, result, deletedIds) {
        const deleted = new Set(deletedIds);
        const editor = this.createModelEditor(result);
        const edits = [];
        // The values of behaviors as written in the text (primaryPerformer, facilitationTools, inputs, outputs).
        for (const b of [...model.methods, ...model.processes]) {
            if (deleted.has(b.id) || !result.locate(b.id)) continue;
            const pairs = [];
            for (const slot of b.slots.filter(s => s.slotId.startsWith(b.id + "::") && s.valueIds.some(id => deleted.has(id)))) {
                const feature = slot.slotId.slice(b.id.length + 2);
                const rest = slot.valueIds.filter(id => !deleted.has(id));
                pairs.push([feature, listValue(rest.map(id => this.nameRef(id, model)))]);
            }
            for (const [feature, list] of [["inputs", b.inputIds], ["outputs", b.outputIds]]) {
                if (result.locate(`${b.id}::${feature}`) && list.some(id => deleted.has(id))) {
                    pairs.push([feature, listValue(list.filter(id => !deleted.has(id)).map(id => this.nameRef(id, model)))]);
                }
            }
            if (pairs.length) edits.push(...editor.setValues(b.id, pairs));
        }
        for (const analysis of model.analyses) {
            for (const t of analysis.transitions) {
                if (deleted.has(t.id)) continue;
                if (deleted.has(t.sourceId) || deleted.has(t.targetId)) { deleted.add(t.id); edits.push(...editor.deleteElement(t.id)); continue; }
                if (t.productIds.some(id => deleted.has(id))) {
                    edits.push(...editor.setValue(t.id, "products", listValue(t.productIds.filter(id => !deleted.has(id)).map(id => this.nameRef(id, model)))));
                }
            }
            for (const m of analysis.measures) {
                if (deleted.has(m.id) || !m.addressedTransitionIds.some(id => deleted.has(id))) continue;
                const rest = m.addressedTransitionIds.filter(id => !deleted.has(id));
                edits.push(...editor.setValue(m.id, "addressedTransitions", listValue(rest.map(id => this.nameRef(id, model)))));
            }
        }
        for (const rule of model.rules) {
            if (!deleted.has(rule.id) && (deleted.has(rule.toolId) || deleted.has(rule.methodId))) edits.push(...editor.deleteElement(rule.id));
        }
        return edits;
    }

    get commands() {
        /** Adds a role, tool, method or product to an MBSE environment (or one of the environments it specializes). */
        const environmentAdd = (kind, title, base) => async function (element, result) {
            const { model } = result;
            const environments = await this.chooseEnvironment(element, model);
            const values = await formDialog({
                title, fields: [
                    { name: "environment", label: "MBSE environment", type: "select", value: environments[0].id,
                        options: environments.map((e, i) => ({ value: e.id, label: i ? `${e.name} (specialized by ${environments[0].name})` : e.name })) },
                    { name: "name", label: "Name", value: base, required: true },
                    { name: "doc", label: "Description (optional)", value: "" },
                ],
                validate: v => {
                    const environment = model.get(v.environment);
                    const owner = kind === "method" && environment.methodologyId && environment.methodologyId.startsWith(environment.id + "::") ? environment.methodologyId : environment.id;
                    return this.validateNewName(v.name, owner, result);
                },
            });
            if (!values) return null;
            const environment = model.get(values.environment);
            const editor = this.createModelEditor(result);
            const lines = environmentElementLines(kind, values.name, values.doc);
            if (kind === "method" && !(environment.methodologyId && environment.methodologyId.startsWith(environment.id + "::"))) {
                const wrap = environment.methodologyName || "methodology";
                return { edits: editor.addElement(environment.id, redefinitionLines([wrap], lines, "part")),
                    label: `add method ${values.name}`, select: `${environment.id}::${wrap}::${values.name}` };
            }
            const owner = kind === "method" ? environment.methodologyId : environment.id;
            return { edits: editor.addElement(owner, lines), label: `add ${kind} ${values.name}`, select: `${owner}::${values.name}` };
        };

        return {
            addRole: environmentAdd("role", "Add a role (a row of the matrix)", "newRole"),
            addArtifact: environmentAdd("product", "Add a product (data of the digital thread)", "newProduct"),
            addTool: environmentAdd("tool", "Add a tool (a column of the matrix)", "newTool"),
            addMethod: environmentAdd("method", "Add a method to the methodology", "newMethod"),

            async addEnvironment(element, result) {
                const { model } = result;
                const environment = this.environmentOf(element, model) || model.environments[0];
                if (!environment) throw new ModelEditError("Create an MBSE environment first (File ▸ New MBSE environment).");
                const packageId = ownerId(environment.id);
                if (!packageId) throw new ModelEditError(`${environment.name} is not inside a package.`);
                const values = await formDialog({
                    title: `Add an MBSE environment that specializes ${environment.name}`,
                    fields: [{ name: "name", label: "Name", value: this.freeName(`${environment.name.replace(/^'(.*)'$/, "$1").replace(/[^A-Za-z0-9_]/g, "")}Specialization`, packageId, result), required: true }],
                    validate: v => this.validateNewName(v.name, packageId, result),
                });
                if (!values) return null;
                const lines = [`occurrence def ${values.name} :> ${this.referenceName(environment.id, packageId + "::" + values.name)} {`, "}"];
                return { edits: this.createModelEditor(result).addElement(packageId, lines), label: `add ${values.name}`, select: `${packageId}::${values.name}` };
            },

            async addAnalysis(element, result) {
                const { model } = result;
                const environment = this.environmentOf(element, model) || model.environments[0];
                if (!environment) throw new ModelEditError("Create an MBSE environment first (File ▸ New MBSE environment).");
                const values = await formDialog({
                    title: `Add a Digital Thread Flow Analysis of ${environment.name}`,
                    fields: [{ name: "name", label: "Name", value: this.freeName("flowAnalysis", environment.id, result), required: true }],
                    validate: v => this.validateNewName(v.name, environment.id, result),
                });
                if (!values) return null;
                return { edits: this.createModelEditor(result).addElement(environment.id, analysisLines(values.name)),
                    label: `add flow analysis ${values.name}`, select: `${environment.id}::${values.name}` };
            },

            /** Adds a process step: an existing method of the methodology, or a new one, performed by a role with a tool. */
            async addStep(element, result, { roleId, toolId, analysisId } = {}) {
                const { model } = result;
                const analysis = this.requireAnalysis(element, model, analysisId);
                const environment = model.get(analysis.environmentId);
                const option = e => ({ value: e.id, label: e.name });
                const methods = model.methodologyTree(environment.id).map(n => n.element).filter(e => e instanceof Method);
                const free = methods.filter(m => !analysis.stepOf(m.id));
                const values = await formDialog({
                    title: `Add a process step to ${analysis.name}`,
                    fields: [
                        { name: "method", label: "Method of the methodology", type: "select", value: element instanceof Method && !analysis.stepOf(element.id) ? element.id : "",
                            options: [{ value: "", label: "– a new method –" }, ...free.map(option)],
                            hint: "A process step is a method that a role performs with a tool." },
                        { name: "name", label: "Name of the new method", value: this.freeName("newMethod", environment.methodologyId || environment.id, result) },
                        { name: "role", label: "Role (primary performer, row)", type: "select", value: roleId || "", options: [{ value: "", label: "–" }, ...model.inScope(model.roles, environment.id).map(option)] },
                        { name: "tool", label: "Tool (facilitation tool, column)", type: "select", value: toolId || "", options: [{ value: "", label: "–" }, ...model.inScope(model.tools, environment.id).map(option)] },
                    ],
                    validate: v => (v.method ? null : this.validateNewName(v.name, environment.methodologyId && environment.methodologyId.startsWith(environment.id + "::") ? environment.methodologyId : `${environment.id}::${environment.methodologyName || "methodology"}`, result)),
                });
                if (!values) return null;
                const pairs = [["primaryPerformer", values.role ? this.nameRef(values.role, model) : null], ["facilitationTools", values.tool ? this.nameRef(values.tool, model) : null]];
                if (values.method) {
                    const { edits, ids } = this.behaviorEdits(result, environment, [{ id: values.method, pairs: pairs.filter(([, v]) => v) }]);
                    return { edits, label: `perform ${model.nameOf(values.method)}`, select: ids.get(values.method) };
                }
                const lines = methodLines({ name: values.name, pairs });
                const editor = this.createModelEditor(result);
                if (environment.methodologyId && environment.methodologyId.startsWith(environment.id + "::")) {
                    return { edits: editor.addElement(environment.methodologyId, lines), label: `add process step ${values.name}`, select: `${environment.methodologyId}::${values.name}` };
                }
                const wrap = environment.methodologyName || "methodology";
                return { edits: editor.addElement(environment.id, redefinitionLines([wrap], lines, "part")), label: `add process step ${values.name}`, select: `${environment.id}::${wrap}::${values.name}` };
            },

            /** Sets the role or the tool of a process step (the primary performer or facilitation tool of its method). */
            async placeStep(method, result, { analysisId, feature, targetId }) {
                const { model } = result;
                if (!(method instanceof Method) || !["primaryPerformer", "facilitationTools"].includes(feature)) return null;
                const analysis = this.requireAnalysis(method, model, analysisId);
                const environment = model.get(analysis.environmentId);
                const { edits, ids } = this.behaviorEdits(result, environment, [{ id: method.id, pairs: [[feature, targetId ? this.nameRef(targetId, model) : null]] }]);
                return { edits, label: `set the ${feature === "primaryPerformer" ? "role" : "tool"} of ${method.name}`, select: ids.get(method.id) };
            },

            async moveStep(method, result, { roleId, toolId, analysisId }) {
                const { model } = result;
                if (!(method instanceof Method)) return null;
                const analysis = this.requireAnalysis(method, model, analysisId);
                const step = analysis.stepOf(method.id);
                const pairs = [];
                if (step && (step.roleId || null) !== (roleId || null)) pairs.push(["primaryPerformer", roleId ? this.nameRef(roleId, model) : null]);
                if (step && (step.toolId || null) !== (toolId || null)) pairs.push(["facilitationTools", toolId ? this.nameRef(toolId, model) : null]);
                if (!pairs.length) return null;
                const { edits, ids } = this.behaviorEdits(result, model.get(analysis.environmentId), [{ id: method.id, pairs }]);
                return { edits, label: `move ${method.name} to ${model.nameOf(roleId, "no role")} × ${model.nameOf(toolId, "no tool")}`, select: ids.get(method.id) };
            },

            /** Hands over a product from one process step to another: an output of the first, an input of the second. */
            async addHandover(element, result, { sourceId, targetId, analysisId } = {}) {
                const { model } = result;
                const analysis = this.requireAnalysis(element, model, analysisId);
                const environment = model.get(analysis.environmentId);
                if (!sourceId && element instanceof Method) sourceId = element.id;
                const steps = analysis.steps.map(s => ({ value: s.id, label: s.name }));
                if (steps.length < 2) throw new ModelEditError(`${analysis.name} needs two process steps for a hand-over.`);
                const products = model.productsOf(environment.id);
                const source = analysis.stepOf(sourceId);
                const values = await formDialog({
                    title: sourceId && targetId ? `Hand over from ${model.nameOf(sourceId)} to ${model.nameOf(targetId)}` : `Add a hand-over to ${analysis.name}`,
                    fields: [
                        ...(sourceId && targetId ? [] : [
                            { name: "source", label: "From process step (produces)", type: "select", value: sourceId || steps[0].value, options: steps },
                            { name: "target", label: "To process step (needs)", type: "select", value: targetId || (steps.find(o => o.value !== sourceId) || steps[0]).value, options: steps },
                        ]),
                        { name: "product", label: "Product", type: "select", value: source && source.targetArtifactIds[0] || "",
                            options: [{ value: "", label: "– a new product –" }, ...products.map(p => ({ value: p.id, label: p.name }))],
                            hint: "The product becomes an output of the first and an input of the second method." },
                        { name: "newProduct", label: "Name of the new product", value: this.freeName("newProduct", environment.id, result) },
                    ],
                    validate: v => ((v.source || sourceId) === (v.target || targetId) ? "Choose two different process steps."
                        : v.product ? null : this.validateNewName(v.newProduct, environment.id, result)),
                });
                if (!values) return null;
                const from = analysis.stepOf(values.source || sourceId), to = analysis.stepOf(values.target || targetId);
                const edits = [];
                let productRef;
                if (values.product) productRef = this.nameRef(values.product, model);
                else {
                    edits.push(...this.createModelEditor(result).addElement(environment.id, environmentElementLines("product", values.newProduct)));
                    productRef = values.newProduct;
                }
                const productId = values.product || null;
                const refs = list => list.map(id => this.nameRef(id, model));
                const changes = [];
                if (!productId || !from.targetArtifactIds.includes(productId)) changes.push({ id: from.id, pairs: [["outputs", listValue([...refs(from.targetArtifactIds), productRef])]] });
                if (!productId || !to.sourceArtifactIds.includes(productId)) changes.push({ id: to.id, pairs: [["inputs", listValue([...refs(to.sourceArtifactIds), productRef])]] });
                if (!changes.length) throw new ModelEditError(`${to.name} already needs ${model.nameOf(productId)} from ${from.name}.`);
                edits.push(...this.behaviorEdits(result, environment, changes).edits);
                return { edits, label: `hand over ${model.nameOf(productId, productRef)} from ${from.name} to ${to.name}` };
            },

            /** Adds a tool transition between two tools of the environment. */
            async addTransition(element, result, { analysisId } = {}) {
                const { model } = result;
                const analysis = this.requireAnalysis(element, model, analysisId);
                const tools = model.inScope(model.tools, analysis.environmentId).map(t => ({ value: t.id, label: t.name }));
                if (!tools.length) throw new ModelEditError("The environment has no tools.");
                const values = await formDialog({
                    title: `Add a tool transition to ${analysis.name}`,
                    fields: [
                        { name: "source", label: "From tool", type: "select", value: tools[0].value, options: tools },
                        { name: "target", label: "To tool", type: "select", value: (tools[1] || tools[0]).value, options: tools },
                        { name: "rating", label: "Rating", type: "select", value: "unrated", options: Object.entries(RATINGS).map(([value, e]) => ({ value, label: e.label })) },
                        { name: "name", label: "Name", value: "", hint: "Leave empty for a name from the two tools." },
                    ],
                    validate: v => (v.name ? this.validateNewName(v.name, analysis.id, result) : null),
                });
                if (!values) return null;
                const name = values.name || this.freeName(nameFrom(`${model.nameOf(values.source)} to ${model.nameOf(values.target).charAt(0).toUpperCase()}${model.nameOf(values.target).slice(1)}`, "toolTransition"), analysis.id, result);
                return {
                    edits: this.createModelEditor(result).addElement(analysis.id, toolTransitionLines({ name, source: this.nameRef(values.source, model), target: this.nameRef(values.target, model), rating: values.rating })),
                    label: `add tool transition ${name}`, select: `${analysis.id}::${name}`,
                };
            },

            async addMeasure(element, result) {
                const { model } = result;
                const analysis = this.requireAnalysis(element, model);
                const preselected = element instanceof ToolTransition ? [element.id] : element instanceof Handover && element.transition ? [element.transition.id]
                    : analysis.transitions.filter(t => t.isBottleneck && !model.measuresFor(t).length).map(t => t.id);
                const values = await formDialog({
                    title: `Add a measure to ${analysis.name}`,
                    fields: [
                        { name: "name", label: "Name", value: this.freeName("newMeasure", analysis.id, result), required: true },
                        { name: "description", label: "What changes, and why it removes the bottleneck", type: "textarea", value: "" },
                        { name: "transitions", label: "Addressed tool transitions", type: "checkboxes", value: preselected,
                            options: analysis.transitions.map(t => ({ value: t.id, label: `${t.name} (${model.nameOf(t.sourceId)} → ${model.nameOf(t.targetId)}, ${RATINGS[t.rating].label})` })) },
                    ],
                    validate: v => this.validateNewName(v.name, analysis.id, result),
                });
                if (!values) return null;
                return {
                    edits: this.createModelEditor(result).addElement(analysis.id, measureLines({
                        name: values.name, description: values.description, transitions: values.transitions.map(t => this.nameRef(t, model)),
                    })),
                    label: `add measure ${values.name}`, select: `${analysis.id}::${values.name}`,
                };
            },

            async setRating(element, result, { rating }) {
                if (!RATINGS[rating] || element.rating === rating && this.ratingTarget(element)) return null;
                return this.setTransitionValues(element, result, [["rating", `DTFA::TransitionRating::${rating}`]], `rate ${element.name} as ${rating}`);
            },

            async setPriority(element, result, { priority }) {
                const value = priority && Number.isInteger(priority) && priority > 0 ? String(priority) : null;
                if (priority !== null && !value) throw new ModelEditError("The priority is a whole number from 1 (highest).");
                if (String(element.priority ?? "") === String(value ?? "")) return null;
                return this.setTransitionValues(element, result, [["priority", value]], `set the priority of ${element.name}`);
            },

            async setExplanation(element, result, { text }) {
                const value = (text || "").trim();
                if (value === element.explanation) return null;
                return this.setTransitionValues(element, result, [["explanation", value ? stringLiteral(value) : null]], `set the explanation of ${element.name}`);
            },

            async editConversions(transition, result) {
                if (!(transition instanceof ToolTransition)) return null;
                const values = await formDialog({
                    title: `Conversions of ${transition.name}`, submitLabel: "Save",
                    fields: [{ name: "text", label: "Conversions, one per line", type: "textarea", rows: 5, value: transition.conversions.join("\n"),
                        hint: "The conversions of the data between the tools, e.g. an export, an import or a manual copy." }],
                });
                if (!values) return null;
                const list = values.text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                return { edits: this.createModelEditor(result).setValue(transition.id, "conversions", listValue(list.map(stringLiteral))), label: `change the conversions of ${transition.name}` };
            },

            async setAddressed(measure, result, { transitionIds }) {
                if (!(measure instanceof Measure)) return null;
                const value = listValue(transitionIds.map(id => this.nameRef(id, result.model)));
                return { edits: this.createModelEditor(result).setValue(measure.id, "addressedTransitions", value), label: `set the transitions of ${measure.name}` };
            },

            async addRule(element, result, { toolId = "", methodId = "", status = "recommended" } = {}) {
                const { model } = result;
                const environment = this.environmentOf(element, model);
                if (!environment) throw new ModelEditError("Select an MBSE environment.");
                const { tools, methods } = model.policyAxes(environment.id);
                if (!tools.length || !methods.length) throw new ModelEditError("Add tools and methods first.");
                const values = await formDialog({
                    title: `Add a tool policy rule to ${environment.name}`,
                    fields: [
                        { name: "method", label: "Method", type: "select", value: methodId || methods[0].id, options: methods.map(m => ({ value: m.id, label: m.name })) },
                        { name: "tool", label: "Tool", type: "select", value: toolId || tools[0].id, options: tools.map(t => ({ value: t.id, label: t.name })) },
                        { name: "status", label: "Status", type: "select", value: status, options: Object.entries(POLICY_STATUS).map(([value, s]) => ({ value, label: s.label })) },
                        { name: "name", label: "Name", value: "", hint: "Leave empty for a name from the tool and the method." },
                    ],
                    validate: v => (v.name ? this.validateNewName(v.name, environment.id, result) : null),
                });
                if (!values) return null;
                return this.commands.setPolicyCell.call(this, environment, result, { toolId: values.tool, methodId: values.method, status: values.status, name: values.name });
            },

            async setPolicyCell(environment, result, { toolId, methodId, status, name = "" }) {
                const { model } = result;
                if (!(environment instanceof MBSEEnvironment)) environment = this.environmentOf(environment, model);
                if (!environment) return null;
                const editor = this.createModelEditor(result);
                const method = model.get(methodId), tool = model.get(toolId);
                const matches = (id, element) => id === element.id || element.redefinedIds.includes(id);
                const rule = environment.rules.find(r => matches(r.toolId, tool) && matches(r.methodId, method));
                const combination = `${model.nameOf(toolId)} for ${model.nameOf(methodId)}`;
                if (!status) {
                    if (!rule) {
                        const inherited = model.policyStatus(environment.id, toolId, methodId);
                        if (inherited) throw new ModelEditError(`The rule ${inherited.rule.name} of ${model.nameOf(inherited.rule.environmentId)} rates ${combination}. Change it in ${model.nameOf(inherited.rule.environmentId)}.`);
                        return null;
                    }
                    return { edits: editor.deleteElement(rule.id), label: `remove the rule for ${combination}`, select: environment.id };
                }
                if (rule) return { edits: editor.setValue(rule.id, "status", `DTFA::PolicyStatus::${status}`), label: `${combination}: ${status}` };
                const ruleName = name || this.freeName(nameFrom(`${model.nameOf(toolId)} for ${model.nameOf(methodId).charAt(0).toUpperCase()}${model.nameOf(methodId).slice(1)}`, "newRule"), environment.id, result);
                return {
                    edits: editor.addElement(environment.id, policyRuleLines({ name: ruleName, tool: this.nameRef(toolId, model), method: this.behaviorChain(environment, methodId, model), status })),
                    label: `${combination}: ${status}`,
                };
            },

            async setStatus(rule, result, { status }) {
                if (!(rule instanceof ToolPolicyRule) || !POLICY_STATUS[status] || rule.status === status) return null;
                return { edits: this.createModelEditor(result).setValue(rule.id, "status", `DTFA::PolicyStatus::${status}`), label: `set ${rule.name} to ${status}` };
            },

            /** Sets a swimlane of the step definition of a method to a value (string, strings or product ids). */
            async setLane(method, result, { feature, value }) {
                const { model } = result;
                const lane = STEP_DEFINITION_LANES.find(l => l.feature === feature);
                if (!(method instanceof Method || method instanceof Process) || !lane) return null;
                const environment = this.environmentOf(method, model);
                if (!environment) throw new ModelEditError(`${method.name} belongs to no MBSE environment.`);
                let text;
                if (lane.kind === "text") text = value ? stringLiteral(value) : null;
                else if (lane.kind === "texts") text = listValue(value.filter(Boolean).map(stringLiteral));
                else text = listValue(value.map(id => this.nameRef(id, model)));
                const change = lane.store === "metadata" ? { id: method.id, definition: [[feature, text]] } : { id: method.id, pairs: [[feature, text]] };
                const { edits, ids } = this.behaviorEdits(result, environment, [change]);
                return { edits, label: `change ${lane.label.toLowerCase()} of ${method.name}`, select: ids.get(method.id) };
            },

            /** Asks for the new content of a swimlane. */
            async editLane(method, result, { feature }) {
                const lane = STEP_DEFINITION_LANES.find(l => l.feature === feature);
                if (!(method instanceof Method || method instanceof Process) || !lane) return null;
                const { model } = result;
                const current = laneValue(method, feature);
                if (lane.kind === "text") {
                    const values = await formDialog({
                        title: `${lane.label} of ${method.name}`, submitLabel: "Save",
                        fields: [{ name: "text", label: lane.label, type: "textarea", rows: 3, value: current, hint: lane.hint }],
                    });
                    return values ? this.commands.setLane.call(this, method, result, { feature, value: values.text }) : null;
                }
                if (lane.kind === "texts") {
                    const values = await formDialog({
                        title: `${lane.label} of ${method.name}`, submitLabel: "Save",
                        fields: [{ name: "text", label: `${lane.label}, one per line`, type: "textarea", rows: 5, value: current.join("\n"), hint: lane.hint }],
                    });
                    return values ? this.commands.setLane.call(this, method, result, { feature, value: values.text.split(/\r?\n/).map(s => s.trim()).filter(Boolean) }) : null;
                }
                const environment = this.environmentOf(method, model);
                if (!environment) throw new ModelEditError(`${method.name} belongs to no MBSE environment.`);
                const artifacts = model.inScope(model.artifacts, environment.id).filter(a => true).concat(current.map(id => model.get(id)).filter(a => a && !model.inScope(model.artifacts, environment.id).includes(a)));
                const values = await formDialog({
                    title: `${lane.label} of ${method.name}`, submitLabel: "Save",
                    fields: [
                        { name: "artifacts", label: lane.label, type: "checkboxes", value: current, options: artifacts.map(a => ({ value: a.id, label: a.name })), hint: lane.hint },
                        { name: "newArtifact", label: "New product (optional)", value: "", hint: `Adds a product to the MBSE environment ${environment.name} and to this swimlane.` },
                    ],
                    validate: v => (v.newArtifact ? this.validateNewName(v.newArtifact, environment.id, result) : null),
                });
                if (!values) return null;
                const edits = [];
                const references = values.artifacts.map(id => this.nameRef(id, model));
                if (values.newArtifact) {
                    edits.push(...this.createModelEditor(result).addElement(environment.id, environmentElementLines("product", values.newArtifact)));
                    references.push(values.newArtifact);
                }
                const { edits: behaviorEdits, ids } = this.behaviorEdits(result, environment, [{ id: method.id, pairs: [[feature, listValue(references)]] }]);
                edits.push(...behaviorEdits);
                return { edits, label: `change ${lane.label.toLowerCase()} of ${method.name}`, select: ids.get(method.id) };
            },

            async setDoc(element, result, { text }) {
                if (text === element.doc) return null;
                if (element instanceof Handover) throw new ModelEditError("A hand-over is derived from the inputs and outputs of the methods; describe its tool transition.");
                return { edits: this.createModelEditor(result).setDoc(element.id, text), label: `describe ${element.name}` };
            },

            async rename(element, result, { newName } = {}) {
                if (element instanceof Handover) throw new ModelEditError("A hand-over is derived and has no name of its own.");
                if (element.redefinedIds.length && (element instanceof Method || element instanceof Process)) {
                    throw new ModelEditError(`${element.name} redefines the behavior ${element.redefinedIds[0]}: rename that one.`);
                }
                if (!newName) {
                    const values = await formDialog({
                        title: `Rename ${element.name}`, submitLabel: "Rename",
                        fields: [{ name: "name", label: "New name", value: element.name, required: true,
                            hint: "References in the package and qualified references in your other documents are renamed too." }],
                        validate: v => (v.name === element.name ? "Enter a new name." : this.validateNewName(v.name, ownerId(element.id), result)),
                    });
                    if (!values) return null;
                    newName = values.name;
                } else {
                    const problem = this.validateNewName(newName, ownerId(element.id), result);
                    if (problem) throw new ModelEditError(problem);
                }
                const scope = element.id.split("::")[0];
                const documents = this.workspace.modelDocuments.map(d => d.name);
                const edits = this.createModelEditor(result).renameElement(element.id, newName, scope, { documents });
                return { edits, label: `rename ${element.name} to ${newName}`, select: `${ownerId(element.id)}::${newName}` };
            },

            async delete(element, result) {
                const { model } = result;
                const editor = this.createModelEditor(result);
                if (element instanceof Handover) {
                    // A hand-over is derived: the product is no longer an input of the target step.
                    const analysis = model.get(element.analysisId);
                    const target = analysis.stepOf(element.targetId);
                    if (!(await confirmDialog(`Remove ${element.productIds.map(id => model.nameOf(id)).join(", ")} from the inputs of ${target.name}?`, { confirmLabel: "Remove" }))) return null;
                    const rest = target.sourceArtifactIds.filter(id => !element.productIds.includes(id));
                    const { edits } = this.behaviorEdits(result, model.get(analysis.environmentId), [{ id: target.id, pairs: [["inputs", listValue(rest.map(id => this.nameRef(id, model)))]] }]);
                    return { edits, label: `remove the hand-over ${element.name}`, select: analysis.id };
                }
                if (element instanceof FlowAnalysis || element instanceof MBSEEnvironment || element.external || element.library) throw new ModelEditError(`Delete the ${element.kindLabel.toLowerCase()} ${element.name} in the text.`);
                if (!result.locate(element.id)) throw new ModelEditError(`${element.name} is declared in ${model.nameOf(element.environmentId, "another environment")}; delete it there.`);
                const doomed = [element.id];
                let question = `Delete ${element.kindLabel.toLowerCase()} ${element.name}?`;
                if ((element instanceof Method || element instanceof Process) && element.redefinedIds.length) {
                    question = `Remove ${element.name} as ${model.nameOf(element.environmentId)} performs it (its role, tool, products and step definition)? The method of the methodology remains.`;
                } else if (element instanceof Role || element instanceof Tool || element instanceof Method || element instanceof Artifact) {
                    const rules = model.rules.filter(r => r.toolId === element.id || r.methodId === element.id);
                    if (rules.length) question += ` ${rules.length} tool policy rule${rules.length === 1 ? " is" : "s are"} deleted.`;
                    question += " References to it are removed.";
                }
                if (!(element instanceof Measure || element instanceof ToolPolicyRule) && !(await confirmDialog(question, { confirmLabel: "Delete" }))) return null;
                const edits = [...editor.deleteElement(element.id), ...this.removeReferences(model, result, doomed)];
                return { edits, label: `delete ${element.name}`, select: element.ownerId };
            },
        };
    }

    // ---------- navigation ----------

    async reveal(id) {
        const result = this.analysis && this.analysis.result;
        const location = result && result.locate(id);
        if (!location) {
            this.status("The declaration was not found in the text.", "error");
            return;
        }
        if (this.view !== "text") this.setView("text");
        if (location.document !== this.activeName) this.activate(location.document);
        if (this.analysis.revision !== this.workspace.revision) {
            // The text changed since the last check: find the declaration again.
            const fresh = (await this.freshAnalysis()).locate(id);
            if (fresh) this.editor.reveal(fresh.nameStart ?? fresh.start, fresh.nameEnd ?? fresh.start);
            return;
        }
        this.editor.reveal(location.nameStart ?? location.start, location.nameEnd ?? location.start);
    }

    revealDiagnostic(d) {
        if (!d.file || !this.workspace.get(d.file)) return;
        if (this.view !== "text") this.setView("text");
        if (d.file !== this.activeName) this.activate(d.file);
        const text = this.active.content;
        const start = offsetOf(text, d.startLine || 1, d.startCol || 1);
        const end = Math.max(start, offsetOf(text, d.endLine || d.startLine || 1, d.endCol || d.startCol || 1));
        this.editor.reveal(start, end);
    }

    updateCursor() {
        const { line, col } = this.editor.cursor;
        $("#cursor").textContent = `Ln ${line}, Col ${col}`;
    }

    status(message, kind = "info") {
        const element = $("#message");
        element.textContent = message;
        element.className = kind;
        clearTimeout(this.statusTimer);
        if (kind === "info") this.statusTimer = setTimeout(() => { element.textContent = ""; }, 6000);
    }

    // ---------- user interface wiring ----------

    wireUi() {
        this.editor.addEventListener("change", () => {
            if (this.active && !this.active.readOnly) this.workspace.setContent(this.activeName, this.editor.value);
        });
        this.editor.addEventListener("cursor", () => this.updateCursor());
        // In the text view, the outline shows the declaration; otherwise it opens the editor of the element.
        this.modelView.addEventListener("select", e => (e.detail.collection ? this.openCollection(e.detail.collection, e.detail.id)
            : this.view === "text" ? this.select(e.detail.id) : this.openElement(e.detail.id)));
        this.modelView.addEventListener("document", e => this.openDocument(e.detail.name, { section: e.detail.section, form: true }));
        this.processView.addEventListener("document", e => this.openDocument(e.detail.name, { section: e.detail.section, form: true }));
        this.modelView.addEventListener("command", e => this.runCommand(e.detail.command, e.detail.id));
        this.problemsView.addEventListener("select", e => this.revealDiagnostic(e.detail.diagnostic));
        for (const view of [this.environmentView, this.matrixView, this.stepView, this.policyView, this.formView, this.processView]) {
            view.addEventListener("select", e => (e.detail.collection ? this.openCollection(e.detail.collection, e.detail.id)
                : e.detail.open ? this.openElement(e.detail.id) : this.select(e.detail.id, { reveal: false })));
            view.addEventListener("command", e => this.runCommand(e.detail.command, e.detail.id, e.detail.args));
        }
        this.processView.addEventListener("view", e => this.setView(e.detail.view));
        for (const view of Object.values(this.elementViews)) {
            view.addEventListener("select", e => this.select(e.detail.id, { reveal: false }));
            view.addEventListener("open", e => this.openElement(e.detail.id));
            view.addEventListener("form", e => this.openForm(e.detail.id));
            view.addEventListener("command", e => this.runCommand(e.detail.command, e.detail.id));
            view.addEventListener("collection", e => this.openTable(e.detail.kind, e.detail.id));
            view.addEventListener("view", e => { if (e.detail.id) this.select(e.detail.id, { reveal: false }); this.setView(e.detail.view); });
        }
        for (const view of [this.formView, this.environmentView]) {
            view.addEventListener("reveal", e => this.reveal(e.detail.id));
            view.addEventListener("view", e => this.setView(e.detail.view));
        }

        const actions = {
            "new-environment": () => this.newDocument("environment"),
            "new-package": () => this.newDocument("package"),
            "open": () => this.open(),
            "open-folder": () => this.openFolder(),
            "reload-folder": () => this.openFolder({ reload: true }),
            "save": () => this.save(),
            "save-as": () => this.save(this.active, { as: true }),
            "save-all": async () => { for (const d of this.workspace.dirtyDocuments) await this.save(d); },
            "close": () => this.closeAll(),
            "check": () => this.check(),
            "undo": () => this.undo(),
            "redo": () => this.undo(true),
            "engine": () => this.showEngineDetails(),
            "about": () => infoDialog("MBSE Methodology Editor", [
                "An editor for MBSE environments (MBSEMethodology: tools, roles, methodology, processes, methods and products) and their Digital Thread Flow Analyses (DTFA), which bring back the flow in the digital thread.",
                "Environment view: the tools, roles, methodology and products of an MBSE environment, including those of the environments it specializes, its flow analyses and its tool policy.",
                "DTFA Step #1 Flow mapping: the Tools Roles Methods Matrix; the methods that a role performs with a tool are the process steps, the products they hand over are the arrows (Matrix view). "
                + "DTFA Step #2 Rating: rate the transitions between the tools as efficient or bottleneck and prioritize the bottlenecks (Matrix and Form). "
                + "DTFA Step #3 Bottleneck analysis: the step definitions (Step definition view). DTFA Step #4 Measures. "
                + "The tool policy rates tool/method combinations of an environment (Tool policy view).",
                "The model is SysML v2 textual notation with the MBSEMethodology, DTFA and SYSMOD libraries; the SysML engine runs in your browser and nothing is uploaded.",
            ]),
        };
        document.addEventListener("click", e => {
            const action = e.target.closest("[data-action]");
            if (action && actions[action.dataset.action]) {
                closeMenus();
                actions[action.dataset.action]();
                return;
            }
            const view = e.target.closest("[data-view-tab]");
            if (view) { this.setView(view.dataset.viewTab); return; }
            const openDocument = e.target.closest("[data-open-document]");
            if (openDocument) { this.openDocument(openDocument.dataset.openDocument); return; }
            const activate = e.target.closest("[data-activate]");
            if (activate) { this.activate(activate.dataset.activate); return; }
            const close = e.target.closest("[data-close]");
            if (close) { this.close(close.dataset.close); return; }
            if (!e.target.closest(".menu")) closeMenus();
        });

        $("#examples-menu").innerHTML = this.config.examples.map((x, i) =>
            `<button type="button" role="menuitem" data-example="${i}">${escapeHtml(x.label)}</button>`).join("");
        $("#examples-menu").addEventListener("click", e => {
            const item = e.target.closest("[data-example]");
            if (item) { closeMenus(); this.openExample(this.config.examples[Number(item.dataset.example)]); }
        });
        $("#insert-menu").innerHTML = SNIPPETS.map((s, i) =>
            `<button type="button" role="menuitem" data-snippet="${i}">${escapeHtml(s.label)}</button>`).join("");
        $("#insert-menu").addEventListener("click", e => {
            const item = e.target.closest("[data-snippet]");
            if (!item) return;
            closeMenus();
            if (!this.active || this.active.readOnly) { this.status("The library is read-only. Insert into one of your documents.", "error"); return; }
            this.setView("text");
            this.editor.insertAtCursor(SNIPPETS[Number(item.dataset.snippet)].text);
        });

        document.addEventListener("keydown", e => {
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;
            const key = e.key.toLowerCase();
            const typing = e.target.closest("textarea, input, select");
            if (key === "s") { e.preventDefault(); this.save(this.active, { as: e.shiftKey }); }
            else if (key === "o") { e.preventDefault(); if (e.shiftKey) this.openFolder(); else this.open(); }
            else if (!typing && key === "z") { e.preventDefault(); this.undo(e.shiftKey); }
            else if (!typing && key === "y") { e.preventDefault(); this.undo(true); }
        });
        window.addEventListener("beforeunload", e => {
            this.saveDrafts();
            if (this.workspace.dirtyDocuments.length) { e.preventDefault(); e.returnValue = ""; }
        });

        function closeMenus() {
            document.querySelectorAll("details.menu[open]").forEach(d => d.removeAttribute("open"));
        }
        document.querySelectorAll("details.menu").forEach(menu => menu.addEventListener("toggle", () => {
            if (menu.open) document.querySelectorAll("details.menu[open]").forEach(d => d !== menu && d.removeAttribute("open"));
        }));
        this.updateHistoryButtons();
    }
}
