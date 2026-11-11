// Application controller: connects workspace, repository, engine, model provider, model editor and views.
//
// The controller depends on interfaces only:
//   repository     ModelRepository      (LocalFileRepository now, SysmlApiRepository later)
//   provider       model provider       (TextModelProvider now, SysmlApiModelProvider later)
//   model editor   createModelEditor()  (TextModelEditor now, SysmlApiModelEditor later)
// The editors (matrix, step definition, tool policy, form, text) show the same EEE model and share one
// selection. The graphical and form editors change the model through commands; each command is one undoable step.

import { Workspace, SourceDocument } from "../workspace/Workspace.js";
import { TextModelProvider } from "../workspace/TextModelProvider.js";
import {
    TextModelEditor, ModelEditError, environmentElementLines, quoteName, processStepLines, transitionLines, measureLines, policyRuleLines,
    stringLiteral, listValue, referenceValue,
} from "../workspace/TextModelEditor.js";
import { SysmlEngine } from "../engine/SysmlEngine.js";
import { LocalFileRepository } from "../repository/LocalFileRepository.js";
import { CancelledError } from "../repository/ModelRepository.js";
import {
    MBSEEnvironment, EeeCheck, Role, Tool, Method, Artifact, ProcessStep, StepTransition, Measure, ToolPolicy, ToolPolicyRule,
    STEP_DEFINITION_LANES, EVALUATIONS, POLICY_STATUS,
} from "../eee/model.js";
import { analyzeAll } from "../eee/EeeAnalyzer.js";
import { SNIPPETS, emptyPackage, environmentDocument } from "../eee/templates.js";
import { offsetOf, splitQualifiedName } from "../text/sysml-text.js";
import { CodeEditor } from "../ui/CodeEditor.js";
import { EeeModelView } from "../ui/EeeModelView.js";
import { ProblemsView } from "../ui/ProblemsView.js";
import { EnvironmentView } from "../ui/EnvironmentView.js";
import { MatrixView } from "../ui/MatrixView.js";
import { StepDefinitionView } from "../ui/StepDefinitionView.js";
import { PolicyView } from "../ui/PolicyView.js";
import { FormView } from "../ui/FormView.js";
import { formDialog, confirmDialog, infoDialog } from "../ui/FormDialog.js";

const $ = selector => document.querySelector(selector);
const VIEWS = ["environment", "matrix", "steps", "policy", "form", "text"];
const VIEW_KEY = "mbse-methodology-editor-view";

/** Feature names of the EEE library; an element with such a name would be confused with them in the text. */
const RESERVED_NAMES = new Set(["role", "tool", "method", "goal", "sourceArtifacts", "viewpoints", "automationSteps",
    "targetArtifacts", "artifactConversions", "evaluation", "priority", "source", "target", "status", "addressedTransitions",
    "isToolBreak", "isHumanInterface"]);

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
        this.analyses = new Map();  // check or policy id -> EEE analysis
        this.selectedId = null;
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
        this.modelView = new EeeModelView($("#eee-model"));
        this.problemsView = new ProblemsView($("#problems"), $("#problem-count"));
        this.environmentView = new EnvironmentView($("#environment"));
        this.matrixView = new MatrixView($("#matrix"));
        this.stepView = new StepDefinitionView($("#steps"));
        this.policyView = new PolicyView($("#policy"));
        this.formView = new FormView($("#form"));
        this.wireUi();

        this.workspace.addEventListener("change", e => this.onWorkspaceChange(e.detail));
        const restored = this.restoreDrafts();
        await this.loadLibraries();
        if (!this.workspace.modelDocuments.length) {
            this.addDocument(new SourceDocument({ name: "Engineering.sysml", content: environmentDocument("Engineering"), origin: "new" }));
        }
        if (!this.activeName || !this.workspace.get(this.activeName)) this.activate(this.workspace.modelDocuments[0].name);
        else this.activate(this.activeName);
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
            result = await this.provider.load(this.workspace.documents);
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
        this.view = view;
        for (const v of VIEWS) {
            $(`#view-${v}`).hidden = v !== view;
            const tab = document.querySelector(`[data-view-tab="${v}"]`);
            tab.setAttribute("aria-selected", String(v === view));
            tab.classList.toggle("active", v === view);
        }
        try { localStorage.setItem(VIEW_KEY, view); } catch (_) { /* storage unavailable */ }
        if (view === "text" && this.active) {
            if (this.editor.value !== this.active.content) this.editor.setValue(this.active.content, { readOnly: this.active.readOnly, keepView: true });
            this.editor.render();
        }
        this.renderModelViews();
    }

    viewState(message) {
        const model = this.analysis ? this.analysis.result.model : null;
        return { model, analyses: this.analyses, selectedId: this.selectedId, editable: true, message };
    }

    renderModelViews(message) {
        const state = this.viewState(message);
        this.modelView.show(state.model, { editable: true, message, selectedId: this.selectedId, analyses: this.analyses });
        // Hidden views render when they are shown.
        if (this.view === "environment") this.environmentView.show(state);
        if (this.view === "matrix") this.matrixView.show(state);
        if (this.view === "steps") this.stepView.show(state);
        if (this.view === "policy") this.policyView.show(state);
        if (this.view === "form") this.formView.show(state);
    }

    /** Selects an element in all views; in the text view, shows its declaration. */
    select(id, { reveal = this.view === "text" } = {}) {
        this.selectedId = id;
        const model = this.analysis && this.analysis.result.model;
        const element = model && model.get(id);
        if (element instanceof EeeCheck) this.matrixView.selectCheck(id);
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

    activate(name) {
        const document = this.workspace.get(name);
        if (!document) return;
        this.activeName = name;
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
        $("#documents").innerHTML = this.workspace.documents.map(d => `
            <li><button type="button" data-open-document="${escapeHtml(d.name)}" class="${d.name === this.activeName ? "active" : ""}">
                <span class="doc-name">${escapeHtml(d.name)}</span>
                <span class="doc-state">${d.library ? "library" : d.dirty ? "unsaved" : d.handle ? "saved" : d.origin === "file" ? "opened" : "not saved yet"}</span>
            </button></li>`).join("");
    }

    async newDocument(kind) {
        const values = await formDialog({
            title: kind === "environment" ? "New MBSE environment with EEE check" : "New SysML v2 file",
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
            // Show the first EEE check of the example.
            const result = await this.check();
            const first = result && result.model.checks.find(c => documents.some(d => d.name === c.document));
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
            for (const draft of stored.drafts) {
                if (typeof draft.name !== "string" || typeof draft.content !== "string") continue;
                const document = new SourceDocument({ name: draft.name, content: draft.content, origin: "draft" });
                // Restored documents have lost their file handle; keep their unsaved state visible.
                document.savedContent = typeof draft.savedContent === "string" ? draft.savedContent : "";
                this.workspace.add(document);
            }
            this.activeName = stored.active || null;
            return stored.drafts.length;
        } catch (_) {
            return 0;
        }
    }

    // ---------- EEE editing commands (shared by the matrix, step definition, policy, form and outline views) ----------

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
        if (RESERVED_NAMES.has(name)) return `${name} is a feature name of the EEE library. Choose another name.`;
        if (result.model.get(`${ownerElementId}::${name}`) || (result.locate && result.locate(`${ownerElementId}::${name}`))) return `${name} already exists here.`;
        return null;
    }

    /** A unique default name in a namespace, e.g. "newStep2". */
    freeName(base, ownerElementId, result) {
        for (let i = 1; ; i++) {
            const name = i === 1 ? base : `${base}${i}`;
            if (!this.validateNewName(name, ownerElementId, result)) return name;
        }
    }

    /** The name with which a statement inside contextId refers to targetId: its simple name if visible, else qualified. */
    referenceName(targetId, contextId) {
        // An element of the MBSE environment of an EEE check or tool policy: a feature chain through the usage of the
        // environment, e.g. env.systemArchitect or env.companyMethodology.sysmodArchitecture.
        const model = this.analysis && this.analysis.result.model;
        const target = model && model.get(targetId);
        const container = model && (model.checkOf(contextId) || model.policyOf(contextId));
        if (target && target.environmentId && container && container.environmentUsage
            && model.environmentScope(container.environmentId).includes(target.environmentId)) {
            return [container.environmentUsage, ...splitQualifiedName(targetId.slice(target.environmentId.length + 2)).map(quoteName)].join(".");
        }
        const scope = ownerId(targetId);
        if (!scope || contextId === scope || contextId.startsWith(scope + "::")) return targetId.slice(scope.length ? scope.length + 2 : 0);
        return targetId;
    }

    /** The MBSE environment that an element belongs to or is anchored at, or null. */
    environmentOf(element, model) {
        if (element instanceof MBSEEnvironment) return element;
        if (element && element.environmentId && model.get(element.environmentId) instanceof MBSEEnvironment && !(element instanceof EeeCheck || element instanceof ToolPolicy)) {
            return model.get(element.environmentId);
        }
        const container = element && (model.checkOf(element.id) || model.policyOf(element.id));
        if (container && model.get(container.environmentId)) return model.get(container.environmentId);
        return null;
    }

    /** Asks for the environment of a new element: the given one or one of the environments it specializes. */
    async chooseEnvironment(element, model, what) {
        const environment = this.environmentOf(element, model) || model.environments[0];
        if (!environment) throw new ModelEditError("Create an MBSE environment first (File ▸ New MBSE environment).");
        return model.environmentScope(environment.id).map(id => model.get(id));
    }

    /** The EEE check of an element, or an error. */
    requireCheck(element, model) {
        const check = model.checkOf(element.id);
        if (!check) throw new ModelEditError("Select an EEE check or an element of one.");
        return check;
    }

    /** Edits that remove the references to deleted elements from the value statements of other elements. */
    removeReferences(model, editor, deletedIds) {
        const deleted = new Set(deletedIds);
        const edits = [];
        const allSteps = model.checks.flatMap(c => c.steps);
        for (const step of allSteps) {
            if (deleted.has(step.id)) continue;
            for (const [feature, key] of [["role", "roleId"], ["tool", "toolId"], ["method", "methodId"]]) {
                if (deleted.has(step[key])) edits.push(...editor.setValue(step.id, feature, null));
            }
            for (const [feature, key] of [["sourceArtifacts", "sourceArtifactIds"], ["targetArtifacts", "targetArtifactIds"]]) {
                if (step[key].some(id => deleted.has(id))) {
                    const rest = step[key].filter(id => !deleted.has(id));
                    edits.push(...editor.setValue(step.id, feature, listValue(rest.map(id => this.referenceName(id, step.id)))));
                }
            }
            for (const measure of step.measures) {
                if (deleted.has(measure.id) || !measure.addressedTransitionIds.some(id => deleted.has(id))) continue;
                const rest = measure.addressedTransitionIds.filter(id => !deleted.has(id));
                edits.push(...editor.setValue(measure.id, "addressedTransitions", listValue(rest.map(id => this.referenceName(id, measure.id)))));
            }
        }
        for (const rule of model.policies.flatMap(p => p.rules)) {
            if (!deleted.has(rule.id) && (deleted.has(rule.toolId) || deleted.has(rule.methodId))) edits.push(...editor.deleteElement(rule.id));
        }
        return edits;
    }

    get commands() {
        /** Adds a role, tool, method or product to an MBSE environment (or one of the environments it specializes). */
        const environmentAdd = (kind, title, base) => async function (element, result) {
            const { model } = result;
            const environments = await this.chooseEnvironment(element, model, kind);
            const values = await formDialog({
                title, fields: [
                    { name: "environment", label: "MBSE environment", type: "select", value: environments[0].id,
                        options: environments.map((e, i) => ({ value: e.id, label: i ? `${e.name} (specialized by ${environments[0].name})` : e.name })) },
                    { name: "name", label: "Name", value: base, required: true },
                    { name: "doc", label: "Description (optional)", value: "" },
                ],
                validate: v => {
                    const environment = model.get(v.environment);
                    const owner = kind === "method" && environment.methodologyId ? environment.methodologyId : environment.id;
                    return this.validateNewName(v.name, owner, result);
                },
            });
            if (!values) return null;
            const environment = model.get(values.environment);
            const editor = this.createModelEditor(result);
            const lines = environmentElementLines(kind, values.name, values.doc);
            if (kind === "method" && !environment.methodologyId) {
                return { edits: editor.addElement(environment.id, ["part :>> methodology {", ...lines.map(l => "    " + l), "}"]),
                    label: `add method ${values.name}`, select: `${environment.id}::methodology::${values.name}` };
            }
            const owner = kind === "method" ? environment.methodologyId : environment.id;
            return { edits: editor.addElement(owner, lines), label: `add ${kind} ${values.name}`, select: `${owner}::${values.name}` };
        };

        /** Adds an EEE check or a tool policy anchored at an MBSE environment, or a specialized environment. */
        const anchoredAdd = (kind, title, suffix) => async function (element, result) {
            const { model } = result;
            const environment = this.environmentOf(element, model) || model.environments[0];
            if (!environment) throw new ModelEditError("Create an MBSE environment first (File ▸ New MBSE environment).");
            const packageId = ownerId(environment.id);
            if (!packageId) throw new ModelEditError(`${environment.name} is not inside a package.`);
            const values = await formDialog({
                title: `${title} ${environment.name}`,
                fields: [{ name: "name", label: "Name", value: this.freeName(nameFrom(`${environment.name} ${suffix}`, "New" + suffix), packageId, result).replace(/^./, c => c.toUpperCase()), required: true }],
                validate: v => this.validateNewName(v.name, packageId, result),
            });
            if (!values) return null;
            const environmentRef = this.referenceName(environment.id, packageId + "::" + values.name);
            const lines = kind === "environment"
                ? [`occurrence def ${values.name} :> ${environmentRef} {`, "}"]
                : [`#${kind} occurrence def ${values.name} {`, `    occurrence env : ${environmentRef} :>> environment;`, "}"];
            return { edits: this.createModelEditor(result).addElement(packageId, lines), label: `add ${values.name}`, select: `${packageId}::${values.name}` };
        };

        return {
            addRole: environmentAdd("role", "Add a role (a row of the matrix)", "newRole"),
            addArtifact: environmentAdd("product", "Add a product (an artifact of the process steps)", "newProduct"),
            addTool: environmentAdd("tool", "Add a tool (a column of the matrix)", "newTool"),
            addMethod: environmentAdd("method", "Add a method to the methodology", "newMethod"),
            addCheck: anchoredAdd("eeeCheck", "Add an EEE check of", "Check"),
            addPolicy: anchoredAdd("toolPolicy", "Add a tool policy for", "ToolPolicy"),
            addEnvironment: anchoredAdd("environment", "Add an MBSE environment that specializes", "Environment"),

            async addStep(element, result, { roleId, toolId } = {}) {
                const { model } = result;
                const check = this.requireCheck(element, model);
                const option = e => ({ value: e.id, label: e.name });
                const values = await formDialog({
                    title: `Add a process step to ${check.name}`,
                    fields: [
                        { name: "name", label: "Name", value: this.freeName("newStep", check.id, result), required: true },
                        { name: "role", label: "Role (row)", type: "select", value: roleId || "", options: [{ value: "", label: "–" }, ...model.roles.map(option)] },
                        { name: "tool", label: "Tool (column)", type: "select", value: toolId || "", options: [{ value: "", label: "–" }, ...model.tools.map(option)] },
                        { name: "method", label: "Method", type: "select", value: "", options: [{ value: "", label: "–" }, ...model.methods.map(option)] },
                    ],
                    validate: v => this.validateNewName(v.name, check.id, result),
                });
                if (!values) return null;
                const id = `${check.id}::${values.name}`;
                const ref = target => (target ? this.referenceName(target, id) : "");
                return {
                    edits: this.createModelEditor(result).addElement(check.id, processStepLines({ name: values.name, role: ref(values.role), tool: ref(values.tool), method: ref(values.method) })),
                    label: `add process step ${values.name}`, select: id,
                };
            },

            async addTransition(element, result, { sourceId, targetId } = {}) {
                const { model } = result;
                const check = this.requireCheck(element, model);
                if (!sourceId && element instanceof ProcessStep) sourceId = element.id;
                const options = check.steps.map(s => ({ value: s.id, label: s.name }));
                if (options.length < 1) throw new ModelEditError(`${check.name} has no process steps to connect.`);
                const suggest = (s, t) => (s && t ? nameFrom(`${model.nameOf(s)} to ${model.nameOf(t).charAt(0).toUpperCase()}${model.nameOf(t).slice(1)}`, "newTransition") : "newTransition");
                let values;
                if (sourceId && targetId) {
                    values = await formDialog({
                        title: `Add the transition ${model.nameOf(sourceId)} → ${model.nameOf(targetId)}`,
                        fields: [
                            { name: "name", label: "Name", value: this.freeName(suggest(sourceId, targetId), check.id, result), required: true },
                            { name: "evaluation", label: "Evaluation", type: "select", value: "unrated", options: Object.entries(EVALUATIONS).map(([value, e]) => ({ value, label: e.label })) },
                        ],
                        validate: v => this.validateNewName(v.name, check.id, result),
                    });
                    if (values) Object.assign(values, { source: sourceId, target: targetId });
                } else {
                    values = await formDialog({
                        title: `Add a transition to ${check.name}`,
                        fields: [
                            { name: "source", label: "From process step (hands over)", type: "select", value: sourceId || options[0].value, options },
                            { name: "target", label: "To process step (takes over)", type: "select", value: (options.find(o => o.value !== sourceId) || options[0]).value, options },
                            { name: "name", label: "Name", value: "", hint: "Leave empty for a name from the two steps." },
                            { name: "evaluation", label: "Evaluation", type: "select", value: "unrated", options: Object.entries(EVALUATIONS).map(([value, e]) => ({ value, label: e.label })) },
                        ],
                        validate: v => (v.source === v.target ? "Choose two different process steps."
                            : this.validateNewName(v.name || this.freeName(suggest(v.source, v.target), check.id, result), check.id, result)),
                    });
                    if (values && !values.name) values.name = this.freeName(suggest(values.source, values.target), check.id, result);
                }
                if (!values) return null;
                if (values.source === values.target) throw new ModelEditError("A transition connects two different process steps.");
                const id = `${check.id}::${values.name}`;
                return {
                    edits: this.createModelEditor(result).addElement(check.id, transitionLines({
                        name: values.name, source: this.referenceName(values.source, id), target: this.referenceName(values.target, id), evaluation: values.evaluation,
                    })),
                    label: `add transition ${values.name}`, select: id,
                };
            },

            async addMeasure(step, result) {
                if (!(step instanceof ProcessStep)) throw new ModelEditError("Select a process step to add a measure to it.");
                const { model } = result;
                const transitions = model.transitionsOf(step);
                const values = await formDialog({
                    title: `Add a measure that optimizes ${step.name}`,
                    fields: [
                        { name: "name", label: "Name", value: this.freeName("newMeasure", step.id, result), required: true },
                        { name: "description", label: "What changes, and why it removes the bottleneck", type: "textarea", value: "" },
                        { name: "transitions", label: "Addressed transitions", type: "checkboxes", value: transitions.filter(t => t.isBottleneck).map(t => t.id),
                            options: transitions.map(t => ({ value: t.id, label: `${t.name} (${EVALUATIONS[t.evaluation].label})` })) },
                    ],
                    validate: v => this.validateNewName(v.name, step.id, result),
                });
                if (!values) return null;
                const id = `${step.id}::${values.name}`;
                return {
                    edits: this.createModelEditor(result).addElement(step.id, measureLines({
                        name: values.name, description: values.description, transitions: values.transitions.map(t => this.referenceName(t, id)),
                    })),
                    label: `add measure ${values.name}`, select: id,
                };
            },

            async addRule(policy, result, { toolId = "", methodId = "", status = "recommended" } = {}) {
                const { model } = result;
                if (!(policy instanceof ToolPolicy)) policy = model.policyOf(policy.id);
                if (!policy) throw new ModelEditError("Select a tool policy.");
                if (!model.tools.length || !model.methods.length) throw new ModelEditError("Add tools and methods first.");
                const values = await formDialog({
                    title: `Add a rule to ${policy.name}`,
                    fields: [
                        { name: "method", label: "Method", type: "select", value: methodId || model.methods[0].id, options: model.methods.map(m => ({ value: m.id, label: m.name })) },
                        { name: "tool", label: "Tool", type: "select", value: toolId || model.tools[0].id, options: model.tools.map(t => ({ value: t.id, label: t.name })) },
                        { name: "status", label: "Status", type: "select", value: status, options: Object.entries(POLICY_STATUS).map(([value, s]) => ({ value, label: s.label })) },
                        { name: "name", label: "Name", value: "", hint: "Leave empty for a name from the tool and the method." },
                    ],
                    validate: v => (v.name ? this.validateNewName(v.name, policy.id, result) : null),
                });
                if (!values) return null;
                const name = values.name || this.freeName(nameFrom(`${model.nameOf(values.tool)} for ${model.nameOf(values.method)}`, "newRule"), policy.id, result);
                const id = `${policy.id}::${name}`;
                return {
                    edits: this.createModelEditor(result).addElement(policy.id, policyRuleLines({
                        name, tool: this.referenceName(values.tool, id), method: this.referenceName(values.method, id), status: values.status,
                    })),
                    label: `add rule ${name}`, select: id,
                };
            },

            async setPolicyCell(policy, result, { toolId, methodId, status }) {
                if (!(policy instanceof ToolPolicy)) return null;
                const { model } = result;
                const editor = this.createModelEditor(result);
                const rule = policy.rules.find(r => r.toolId === toolId && r.methodId === methodId);
                const combination = `${model.nameOf(methodId)} with ${model.nameOf(toolId)}`;
                if (!status) {
                    if (!rule) return null;
                    return { edits: editor.deleteElement(rule.id), label: `remove the rule for ${combination}`, select: policy.id };
                }
                if (rule) return { edits: editor.setValue(rule.id, "status", `PolicyStatus::${status}`), label: `${combination}: ${status}` };
                const name = this.freeName(nameFrom(`${model.nameOf(toolId)} for ${model.nameOf(methodId)}`, "newRule"), policy.id, result);
                const id = `${policy.id}::${name}`;
                return {
                    edits: editor.addElement(policy.id, policyRuleLines({ name, tool: this.referenceName(toolId, id), method: this.referenceName(methodId, id), status })),
                    label: `${combination}: ${status}`,
                };
            },

            async setReference(element, result, { feature, targetId }) {
                if (!(element instanceof ProcessStep || element instanceof ToolPolicyRule) || !["role", "tool", "method"].includes(feature)) return null;
                if (element instanceof ToolPolicyRule && feature === "role") return null;
                const value = targetId ? referenceValue(this.referenceName(targetId, element.id)) : null;
                return { edits: this.createModelEditor(result).setValue(element.id, feature, value), label: `set the ${feature} of ${element.name}` };
            },

            async moveStep(step, result, { roleId, toolId }) {
                if (!(step instanceof ProcessStep)) return null;
                const ref = id => (id ? referenceValue(this.referenceName(id, step.id)) : null);
                const pairs = [];
                if ((step.roleId || null) !== (roleId || null)) pairs.push(["role", ref(roleId)]);
                if ((step.toolId || null) !== (toolId || null)) pairs.push(["tool", ref(toolId)]);
                if (!pairs.length) return null;
                const { model } = result;
                return {
                    edits: this.createModelEditor(result).setValues(step.id, pairs),
                    label: `move ${step.name} to ${model.nameOf(roleId, "no role")} × ${model.nameOf(toolId, "no tool")}`,
                };
            },

            async setEvaluation(transition, result, { evaluation }) {
                if (!(transition instanceof StepTransition) || !EVALUATIONS[evaluation] || transition.evaluation === evaluation) return null;
                return { edits: this.createModelEditor(result).setValue(transition.id, "evaluation", `TransitionEvaluation::${evaluation}`), label: `evaluate ${transition.name} as ${evaluation}` };
            },

            async setPriority(transition, result, { priority }) {
                if (!(transition instanceof StepTransition)) return null;
                const value = priority && Number.isInteger(priority) && priority > 0 ? String(priority) : null;
                if (priority !== null && !value) throw new ModelEditError("The priority is a whole number from 1 (highest).");
                if (String(transition.priority ?? "") === String(value ?? "")) return null;
                return { edits: this.createModelEditor(result).setValue(transition.id, "priority", value), label: `set the priority of ${transition.name}` };
            },

            async setStatus(rule, result, { status }) {
                if (!(rule instanceof ToolPolicyRule) || !POLICY_STATUS[status] || rule.status === status) return null;
                return { edits: this.createModelEditor(result).setValue(rule.id, "status", `PolicyStatus::${status}`), label: `set ${rule.name} to ${status}` };
            },

            async setAddressed(measure, result, { transitionIds }) {
                if (!(measure instanceof Measure)) return null;
                const value = listValue(transitionIds.map(id => this.referenceName(id, measure.id)));
                return { edits: this.createModelEditor(result).setValue(measure.id, "addressedTransitions", value), label: `set the transitions of ${measure.name}` };
            },

            /** Sets a swimlane of the process step definition to a value (string, strings or artifact ids). */
            async setLane(step, result, { feature, value }) {
                const lane = STEP_DEFINITION_LANES.find(l => l.feature === feature);
                if (!(step instanceof ProcessStep) || !lane) return null;
                let text;
                if (lane.kind === "text") text = value ? stringLiteral(value) : null;
                else if (lane.kind === "texts") text = listValue(value.filter(Boolean).map(stringLiteral));
                else text = listValue(value.map(id => this.referenceName(id, step.id)));
                return { edits: this.createModelEditor(result).setValue(step.id, feature, text), label: `change ${lane.label.toLowerCase()} of ${step.name}` };
            },

            /** Asks for the new content of a swimlane. */
            async editLane(step, result, { feature }) {
                const lane = STEP_DEFINITION_LANES.find(l => l.feature === feature);
                if (!(step instanceof ProcessStep) || !lane) return null;
                const { model } = result;
                if (lane.kind === "text") {
                    const values = await formDialog({
                        title: `${lane.label} of ${step.name}`, submitLabel: "Save",
                        fields: [{ name: "text", label: lane.label, type: "textarea", rows: 3, value: step.lane(feature), hint: lane.hint }],
                    });
                    return values ? this.commands.setLane.call(this, step, result, { feature, value: values.text }) : null;
                }
                if (lane.kind === "texts") {
                    const values = await formDialog({
                        title: `${lane.label} of ${step.name}`, submitLabel: "Save",
                        fields: [{ name: "text", label: `${lane.label}, one per line`, type: "textarea", rows: 5, value: step.lane(feature).join("\n"), hint: lane.hint }],
                    });
                    return values ? this.commands.setLane.call(this, step, result, { feature, value: values.text.split(/\r?\n/).map(s => s.trim()).filter(Boolean) }) : null;
                }
                const check = model.checkOf(step.id);
                const environment = check && model.get(check.environmentId);
                // The products of the environment of the check, and those the step already uses.
                const artifacts = model.artifacts.filter(a => (environment && model.environmentScope(environment.id).includes(a.environmentId))
                    || step.lane(feature).includes(a.id) || !environment);
                const values = await formDialog({
                    title: `${lane.label} of ${step.name}`, submitLabel: "Save",
                    fields: [
                        { name: "artifacts", label: lane.label, type: "checkboxes", value: step.lane(feature), options: artifacts.map(a => ({ value: a.id, label: a.name })), hint: lane.hint },
                        { name: "newArtifact", label: "New product (optional)", value: "", hint: environment ? `Adds a product to the MBSE environment ${environment.name} and to this swimlane.` : "Needs an EEE check with an MBSE environment." },
                    ],
                    validate: v => (v.newArtifact && environment ? this.validateNewName(v.newArtifact, environment.id, result) : null),
                });
                if (!values) return null;
                const editor = this.createModelEditor(result);
                const references = values.artifacts.map(id => this.referenceName(id, step.id));
                const edits = [];
                if (values.newArtifact && environment) {
                    edits.push(...editor.addElement(environment.id, environmentElementLines("product", values.newArtifact)));
                    references.push(`${check.environmentUsage}.${values.newArtifact}`);
                }
                edits.push(...editor.setValue(step.id, feature, listValue(references)));
                return { edits, label: `change ${lane.label.toLowerCase()} of ${step.name}` };
            },

            async setDoc(element, result, { text }) {
                if (text === element.doc) return null;
                return { edits: this.createModelEditor(result).setDoc(element.id, text), label: `describe ${element.name}` };
            },

            async rename(element, result, { newName } = {}) {
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
                if (element instanceof EeeCheck || element instanceof ToolPolicy || element instanceof MBSEEnvironment || element.external) throw new ModelEditError(`Delete the ${element.kindLabel.toLowerCase()} ${element.name} in the text.`);
                const doomed = [element.id];
                let question = `Delete ${element.kindLabel.toLowerCase()} ${element.name}?`;
                if (element instanceof ProcessStep) {
                    const transitions = model.transitionsOf(element);
                    doomed.push(...transitions.map(t => t.id), ...element.measures.map(m => m.id));
                    if (transitions.length) question += ` Its ${transitions.length} transition${transitions.length === 1 ? " is" : "s are"} deleted too.`;
                } else if (element instanceof Role || element instanceof Tool || element instanceof Method || element instanceof Artifact) {
                    const users = model.checks.flatMap(c => c.steps).filter(s => [s.roleId, s.toolId, s.methodId, ...s.sourceArtifactIds, ...s.targetArtifactIds].includes(element.id));
                    if (users.length) question += ` It is removed from ${users.length} process step${users.length === 1 ? "" : "s"}.`;
                    const rules = model.policies.flatMap(p => p.rules).filter(r => r.toolId === element.id || r.methodId === element.id);
                    if (rules.length) question += ` ${rules.length} tool policy rule${rules.length === 1 ? " is" : "s are"} deleted.`;
                }
                if (!(element instanceof Measure || element instanceof ToolPolicyRule) && !(await confirmDialog(question, { confirmLabel: "Delete" }))) return null;
                const edits = [...doomed.filter(id => result.locate(id)).flatMap(id => editor.deleteElement(id)), ...this.removeReferences(model, editor, doomed)];
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
        this.modelView.addEventListener("select", e => this.select(e.detail.id));
        this.modelView.addEventListener("command", e => this.runCommand(e.detail.command, e.detail.id));
        this.problemsView.addEventListener("select", e => this.revealDiagnostic(e.detail.diagnostic));
        for (const view of [this.environmentView, this.matrixView, this.stepView, this.policyView, this.formView]) {
            view.addEventListener("select", e => this.select(e.detail.id, { reveal: false }));
            view.addEventListener("command", e => this.runCommand(e.detail.command, e.detail.id, e.detail.args));
        }
        for (const view of [this.formView, this.environmentView]) {
            view.addEventListener("reveal", e => this.reveal(e.detail.id));
            view.addEventListener("view", e => this.setView(e.detail.view));
        }

        const actions = {
            "new-environment": () => this.newDocument("environment"),
            "new-package": () => this.newDocument("package"),
            "open": () => this.open(),
            "save": () => this.save(),
            "save-as": () => this.save(this.active, { as: true }),
            "save-all": async () => { for (const d of this.workspace.dirtyDocuments) await this.save(d); },
            "close": () => this.close(),
            "check": () => this.check(),
            "undo": () => this.undo(),
            "redo": () => this.undo(true),
            "engine": () => this.showEngineDetails(),
            "about": () => infoDialog("MBSE Methodology Editor", [
                "An editor for MBSE environments (MBSEMethodology: tools, roles, methodology, processes, methods and products) and their EEE checks (Engineering Efficiency Empowerment by oose and Willert, https://eee-check.de/).",
                "Environment view: the tools, roles, methodology and products of an MBSE environment, including those of the environments it specializes, and the EEE checks and tool policies anchored at it.",
                "EEE Step #1 Analysis: the Tools Roles Methods Matrix of the environment (Matrix view). EEE Step #2 Evaluation: rate each transition as efficient or bottleneck and prioritize the bottlenecks (Matrix and Form). "
                + "EEE Step #3 Bottleneck analysis: the Process Step Definition Diagram (Step definition view). EEE Step #4 Optimization: measures of the process steps. "
                + "The Company Tool Policy Matrix rates tool/method combinations of an environment (Tool policy view).",
                "The model is SysML v2 textual notation with the MBSEMethodology, EEE and SYSMOD libraries; the SysML engine runs in your browser and nothing is uploaded.",
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
            if (openDocument) { this.activate(openDocument.dataset.openDocument); this.setView("text"); return; }
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
            else if (key === "o") { e.preventDefault(); this.open(); }
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
