# SYSMOD v5 Library for SysML v2

SysML v2 library implementing the [SYSMOD methodology](https://mbse4u.com/sysmod) for Model-Based Systems Engineering (MBSE).

Documentation: [sysmod.org](https://sysmod.org) — the SYSMOD documentation website, maintained by [mbse4u.com](https://mbse4u.com) and no longer part of this repository.

Source: [github.com/mbse4u/sysmod-sysmlv2](https://github.com/mbse4u/sysmod-sysmlv2)

Sysand project: [sysand.com/projects/mbse4u/sysmod](https://sysand.com/projects/mbse4u/sysmod/) — Sysand is a package registry for publishing, versioning, and discovering reusable SysML v2 libraries.

## What's in the Library

The library provides ready-to-use SysML v2 definitions for the core SYSMOD concepts:

- **Project** — Root container linking all engineering artifacts (brownfield context, stakeholders, problem statement, system idea, system objectives, requirements, functional/logical/product architecture, verification context, sub-projects)
- **Brownfield, System Idea & Specification Contexts** — Chained black box/white box (`soi`/`soiImpl`) refinement contexts from the existing system through the system idea to the specification, which the functional, logical, and product architectures then specialize
- **System Context** — Actors, system of interest (black box + white box), actor–system interfaces, and use cases
- **Stakeholders** — `ExtendedStakeholder` with risk/effort/priority attributes and stakeholder categories
- **Problem Statement, Stakeholder Needs & System Objectives** — `ExtendedConcern`-based artifacts framing the problem, the stakeholder intent, and the measurable goals of the system idea (`systemObjectives`, framing the stakeholder needs), traced through to requirements
- **Requirements** — `ExtendedRequirement` with obligation, stability, and motivation attributes
- **Requirement Boilerplates** — `SYSMODRequirementsBoilerplates` package (top-level library package, own file) of ready-to-specialize quantitative requirement patterns (`MaxValue`, `MinValue`, `RangeValue`, `ExactValue`, `ToleranceValue`, `MinAvailability`, `MinReliability`)
- **Use Cases** — `SystemUseCase` with motivation, trigger, and result attributes, plus the specializations `SecondaryUseCase`, `SystemProcess`, and `ContinuousUseCase`
- **Functional, Logical & Product Architecture** — Architecture contexts (functional and logical optional) with the same black box/white box (`soi`/`soiImpl`) separation: each black box context specializes the specification context, each white box context (`…ContextImpl`) specializes its black box context, and the logical and product ones also the white box specification context (the functional architecture stays independent of the physical internal structure); connected by `functional2logical` and `logical2product` allocations and their white box counterparts `functionalImpl2logicalImpl` and `logicalImpl2productImpl`, which the logical and the product architecture steps create
- **Verification** — `verificationContext` specializes the white box product context, adds the test systems as actors (e.g., a test bench or a wind tunnel), and owns the `verificationCases` that verify and validate the product system
- **Sub-Projects** — `subProjects` list, subsetted by each sub-project usage, for decomposing a project into subsystem or component projects
- **SYSMOD Process** — `SYSMODProcesses` package with `SYSMODDefaultProcess`, the default SYSMOD workflow performed by every project as `Project::defaultProcess`. One action definition per step (`SetupProject`, `ModelBrownfieldSystem`, `DescribeProblemStatement`, `IdentifyStakeholders`, `IdentifyStakeholderNeeds`, `DescribeSystemIdea`, `SpecifySystem`, `ModelFunctionalArchitecture`, `ModelLogicalArchitecture`, `ModelProductArchitecture`, `SpecifyVerificationContext`) whose outputs flow into the project's artifacts. Each step carries `StepStatus` metadata (status and percentage) and refines one or more ISO/IEC/IEEE 15288 processes, which the `ISO15288Processes` package defines as action definitions
- **ISO/IEC/IEEE 15288 Processes, Stakeholders & Concerns** — `ISO15288Processes` package (top-level library package, own file `SYSMOD15288.sysml`) with the 30 system life cycle processes as action definitions, the subpackage `Stakeholders` with the stakeholder roles derived from the processes (e.g., `ProductManager`, `SystemArchitect`), and the subpackage `Concerns` with their concerns. `SYSMOD` refines the processes with its steps, and `SYSMODViews` frames the concerns with its viewpoints
- **Views** — `SYSMODViews` package (top-level, own file), the SYSMOD architecture description framework according to ISO/IEC/IEEE 42010: viewpoints framing the concerns of the stakeholder roles from `ISO15288Processes`, and view definitions for the SYSMOD steps, including AI renderings (e.g., `ProjectAIView`, `AIUseCase4ManagersView`) and the SYSMOD Map (`SYSMODMapView`), which shows all Project features on one sheet with grid references. The library defines the views; a project instantiates them as view usages, e.g., `projectCoverView` and `problemStatementView` in the Delivery Drone example. The `#viewedArtifact` dependencies name the Project artifacts each view shows; from them and the inputs and outputs of the SYSMOD steps, the documentation derives which views build on which other views (correspondences in the sense of ISO/IEC/IEEE 42010). See the generated documentation [SYSMODViews.md](SYSMODViews.md)
- **SYSMOD-specific keywords** — Shorthand keywords (`#project`, `#systemContext`, `#extendedStakeholder`, `#extendedConcern`, `#extendedRequirement`, `#systemUseCase`, `#secondaryUseCase`, `#systemProcess`, `#continuousUseCase`, plus the actor tags `#system`, `#user`, `#externalSystem`, `#environmentalEffect`) for cleaner model notation
- **AI metadata** — `SYSMOD4AI` package (top-level, own file, imports `SYSMOD`) providing `AIProject`, a template of AI metadata usages — one per main artifact plus a stakeholder priority map — each carrying `create_prompt`, `create_questions`, `validation_prompt`, and ready-to-run `perform_prompt`, `story_prompt`, and `slide_prompt` prompts, chained across all artifacts

## Getting Started

Import the library into your SysML v2 model:

```sysml
package MyProject {
    private import SYSMOD::*;

    #project occurrence def <PRJ> MyProject {
        // redefine inherited parts to specialize for your project
    }
}
```

For AI-assisted creation and validation, additionally import `SYSMOD4AI` and apply `AIProject`'s AI metadata usages (e.g. `AIProject::problemStatementAI`) to the identically-named/-roled feature on your own project.

## AI Quick Start

You don't need a special plugin or skill to use SYSMOD with an AI assistant. The prompts are part of the library: every main artifact of a project carries AI metadata in `SYSMOD4AI.sysml` with questions to ask, instructions to create the artifact, and rules to validate it. `AIProject::defaultProcessAI` walks you through the whole SYSMOD process step by step and uses the AI metadata of each artifact on the way.

Give an AI assistant that can read GitHub repositories the following prompt and answer its questions:

```text
Perform the prompts in AIProject::defaultProcessAI in the file SYSMOD4AI.sysml of the GitHub repository MBSE4U/sysmod-sysmlv2 (branch main), which is based on the SYSMOD methodology in the file SYSMOD.sysml of the same repository.
```

Each AI metadata usage also has a `story_prompt` and a `slide_prompt` that explain the model in plain language for stakeholders who don't read SysML. For example, once the assistant has created a model of a camera drone:

```text
Create a PowerPoint slide deck of the camera drone using the story and slide prompts in SYSMOD4AI, telling the whole story of the system by walking through SYSMOD. The target audience is clients.
```

## Repository Structure

```
SYSMOD.sysml                                        # The core SYSMOD library
SYSMOD4AI.sysml                                     # AI-assisted extension (AI metadata, AIProject) — imports SYSMOD
SYSMODRequirementsBoilerPlates.sysml                # Reusable quantitative requirement patterns (MaxValue, MinValue, ...)
SYSMOD15288.sysml                                   # ISO/IEC/IEEE 15288 processes with their stakeholders and concerns
SYSMODViews.sysml                                   # Viewpoints and views (ISO/IEC/IEEE 42010)
SYSMODViews.md                                      # Generated, read-only documentation of SYSMODViews.sysml
scripts/generate_views_doc.py                       # Generates SYSMODViews.md (run after changing the library)
examples/                                           # Delivery Drone example model
  DeliveryDroneSystemProject.sysml                  # Project definition tying all artifacts together
  DeliveryDroneSystemStakeholders.sysml             # Stakeholders and stakeholder needs
  DeliveryDroneSystemBrownfieldArchitecture.sysml   # Brownfield context (black box + white box)
  DeliveryDroneSystemIdea.sysml                     # System idea context
  DeliveryDroneSystemSpecification.sysml            # Specification context, use cases, requirements
  DeliveryDroneSystemFunctionalArchitecture.sysml   # Functional architecture
  DeliveryDroneSystemLogicalArchitecture.sysml      # Logical architecture
  DeliveryDroneSystemProductArchitecture.sysml      # Product architecture, verification context and cases
  DeliveryDroneSystemControlStationProject.sysml    # Control station sub-project
  DeliveryDroneSystemDomainLibrary.sysml            # Shared domain items (orders, parcels, energy, ...)
  views/                                            # Example renderings of the SYSMOD views (SVG)
  microstories/                                     # The SysML v2 snippets of the SYSMOD MicroStories (one file per story)
```

## Views Documentation

[SYSMODViews.md](SYSMODViews.md) documents the `ISO15288Processes` and `SYSMODViews` libraries: the ISO/IEC/IEEE 15288 processes, stakeholders, concerns, viewpoints, and views with their traceability and an example of each view. The file is read-only and generated from the library. After changing `SYSMOD15288.sysml`, `SYSMODViews.sysml`, `SYSMOD.sysml`, or the example views, regenerate it:

```text
python scripts/generate_views_doc.py
```

The GitHub workflow `views-doc.yml` also regenerates and commits it on every push that changes these files.

## Contributing

Contributions are welcome — please submit issues or pull requests.

## License

- Copyright MBSE4U, Tim Weilkiens
- Apache License 2.0 — see [LICENSE](LICENSE) for details.

## Contact

For feedback or questions: [tim@mbse4u.com](mailto:tim@mbse4u.com)
