# SYSMOD v5 Library for SysML v2

SysML v2 library implementing the [SYSMOD methodology](https://mbse4u.com/sysmod) for Model-Based Systems Engineering (MBSE).

## What's in the Library

The library provides ready-to-use SysML v2 definitions for the core SYSMOD concepts:

- **Project** — Root container linking all engineering artifacts (brownfield context, stakeholders, problem statement, system idea, requirements, solution, functional/logical/product architecture)
- **System Context** — Actors, system of interest (black box + white box), actor–system interfaces, and use cases
- **Stakeholders** — `ExtendedStakeholder` with risk/effort/priority attributes and stakeholder categories
- **Requirements** — `ExtendedRequirement` with obligation, stability, and motivation attributes
- **SYSMOD-specific keywords** — Shorthand keywords (`#project`, `#systemContext`, `#extendedStakeholder`, …) for cleaner model notation
- **AI metadata** — Built-in prompts and questions for AI-assisted model creation

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
SYSMOD.sysml                  # The SYSMOD library
examples/
  DeliveryDrone-Model.sysml   # Example model
  DeliveryDrone-StakeholderPriorityMap.svg
```

## Contributing

Contributions are welcome — please submit issues or pull requests.

## License

Copyright MBSE4U, Tim Weilkiens
Apache License 2.0 — see [LICENSE](LICENSE) for details.

## Contact

For feedback or questions: [tim@mbse4u.com](mailto:tim@mbse4u.com)
