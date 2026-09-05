# SYSMOD v5 Library for SysML v2

SysML v2 library implementing the [SYSMOD methodology](https://mbse4u.com/sysmod) for Model-Based Systems Engineering (MBSE).

Source: [github.com/mbse4u/sysmod-sysmlv2](https://github.com/mbse4u/sysmod-sysmlv2)

Sysand project: [sysand.com/projects/mbse4u/sysmod](https://sysand.com/projects/mbse4u/sysmod/) — Sysand is a package registry for publishing, versioning, and discovering reusable SysML v2 libraries.

## What's in the Library

The library provides ready-to-use SysML v2 definitions for the core SYSMOD concepts:

- **Project** — Root container linking all engineering artifacts (brownfield context, stakeholders, problem statement, system idea, requirements, solution, functional/logical/product architecture, sub-projects)
- **Brownfield, System Idea, Specification & Solution Contexts** — Chained black-box/white-box (`soi`/`soiImpl`) refinement contexts from the existing system through the system idea and specification to the solution
- **System Context** — Actors, system of interest (black box + white box), actor–system interfaces, and use cases
- **Stakeholders** — `ExtendedStakeholder` with risk/effort/priority attributes and stakeholder categories
- **Problem Statement & Stakeholder Needs** — `ExtendedConcern`-based artifacts framing the problem and stakeholder intent, traced through to requirements
- **Requirements** — `ExtendedRequirement` with obligation, stability, and motivation attributes
- **Requirement Boilerplates** — `SYSMODRequirementBoilerplates` package (top-level, alongside `SYSMOD`) of ready-to-specialize quantitative requirement patterns (`MaxValue`, `MinValue`, `RangeValue`, `ExactValue`, `ToleranceValue`, `MinAvailability`, `MinReliability`)
- **Use Cases** — `SystemUseCase` with motivation, trigger, and result attributes
- **Functional, Logical & Product Architecture** — Optional solution architecture contexts, connected by `functional2logical` and `logical2product` allocations
- **Sub-Projects** — Derived `subProjects` list for decomposing a project into subsystem or component projects
- **SYSMOD-specific keywords** — Shorthand keywords (`#project`, `#systemContext`, `#extendedStakeholder`, `#extendedConcern`, `#extendedRequirement`, `#systemUseCase`) for cleaner model notation
- **AI metadata** — `AIProject` with built-in `create_prompt`, `create_questions`, and `validation_prompt` for AI-assisted creation and validation, chained across all artifacts

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

## Repository Structure

```
SYSMOD.sysml                                        # The SYSMOD library
examples/                                           # Delivery Drone example model
  DeliveryDroneSystemProject.sysml                  # Project definition tying all artifacts together
  DeliveryDroneSystemStakeholders.sysml             # Stakeholders and stakeholder needs
  DeliveryDroneSystemBrownfieldArchitecture.sysml   # Brownfield context (black box + white box)
  DeliveryDroneSystemIdea.sysml                     # System idea context
  DeliveryDroneSystemSpecification.sysml            # Specification context, use cases, requirements
  DeliveryDroneSystemFunctionalArchitecture.sysml   # Functional architecture
  DeliveryDroneSystemLogicalArchitecture.sysml      # Logical architecture
  DeliveryDroneSystemProductArchitecture.sysml      # Product architecture and verification
  DeliveryDroneSystemControlStationProject.sysml    # Control station sub-project
  DeliveryDroneSystemDomainLibrary.sysml            # Shared domain entities for the sub-project
```

## Contributing

Contributions are welcome — please submit issues or pull requests.

## License

- Copyright MBSE4U, Tim Weilkiens
- Apache License 2.0 — see [LICENSE](LICENSE) for details.

## Contact

For feedback or questions: [tim@mbse4u.com](mailto:tim@mbse4u.com)
