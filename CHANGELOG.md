# Change Log

## v5.1.3

- Split the `AI` metadata definition and `AIProject` out of `SYSMOD.sysml` into a new top-level package, `SYSMOD4AI` (file `SYSMOD4AI.sysml`), which privately imports `SYSMOD`. Import it in addition to `SYSMOD` only where AI-assisted workflows are wanted — the core methodology library no longer carries any AI-specific content.
- Moved and renamed the boilerplate requirements package to `SYSMODRequirementsBoilerplates` (file `SYSMODRequirementsBoilerPlates.sysml`): it is now a top-level library package alongside `SYSMOD` and `SYSMOD4AI` (previously nested inside `SYSMOD`), and the name's spelling is corrected. Update any qualified references from `SYSMOD::RequirementBoilderplates` to `SYSMODRequirementsBoilerplates`.
- Updated the sysmod.org documentation deck's "Full SYSMOD Library" appendix to show `SYSMOD`, `SYSMOD4AI`, and `SYSMODRequirementsBoilerplates` as the three separate packages they now are, instead of one monolithic package.
- Updated the deck's `AI` metadata definition and per-step AI prompts to match the library: all seven `AI` attributes are now shown (including `perform_prompt`, `story_prompt`, `slide_prompt`), the `sysmod-stakeholder-priority-map` skill is now documented, and the deck's own copies of the v5.1.2 `MinValue`/`MinAvailability` fixes and the boilerplates renaming — which had not been carried over from the library into the documentation — are now consistent with it.
- Renamed the deck's "Solution System Architectures" step to "Functional, Logical, Product Architecture" and removed the last `sysmod-solution-context` / "solution architecture" leftovers from its text, matching the library's actual functional/logical/product structure.
- Added a `doc` comment with explicit "When to use" / "When not to use" sections to all 14 AI metadata usages in `SYSMOD4AI.sysml` (`projectAI`, `projectOwnerAI`, `brownfieldContextAI`, `problemStatementAI`, `projectStakeholdersAI`, `stakeholderPriorityMapAI`, `stakeholderNeedsAI`, `systemIdeaContextAI`, `specificationContextAI`, `systemRequirementSpecificationAI`, `functionalContextAI`, `logicalContextAI`, `productContextAI`, `subProjectsAI`), written in the style of an AI-assistant skill's trigger/skip conditions and cross-referencing the adjacent skill to use instead where scopes could overlap. This paves the way for generating Claude Skills (or equivalent skill definitions for other LLM platforms) directly from these elements.
- Synced the sysmod.org deck's "Full SYSMOD Library" appendix with the new "When to use" / "When not to use" doc comments on all 14 AI metadata usages, and noted the convention in the `AI` metadata definition's own doc and in the "About the AI Skill Layer" intro slide.

## v5.1.2

- Fixed inconsistent "solution" terminology in SYSMOD.sysml doc comments and AI metadata prompts, correcting references to match the actual specificationContext/specificationContextImpl concepts.
- Removed references to the non-existent solutionContext/solutionContextImpl concepts from the project AI metadata's structure and validation checks; productContext now specializes specificationContextImpl directly.
- Fixed the RequirementBoilderplates MinValue constraint, which had its comparison operands reversed (`minValue > currentValue`) so it required the opposite of a lower bound; it now correctly requires `currentValue > minValue`.
- Fixed the RequirementBoilderplates MinAvailability requirement's minAvailability attribute, which was typed as ISQ::duration; it is now a dimensionless ScalarValues::Real ratio, consistent with the uptime/totalTime constraint.

## v5.1.1

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
