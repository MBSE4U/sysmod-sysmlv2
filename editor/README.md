# MBSE Methodology Editor

A web-based editor for **MBSE environments** ([MBSEMethodology](../MBSEMethodology.sysml): tools, roles, methodology with its processes and methods, products) and their **EEE checks** (Engineering Efficiency Empowerment, [eee-check.de](https://eee-check.de/), library [EEE](../EEE.sysml)) in SysML v2 textual notation. The MBSE environment is the anchor point: an EEE check analyzes an environment, and a tool policy rates the tools and methods of an environment. It runs entirely in the browser: the [sysmlv2](https://github.com/Open-MBEE/sysml-toolkit) WebAssembly engine of Open-MBEE parses and checks the model locally, and nothing is uploaded to a server.

The editor follows the concepts of the [PLEML editor](https://github.com/MBSE4U/PLEML/tree/main/editor): the `.sysml` text is the source of truth, a domain model is built from what the SysML engine reports, and graphical and form editors change the text through undoable commands. Version 1 creates, reads and writes `.sysml` files. The architecture is prepared for a later version that works on a model in a SysML v2 API (Systems Modeling API) repository.

## Six editors on one model

The editor offers six views of the same model, switched with **Environment | Matrix | Step definition | Tool policy | Form | Text**. They share one selection, and every change is saved to the `.sysml` text.

**Environment.** An MBSE environment (`MBSEMethodology::MBSEEnvironment`):
- its roles, tools, methodology (processes and methods, as a tree) and products, including those inherited from the environments it specializes ("from CompanyEnvironment"), with the number of EEE process steps that use them
- the EEE checks that analyze it and the tool policies that rate its tools and methods
- **Editing:** add roles, tools, methods (into the methodology of the environment) and products, to the environment or to one of the environments it specializes; add an EEE check or a tool policy anchored at the environment; add an environment that specializes it, e.g. for a team

**Matrix (EEE Steps #1 and #2).** The EEE Tools Roles Methods Matrix of an EEE check:
- The roles of the analyzed MBSE environment are the rows, its tools the columns. Process steps are boxes in the cells, labeled with their method.
- Transitions are arrows between the process steps. A change of the column is a method/tool break, a change of the row a human interface.
- The evaluation colors the arrows: bottleneck (red, with the priority in a circle), efficient (green), not rated (gray, dashed). Steps at a bottleneck have a red outline.
- A red corner marks a step whose tool/method combination the tool policy forbids; a green dot counts its measures.
- **Editing:**
  - double-click an empty cell to add a process step with that role and tool
  - drag a step to another cell to change its role and tool
  - select a step, press **→ Connect** (or C), then click the next step to add a transition
  - select a transition to evaluate it (**Not rated / Efficient / Bottleneck**) and to set the priority of a bottleneck
  - double-click (or F2) renames, Del deletes
- Pan with the mouse, zoom with the wheel or the buttons, and press Fit to show everything.

**Step definition (EEE Steps #3 and #4).** The EEE Process Step Definition Diagram:
- The six swimlanes are rows: goal, source artifacts, viewpoints, automation steps, target artifacts and artifact conversions.
- For a selected transition, the step that hands over and the step that takes over are side by side. Artifacts produced by the first step and needed by the second one are marked as handed over (⇄).
- Add and remove entries in each swimlane; new artifacts can be created on the way.
- Below the swimlanes: the measures that optimize the steps, with the transitions they address.

**Tool policy.** The EEE Company Tool Policy Matrix of methods (rows) and tools (columns). Click a cell to cycle its status: none → recommended → allowed → forbidden → none. A dot marks combinations that process steps of the EEE checks use; a used, forbidden combination is outlined in red and reported as a finding of the EEE check.

**Form.** A form for the selected element:
- **EEE check:** the progress of the four EEE steps, counts of method/tool breaks and human interfaces, the bottlenecks by priority with their measures, and the findings per EEE step
- **Process step:** role, tool and method, the tool policy status of the combination, its process step definition, transitions and measures
- **Transition:** the two steps, the kind of the transition, evaluation and priority, handed-over artifacts and measures
- **Role, tool, method, artifact:** description and where it is used
- **Measure:** description and addressed transitions
- **Tool policy and rule:** the rules; method, tool and status of a rule

**Text.** The SysML v2 textual notation, with syntax highlighting, line numbers, auto-indent and snippets for the EEE elements (Insert menu).

Commands from the graphical and form editors are single undoable steps (**Undo / Redo**, Ctrl+Z / Ctrl+Y outside the text editor). Renaming an element also renames the references to it in its package and qualified references in your other open documents. Deleting an element also removes the references to it, e.g. the transitions of a deleted process step.

## Files and checks

- **Create** a new MBSE environment with an EEE check and a tool policy from a template, or an empty SysML v2 file (File ▸ New).
- **Read** `.sysml` files from your computer (File ▸ Open, several at once), or open the examples of this repository: the EEE check of the control unit team, and the SYSMOD Delivery Drone project with its MBSE environment.
- **References:** the editor writes references to elements of the analyzed environment as feature chains through the environment usage of the check or policy, e.g. `:>> role = env.systemArchitect;`. The engine resolves an inherited element to its declaration, so the company environment's tools are the same elements in every team environment that specializes it.
- **Write** back to the opened file (Chrome and Edge, via the File System Access API), or save as a download in other browsers.
- **SysML check (sysmlv2 engine):** all open documents are parsed and checked together with the libraries of this repository (MBSEMethodology, EEE, ISO15288Processes, SYSMOD, ...) and the SysML v2 standard library: syntax, name resolution and semantic rules. Findings appear in the Problems panel and are marked in the text. A document with a syntax error is repaired for the model, leaving out the broken member, so the views keep working while you type.
- **EEE check (the editor):** the editor evaluates the EEE method on the model: the kind of each transition, the progress of the four EEE steps, and findings such as unrated transitions, bottlenecks without priority, steps at bottlenecks without a goal, bottlenecks without measures, steps without role or tool, and steps that use a combination the tool policy forbids. The result appears in the matrix and the form; it is not a SysML-level verification.
- **Drafts:** open documents are kept in the browser's local storage, so they survive a reload. Files remain the source of truth.

## Run

The editor is a static web app without a build step. It needs a local copy of the SysML engine, which you download once (it is not committed):

```bash
node tools/fetch-engine.mjs        # downloads the engine into vendor/
npx http-server .. -p 8080         # serve the repository root, then open http://localhost:8080/editor/
```

The editor loads the libraries (`../MBSEMethodology.sysml`, `../EEE.sysml`, `../SYSMOD.sysml`, ...) and the examples from `../examples/`. These paths work when you serve the repository root. Otherwise, the editor loads the libraries from GitHub (via jsDelivr, branch `main`), and the Examples menu is not available.

Opening `index.html` as a file does not work, because browsers do not run module workers from `file://` URLs. Build the standalone file for that instead (see below).

### Standalone file (no web server)

To use the editor without a web server, for example offline or to pass it on as a single file, build it as one HTML file:

```bash
node tools/build-standalone.mjs     # writes dist/mbse-methodology-editor.html (about 16 MB)
```

Open the file in Chrome or Edge by double-clicking it. It needs no network access, because it contains:
- the editor code and styles
- the SysML engine with the prepared SysML v2 standard library, checked against the hashes in `src/config.js` at build time and again in the browser
- the libraries and the examples
- the license texts

The build takes the engine from the local copy in `vendor/` if present, and downloads it from the GitHub release otherwise. It reads the libraries and the examples from the repository: the parent directory, or a directory given with `--repo <dir>`. If it finds none, it downloads them from GitHub. Use `--out <file>` to change the output file.

### The SysML engine

The editor checks the model with **sysmlv2**, the SysML v2 toolkit of Open-MBEE ([sysml-toolkit](https://github.com/Open-MBEE/sysml-toolkit), crate `sysmlv2-wasm`), compiled to WebAssembly. It runs in a Web Worker, so typing stays responsive. Your model is not uploaded. Engine loading, integrity checks and the standalone embedding work as in the [PLEML editor](https://github.com/MBSE4U/PLEML-editor).

Unresolved references (e.g. to a deleted element) are reported by the engine as warnings.

## Architecture

```
       ┌──────────────────────────────── views (src/ui) ─────────────────────────────────┐
       │ EnvironmentView MatrixView StepDefinitionView PolicyView FormView CodeEditor ... │
       └──────────────────┬──────────────────────────────────────────┬───────────────────┘
                          │ EEE domain model + EEE analysis          │ commands
                   ┌──────┴───────┐                          ┌───────┴────────┐
                   │ App (src/app) │──────── repository ──────│ ModelRepository │  LocalFileRepository
                   └──────┬───────┘                          └────────────────┘  SysmlApiRepository (prepared)
            model provider│                       model editor│
   ┌──────────────────────┴─────┐          ┌──────────────────┴────────────┐
   │ TextModelProvider          │          │ TextModelEditor               │  text edits
   │ SysmlApiModelProvider (prep.)│        │ SysmlApiModelEditor (prepared) │  commits
   └──────┬─────────────────────┘          └───────────────────────────────┘
          │ analyze(documents, languageTypes)
   ┌──────┴─────────────────────────────────────────────────────────┐
   │ SysmlEngine ── Web Worker ── engine-core ── sysmlv2 WebAssembly │
   └────────────────────────────────────────────────────────────────┘
```

| Layer | Files | Responsibility |
|---|---|---|
| Domain | `src/eee/model.js` | Domain model: `MBSEEnvironment` and its `Role`, `Tool`, `Process`, `Method` and `Artifact` (products) from MBSEMethodology; `EeeCheck`, `ProcessStep`, `StepTransition`, `Measure`, `ToolPolicy`, `ToolPolicyRule` from EEE. Environment scopes (an environment and those it specializes) give the matrix axes. The views know only this model, not where it comes from. |
| Model building | `src/eee/EeeModelBuilder.js` | Recognizes the elements in the engine's symbols by their conformance to the EEE and MBSEMethodology definitions (e.g. `part matlab :> tools` conforms to `MBSEMethodology::Tool`) and their metaclass, links checks and policies to the environment that their `environment` redefinition is typed by, and reads values (role, tool, method, swimlanes, evaluation, priority, status) from the evaluated feature values (feature chains resolve to the declarations) and the connector ends. |
| EEE analysis | `src/eee/EeeAnalyzer.js` | Kind of each transition (method/tool break, human interface), progress of the four EEE steps, findings, and the tool policy status of tool/method combinations. |
| Views | `src/ui/` | `EnvironmentView` (MBSE environment), `MatrixView` (Tools Roles Methods Matrix), `StepDefinitionView` (Process Step Definition Diagram), `PolicyView` (Company Tool Policy Matrix), `FormView`, `CodeEditor`, `EeeModelView` (outline of environments, checks and policies), `ProblemsView`, `FormDialog`. The views emit `select` and `command` events; `App` executes the commands with the model editor and keeps the undo history. |
| Engine | `src/engine/` | `engine-core.js` calls the sysmlv2 module. Compared with the PLEML editor, it reports for each symbol the given language types it conforms to (`types`), its evaluated feature value (`value`, `valueText`), the feature a connector end references (`referencedId`) and its doc comments. `SysmlEngine` runs it in a Web Worker. |
| Text | `src/text/sysml-text.js` | Comment-aware outline of the text. It maps the engine's qualified names to declarations and insertion points. |
| Source | `src/workspace/` | `Workspace` holds the open documents. `TextModelProvider` turns documents into the domain model and diagnostics. `TextModelEditor` turns model commands into text edits: `addElement`, `setValue` (":>> feature = value;"), `setValues`, `setDoc`, `renameElement`, `deleteElement`. |
| Storage | `src/repository/` | `ModelRepository` interface. `LocalFileRepository` reads and writes local files. |
| SysML v2 API | `src/sysml-api/` | `SysmlApiClient` (REST client). Provider, editor and repository are stubs with the planned mapping. |

## Test

The smoke test runs the engine, model, analysis and text layers in Node against the libraries and the examples of this repository. It uses the local copy of the engine, and reads the repository from the parent directory, or from `--repo <dir>`:

```bash
node tools/fetch-engine.mjs     # once
node test/smoke.mjs
```

## Configuration

`src/config.js` holds:

- the engine version, the release URL and the SHA-256 of the release and of each file the editor uses
- the library URLs and the examples
- the check delay and the drafts storage key
- the (future) SysML v2 API base URL

## Licenses

- The editor (MIT License, see [LICENSE](LICENSE)) is based on the PLEML editor of MBSE4U.
- At runtime it loads the sysmlv2 engine (`@sysml/wasm`, Apache License 2.0, Open-MBEE) with the SysML v2 standard library (Eclipse Public License 2.0). Neither is redistributed in this repository; `vendor/` is not committed.
- The standalone file (`dist/mbse-methodology-editor.html`) contains both. It carries their license texts and notices (`LICENSE`, `LICENSE-EPL-2.0` and `THIRD-PARTY-NOTICES.md` of the package) in a comment at the top of the file, so pass the file on unchanged.
