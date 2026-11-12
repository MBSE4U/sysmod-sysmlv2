# MBSE Methodology Editor

A web-based editor for **MBSE environments** ([MBSEMethodology](../MBSEMethodology.sysml): tools, roles, methodology with its processes and methods, products) and their **Digital Thread Flow Analyses** (DTFA, library [DTFA](../DTFA.sysml)) in SysML v2 textual notation. The DTFA brings back the flow in the digital thread: it maps how the products of the methods flow between the tools and roles of an environment, rates the transitions between the tools, finds the bottlenecks and plans measures. It is based on the EEE Check by oose and Willert ([eee-check.de](https://eee-check.de/)). The MBSE environment is the anchor point: a flow analysis is an analysis of the environment, and the tool policy is a set of rated facilitates connections of the environment. The editor runs entirely in the browser: the [sysmlv2](https://github.com/Open-MBEE/sysml-toolkit) WebAssembly engine of Open-MBEE parses and checks the model locally, and nothing is uploaded to a server.

The editor follows the concepts of the [PLEML editor](https://github.com/MBSE4U/PLEML/tree/main/editor): the `.sysml` text is the source of truth, a domain model is built from what the SysML engine reports, and graphical and form editors change the text through undoable commands. Version 1 creates, reads and writes `.sysml` files. The architecture is prepared for a later version that works on a model in a SysML v2 API (Systems Modeling API) repository.

## Six editors on one model

The editor offers seven views of the same model, switched with **Environment | Matrix | Step definition | Tool policy | Process | Form | Text**. They share one selection, and every change is saved to the `.sysml` text.

**The DTFA in SysML.** The DTFA reuses MBSEMethodology and adds only what the analysis needs:
- a **process step** is a method of the methodology of the environment that a role performs with a tool: its primary performer (`primaryPerformer`) is the row, its facilitation tool (`facilitationTools`) the column, its inputs and outputs are its source and target products. A team environment performs the methods of the company methodology by redefining them, e.g. `part :>> companyMethodology { action :>> sysmodArchitecture { :>> primaryPerformer = systemArchitect; :>> facilitationTools = modelingTool; :>> inputs = requirementsSpecification; } }`
- a **hand-over** is derived: a product that one step produces and another one needs
- the **flow analysis** is an analysis case of the environment (`analysis flowAnalysis : DigitalThreadFlowAnalysis :> analyses`). It owns the rated **tool transitions** (`connection requirementsToModel : ToolTransition connect requirementsTool to modelingTool { :>> rating = TransitionRating::bottleneck; :>> priority = 1; }`) and the **measures**. A tool transition rates the hand-overs from its source to its target tool (or only those of its `products`); a transition from a tool to itself rates the hand-overs between roles that use the same tool
- the **step definition** of a method is the metadata `@stepDefinition : StepDefinition { :>> goal = "..."; :>> viewpoints = (...); :>> automationSteps = ...; }`
- a **tool policy rule** is a facilitates connection with a status: `connection modelingForArchitecture : ToolPolicyRule connect modelingTool to companyMethodology.sysmodArchitecture { :>> status = PolicyStatus::recommended; }`. The rules of an environment apply to the environments that specialize it; a rule of a more specific environment overrides them

**Environment.** An MBSE environment (`MBSEMethodology::MBSEEnvironment`), shown as **Cards** or as a **Diagram** (switch in the toolbar):
- its roles, tools, methodology (processes and methods, as a tree, with their performers and tools) and products, including those inherited from the environments it specializes ("from CompanyEnvironment"), with the number of process steps that use them
- its flow analyses and its tool policy
- the diagram shows the environment with a specialization arrow to the environments it specializes, its roles and tools (left), its methodology as a tree of processes and methods (center) and its products (right). Edges connect roles and tools to the methods they perform and facilitate as the methodology declares them (`primaryPerformer`, `additionalPerformers`, `facilitationTools`, ResponsibleFor, Supports and Facilitates connections), and the methods to the products they need and produce. Inherited elements have a dashed border. Checkboxes hide edge kinds; a click on an element opens its editor
- a click on a section header (**Roles**, **Tools**, **Methodology**, **Products**) in the cards, the diagram or the outline opens the editor of that section in the Form view: a table of the existing elements, own and inherited (shaded), with their general types, usage and description (for the methodology: the tree of processes and methods with their declared performers and tools), and the button to create a new one
- **Editing:** add roles, tools, methods (into the methodology of the environment) and products, to the environment or to one of the environments it specializes; add a flow analysis or a tool policy rule; add an environment that specializes it, e.g. for a team

**Matrix (DTFA Steps #1 and #2).** The Tools Roles Methods Matrix of a flow analysis:
- The roles of the analyzed MBSE environment are the rows, its tools the columns. The process steps are boxes in the cells, with the products they produce.
- Hand-overs are arrows between the process steps. A change of the column is a tool break, a change of the row a human interface.
- The rating of the tool transition colors the arrows: bottleneck (red, with the priority in a circle), efficient (green), not rated (gray, dashed). Steps at a bottleneck have a red outline.
- A red corner marks a step whose tool the tool policy forbids for its method; a green dot counts the measures of its tool transitions.
- **Editing:**
  - double-click an empty cell to add a process step with that role and tool: a method of the methodology that the environment does not perform yet, or a new one
  - drag a step to another cell to change its role and tool
  - select a step, press **→ Connect** (or C), then click the next step to hand over a product (an existing one or a new one): it becomes an output of the first and an input of the second method
  - select a hand-over to rate its tool transition (**Not rated / Efficient / Bottleneck**), to set the priority of a bottleneck and to explain the rating (**Explanation**, also in the form and in the tooltip of the arrow). The first rating creates the tool transition between the tools of the two steps
  - F2 renames, Del deletes (for a hand-over: removes the product from the inputs of the second step)
  - an inherited method (of the company methodology or of a library methodology) is changed by redefining it in the environment of the analysis
- Pan with the mouse, zoom with the wheel or the buttons, and press Fit to show everything.

**Step definition (DTFA Steps #3 and #4).** The step definitions of the process steps:
- The swimlanes are rows: goal, source products, viewpoints, automation steps and target products.
- For a selected hand-over, the step that hands over and the step that takes over are side by side. Products produced by the first step and needed by the second one are marked as handed over (⇄); below them are the conversions of the tool transition.
- Add and remove entries in each swimlane; new products can be created on the way.
- Below the swimlanes: the measures that address the tool transitions of the steps.

**Tool policy.** The tool policy of an MBSE environment: methods (rows) and tools (columns). Click a cell to cycle its status: none → recommended → allowed → forbidden → none; the editor writes a tool policy rule into the selected environment. Rules of the environments it specializes are shaded; a rule of the selected environment overrides them. A dot marks combinations that process steps of the flow analyses use; a used, forbidden combination is outlined in red and reported as a finding of the analysis.

**Process.** The flow of a process (or of a method with steps) as a swimlane diagram: the steps, owned and inherited, from the start (filled circle) along the successions (`first a then b`) to the end (ringed circle), top to bottom; steps without a succession (e.g. `specifyTradeStudy`) at the bottom. The lanes are the responsible performers of the steps: in an MBSE environment its roles, otherwise the performers that the process declares (e.g. `systemArchitect : SystemArchitect`); steps without one are in the lane of the performer of the process. A ▸ marks a step with steps of its own: double-click it to show its flow, and go back with the path in the toolbar. A click selects a step, a double-click on a step without steps opens its form. A process opens in this view; **Open form** and **Open diagram** switch between the form and the diagram. The wheel scrolls, Ctrl+wheel zooms. The view follows the document selected in the **Documents** or **Libraries** panel: a document with exactly one process shows its flow, otherwise an overview of all its processes and methods as cards grouped by package, with the number of steps and the responsible performer (e.g. the 30 processes of `ISO15288Processes`). A click on a card selects it, a double-click shows its flow (▸ has steps) or opens its form; the **Process** select lists "All processes of" the document, its processes and the other processes with steps. Links in the toolbar of the overview open the roles, tools and products of the document in the document editor.

**Document editor.** A click on a document in the Documents or Libraries panel opens its document editor: tables of its MBSE environments, flow analyses, processes, methods, roles, tools, products and tool policy rules, with a bar of section links at the top. The Model panel shows the methodology elements of the selected document that are not part of an MBSE environment as a tree (Processes, Methods, Roles, Tools, Products; groups with more than 20 elements start collapsed): a click on an element opens its form, a click on a group the section of the document editor. The form of a process or method links its inputs and outputs to their products; the form of a product lists the processes and methods it is an **Output of** and an **Input of**. Stakeholders of concerns and requirements (e.g. `stakeholder acquirer : Acquirer`) are not counted as roles.

**Form.** A form for the selected element:
- **Flow analysis:** the progress of the four DTFA steps, counts of tool breaks and human interfaces, the bottlenecks by priority with their hand-overs and measures, and the findings per DTFA step
- **Method:** as a process step of each analysis: role and tool, the tool policy status, the step definition and the hand-overs; the performers that the methodology declares; the tool policy rules
- **Hand-over:** the two steps, the products, the kind, the rating of its tool transition, the conversions and the measures
- **Tool transition:** tools, products, rating, priority, explanation, conversions, the hand-overs it rates and the measures
- **Role, tool, process, product:** description and where it is used
  - a role shows the methods and processes that the methodology declares for it (**Responsible for**, **Supports**), a tool those it facilitates, and a method or process its declared performers and tools
  - **Specializes** lists the general types of the element, e.g. `ISO15288Processes::Stakeholders::SystemArchitect` for `part systemArchitect : SystemArchitect`
- **Measure:** description and addressed tool transitions
- **Tool policy rule:** tool, method and status

**Specializations.** The editor follows every specialization relationship (typing, subclassification, subsetting, redefinition), for every kind of element:
- an element inherits the description of its general types as long as it has no doc of its own (shown as "Inherited from …")
- a role performs the behaviors that the methodology declares for its general types, e.g. the Delivery Drone `systemArchitect : SystemArchitect` is responsible for the SYSMOD steps that `SYSMODDefaultProcess` assigns to `SystemArchitect` with `connection :> responsibleFor connect systemArchitect to modelBrownfieldSystem` (also anonymous connections, and `primaryPerformer`, `additionalPerformers`, `facilitationTools` features)
- environments, methodologies, processes and methods inherit the features of their general types, e.g. the steps of a library process that the process of an environment does not redefine (dashed in the diagram); a method that redefines another one (e.g. the team's performance of a company method) takes its place
- elements declared in a library are read-only; specialize them to change them

**Text.** The SysML v2 textual notation, with syntax highlighting, line numbers, auto-indent and snippets for the DTFA elements (Insert menu).

Commands from the graphical and form editors are single undoable steps (**Undo / Redo**, Ctrl+Z / Ctrl+Y outside the text editor). Renaming an element also renames the references to it in its package and qualified references in your other open documents. Deleting an element also removes the references to it, e.g. a deleted product from the inputs and outputs of the methods.

## Files and checks

- **Create** a new MBSE environment with process steps, a flow analysis and a tool policy rule from a template, or an empty SysML v2 file (File ▸ New).
- **Open a folder** (File ▸ Open folder…, Ctrl+Shift+O): the editor opens all `.sysml` and `.kerml` files of the folder in place of the open documents and checks them together. Files in subfolders are not opened. Save writes back to the files; a new document is saved into the folder. **Reload** in the Documents panel reads the folder again. In browsers without the File System Access API (e.g. Firefox), the folder is read with a file input and Save downloads the files.
- **Close** (File ▸ Close) closes all opened documents and the opened folder, after asking about unsaved changes; only the read-only libraries remain. The × of a tab closes one document.
- **Libraries:** the libraries of this repository (shown in their own collapsible **Libraries** area below the documents) (MBSEMethodology, DTFA, ISO15288Processes and the SYSMOD libraries) are always part of the model and read-only. Copies of them in an opened folder (e.g. when you open the repository itself) are not opened. The smoke test checks that the editor includes every `.sysml` file of the repository root.
- **Document editor:** a click on a document in the Documents panel (outside the Text view) opens its editor in the Form view: its MBSE environments, flow analyses, processes, methods, roles, tools, products and tool policy rules, also when they are definitions (e.g. the 30 processes and the stakeholder roles of `ISO15288Processes`, or `SYSMODDefaultProcess`). Each opens its own editor; a process or method shows its steps (owned and inherited), its declared performers and tools, its inputs and outputs, and the elements that specialize it. Opening a library document lists its elements, read-only. Without documents of your own, the editor starts with the libraries only; open files, a folder or an example, or create a new environment (File ▸ New).
- **Read** single `.sysml` files from your computer (File ▸ Open files…, several at once), or open the examples of this repository: the flow analysis of the control unit team, and the SYSMOD Delivery Drone project with its MBSE environment.
- **References:** the editor writes the values of the methods, the tool transitions, the measures and the tool policy rules into the environment, where the roles, tools, products and methods of the environment and of the environments it specializes are visible by their names, e.g. `:>> primaryPerformer = systemArchitect;`. A tool policy rule refers to its method with a feature chain from the environment, e.g. `companyMethodology.sysmodArchitecture`. The engine resolves an inherited element to its declaration, so the company environment's tools are the same elements in every team environment that specializes it.
- **Write** back to the opened file (Chrome and Edge, via the File System Access API), or save as a download in other browsers.
- **SysML check (sysmlv2 engine):** all open documents are parsed and checked together with the libraries of this repository (MBSEMethodology, DTFA, ISO15288Processes, SYSMOD, ...) and the SysML v2 standard library: syntax, name resolution and semantic rules. Findings appear in the Problems panel and are marked in the text. A document with a syntax error is repaired for the model, leaving out the broken member, so the views keep working while you type.
- **DTFA check (the editor):** the editor evaluates the DTFA on the model: the kind of each hand-over, the progress of the four DTFA steps, and findings such as unrated hand-overs, bottlenecks without priority, steps at bottlenecks without a goal, bottlenecks without measures, steps without role or tool, and steps that use a tool the tool policy forbids for their method. The result appears in the matrix and the form; it is not a SysML-level verification.
- **Drafts:** open documents are kept in the browser's local storage, so they survive a reload. Files remain the source of truth.

## Run

**Without a web server:** double-click `dist/mbse-methodology-editor.html` (Chrome or Edge). It is a single, self-contained HTML file and needs no network access, because it contains:
- the editor code and styles
- the SysML engine with the prepared SysML v2 standard library, checked against the hashes in `src/config.js` at build time and again in the browser
- the libraries of this repository (MBSEMethodology, DTFA, ISO15288Processes, SYSMOD, ...) and the examples
- the license texts

Opening `index.html` as a file forwards to this standalone file, because browsers do not run module workers from `file://` URLs. The file is versioned in the repository, so it is available after a clone. Saving back to the opened `.sysml` files works in Chrome and Edge, as in the served editor; drafts are kept in the browser's local storage.

**Rebuild the standalone file** after changing the editor, the libraries or the examples, because it embeds them:

```bash
node tools/fetch-engine.mjs         # once: downloads the engine into vendor/
node tools/build-standalone.mjs     # writes dist/mbse-methodology-editor.html (about 17 MB)
```

The build takes the engine from the local copy in `vendor/` if present, and downloads it from the GitHub release otherwise. It reads the libraries and the examples from the repository: the parent directory, or a directory given with `--repo <dir>`. If it finds none, it downloads them from GitHub. Use `--out <file>` to change the output file.

**With a web server** (for development, it loads the sources and the libraries directly):

```bash
npx http-server .. -p 8080         # serve the repository root, then open http://localhost:8080/editor/
```

The served editor loads the libraries (`../MBSEMethodology.sysml`, `../DTFA.sysml`, `../SYSMOD.sysml`, ...) and the examples from `../examples/`. Otherwise, it loads the libraries from GitHub (via jsDelivr, branch `main`), and the Examples menu is not available.

### The SysML engine

The editor checks the model with **sysmlv2** 0.12.0, the SysML v2 toolkit of Open-MBEE ([sysml-toolkit](https://github.com/Open-MBEE/sysml-toolkit), crate `sysmlv2-wasm`), compiled to WebAssembly. It runs in a Web Worker, so typing stays responsive. Your model is not uploaded. Engine loading, integrity checks and the standalone embedding work as in the [PLEML editor](https://github.com/MBSE4U/PLEML-editor).

Unresolved references (e.g. to a deleted element) are reported by the engine as warnings.

## Architecture

```
       ┌──────────────────────────────── views (src/ui) ─────────────────────────────────┐
       │ EnvironmentView MatrixView StepDefinitionView PolicyView FormView CodeEditor ... │
       └──────────────────┬──────────────────────────────────────────┬───────────────────┘
                          │ domain model + DTFA analysis             │ commands
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
| Domain | `src/dtfa/model.js` | Domain model: `MBSEEnvironment` and its `Role`, `Tool`, `Process`, `Method` and `Artifact` (products) from MBSEMethodology; `FlowAnalysis`, `ToolTransition`, `Measure` and `ToolPolicyRule` from the DTFA; the derived process steps (`Step`) and hand-overs (`Handover`) of each analysis. Environment scopes (an environment and those it specializes) and the methodology tree give the matrix axes, the process steps and the tool policy. The views know only this model, not where it comes from. |
| Model building | `src/dtfa/DtfaModelBuilder.js` | Recognizes the elements in the engine's symbols by their conformance to the DTFA and MBSEMethodology definitions (e.g. `part matlab :> tools` conforms to `MBSEMethodology::Tool`) and their metaclass, reads the values (performers, tools, inputs, outputs, step definitions, ratings, statuses) from the evaluated feature values and the connector ends, and derives the process steps and hand-overs. |
| DTFA analysis | `src/dtfa/DtfaAnalyzer.js` | Kind of each hand-over (tool break, human interface), progress of the four DTFA steps, findings, and the findings of the tool policy. |
| Behavior edits | `src/dtfa/edits.js` | Changes of the methods as an environment performs them: in place if the environment declares the method, otherwise as a redefinition in the environment (`part :>> companyMethodology { action :>> m { ... } }`). |
| Views | `src/ui/` | `EnvironmentView` and `EnvironmentDiagram` (MBSE environment), `MatrixView` (Tools Roles Methods Matrix), `StepDefinitionView` (step definitions), `PolicyView` (tool policy), `FormView`, `CodeEditor`, `ModelOutlineView` (outline of environments with their analyses and rules), `ProblemsView`, `FormDialog`. The views emit `select` and `command` events; `App` executes the commands with the model editor and keeps the undo history. |
| Engine | `src/engine/` | `engine-core.js` calls the sysmlv2 module. Compared with the PLEML editor, it reports for each symbol the given language types it conforms to (`types`), its general types (`generalIds`), its inherited features (`inheritedIds`), its evaluated feature value (`value`, `valueText`), the feature a connector end references (`referencedId`) and its doc comments; anonymous connections get ids of their own. `SysmlEngine` runs it in a Web Worker. |
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
- The standalone file (`dist/mbse-methodology-editor.html`, versioned) contains both. It carries their license texts and notices (`LICENSE`, `LICENSE-EPL-2.0` and `THIRD-PARTY-NOTICES.md` of the package) in a comment at the top of the file, so pass the file on unchanged.
