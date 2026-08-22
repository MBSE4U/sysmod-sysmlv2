# Change Log

## v5.1.1

- Fixed inconsistent "solution" terminology in SYSMOD.sysml doc comments and AI metadata prompts, correcting references to match the actual specificationContext/specificationContextImpl concepts.
- Removed references to the non-existent solutionContext/solutionContextImpl concepts from the project AI metadata's structure and validation checks; productContext now specializes specificationContextImpl directly.
- Fixed the RequirementBoilderplates MinValue constraint, which had its comparison operands reversed (`minValue > currentValue`) so it required the opposite of a lower bound; it now correctly requires `currentValue > minValue`.
- Fixed the RequirementBoilderplates MinAvailability requirement's minAvailability attribute, which was typed as ISQ::duration; it is now a dimensionless ScalarValues::Real ratio, consistent with the uptime/totalTime constraint.
- Added web page https://sysmod.org to the SYSMOD repository
- Updated example model: PRJ::stakeholderNeeds::problemStatement redefines the inherited problemStatement and subsets PRJ::problemStatement.
- Updated example model: PRJ::deliveryDroneSystemIdeaContextImpl satisfies PRJ::problemStatement.
- Added Cameo Systems Modeler file for the example model.
- Added preconditions and postconditions to the SYSMOD UseCase concept.
- Added library with RequirementBoilerplates
- Updated example model: DeliveryDroneSystemRequirements now declares its own subject and stakeholder (projectOwner); DeliveryDroneSystemProject redefines both accordingly.
- Updated example model: added Recipient and Regulator stakeholders to DeliveryDroneSystemStakeholders and DeliveryDroneSystemProject, so the four stakeholders match the sysmod.org story.
- Added a "SYSMOD Steps" navigation menu to sysmod.org's header, for jumping directly to any step.
- Added the SYSMOD products overview image to the "About SYSMOD" page on sysmod.org, with clickable step cards that jump directly to the corresponding SYSMOD step.
- Added two validation checks to the SYSMOD library's productContextAI metadata (SYSMOD.sysml), covering MOSA-conformant port/interface-only dependencies between product components and complete interface specification.
- Added a link to the SYSMOD Sysand project to README.md.
- Extracted the SYSMOD UseCase's precondition/postcondition mechanism into a new, reusable ConstrainedOccurrence library concept, which SystemUseCase now specializes.
