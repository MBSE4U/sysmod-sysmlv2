library package SYSMOD {
    doc
    /* 
     * Definition of SYSMOD v5 for SysML v2
     *
     * Version v5.1.3
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * Copyright 2026, MBSE4U, Tim Weilkiens
     */

    //
    // SYSMOD Project which links all the main artifacts together within a shared context.
    //
    occurrence def Project {
        doc
        /* The Project provides a context for all main engineering artifacts used for this specific project and sets cross relationships. */

        part projectOwner :> projectStakeholders {
            doc
            /* The Project Owner is a special Stakeholder who is in charge of the Project. */
            attribute :>> risk default LevelKind::critical;
            attribute :>> effort default LevelKind::low;
            attribute :>> categories default StakeholderCategoryKind::requirementOwner;
        }
        concern problemStatement : ExtendedConcern {
            doc
            /* The Problem Statement is an elevator pitch that describes the problem the system of interest is intended to solve. It is based on the brownfield system. The problem statement does not specify a solution. The project owner is the stakeholder of the problem statement. */
            subject brownfieldSystem :> Project::brownfieldContextImpl.soiImpl;
            stakeholder projectOwner :> Project::projectOwner;
            attribute :>> priority default LevelKind::critical;
        }
        part projectStakeholders : ExtendedStakeholder [1..*] {
            doc
            /* Stakeholders are individuals and organizations that have an interest in the system. They have needs and are potential sources of system requirements. There is at least one stakeholder which is the project owner. */
        }
        concern stakeholderNeeds {
            doc
            /* The concern stakeholderNeeds is the root element for all stakeholder needs which will be translated into system requirements. The needs are based on the brownfield system (white-box view) and frame the problem statement. */
            subject brownfieldSystem :> Project::brownfieldContextImpl.soiImpl;
            frame problemStatement;
        }
        part brownfieldContext : SystemContext {
            doc
            /* The Brownfield Context includes the system and actors that are already identified at the start of the Project. These constraints limit the set of possible solutions. This is the blackbox context without specifying the internals of the system of interest. */
            part <soi> systemOfInterest :>> soi {
                doc
                /* The existing (brownfield) system of interest as a black box. It is the explicit anchor for the refinement along the context chain. */
            }
        }
        part brownfieldContextImpl :> brownfieldContext {
            doc
            /* The implementation of the brownfield context includes the internal structure of the system of interest. This is the whitebox context. */
            part <soiImpl> systemOfInterestImpl :>> soi {
                doc
                /* The white-box view of the existing system of interest including its internal structure. It redefines the black-box soi. */
            }
        }
        part systemIdeaContext :> brownfieldContext {
            doc
            /* The system idea context contains the system idea and additional actors, if necessary. It specializes the black-box brownfield context. */
            part <soi> systemIdeaSystem :>> brownfieldContext::soi {
                doc
                /* The system idea as a black box. It redefines the brownfield system of interest. */
            }
        }
        part systemIdeaContextImpl :> systemIdeaContext, brownfieldContextImpl {
            doc
            /* The white-box view of the system idea context. It combines the black-box system idea context with the internal structure view inherited from the brownfield implementation context. */
            part <soiImpl> systemIdeaSystemImpl :>> systemIdeaContext::soi, brownfieldContextImpl::soiImpl {
                doc
                /* The system idea is the answer to the problem statement. It is a rough, elevator-pitch-style outline of the system designed to solve the problem. The system idea specializes the brownfield system. */
                satisfy Project::problemStatement;
            }
        }
        part specificationContext :> systemIdeaContext {
            doc
            /* The specification context includes the actors and the system, along with specific subcomponents, which are defined during the requirements analysis. The specification context is also the owner of the system use cases. The context specializes the black-box system idea context. */
            part <soi> specificationSystem :>> systemIdeaContext::soi {
                doc
                /* The specification system as a black box. It redefines the system idea and is the subject of the system requirements and use cases. */
            }
        }
        part specificationContextImpl :> specificationContext, systemIdeaContextImpl {
            doc
            /* The white-box view of the specification context. It combines the black-box specification context with the internal structure view inherited from the system idea implementation context. */
            part <soiImpl> specificationSystemImpl :>> specificationContext::soi, systemIdeaContextImpl::soiImpl {
                doc
                /* The white-box view of the specification system including its internal structure. */
            }
        }
        requirement systemRequirementSpecification {
            doc
            /* The System Requirement Specification is the root element for system requirements. They frame the stakeholder needs. */
            subject specificationSystem :> specificationContext.soi;
            frame stakeholderNeeds;
        }
        part functionalContext[0..1] :> specificationContext {
            doc
            /* The Functional Context is optional and specializes the black-box specification context. It provides the context for a functional architecture, for example, developed with the FAS method. It deliberately does not specialize the white-box solution context: a functional architecture contains only functional blocks and must not depend on the physical internal structure of the system. */
            part <soi> functionalSystem :>> specificationContext::soi {
                doc
                /* The Functional System is the root element of the functional architecture. It redefines the black-box specification system and thereby inherits the context information such as the system ports, so that functions can be related to the system's external interfaces without depending on its physical internal structure. */
            }
        }
        part logicalContext[0..1] :> specificationContext {
            doc
            /* The Logical Context is optional and specializes the black-box specification context. It provides the context for a logical architecture with technology-independent building blocks. */
            part <soi> logicalSystem :>> specificationContext::soi {
                doc
                /* The Logical System is the root element of the logical architecture. It redefines the black-box specification system. */
            }
        }
        part productContext :> specificationContextImpl {
            doc
            /* The Product Context specializes the white-box specification context and provides the context for a product architecture with concrete, physical or deployable building blocks. */
            part <soiImpl> productSystem :>> specificationContextImpl::soiImpl {
                doc
                /* The Product System is the root element of the product architecture. It redefines the white-box specification system. It satisfies the system requirements. */
                satisfy systemRequirementSpecification;

            }
        }
        allocation functional2logical [0..1] allocate functionalContext to logicalContext {
            doc
            /* Allocation of the functional architecture to the logical architecture. */
        }
        allocation logical2product [0..1] allocate logicalContext to productContext {
            doc
            /* Allocation of the logical architecture to the product architecture. */
        }

        derived occurrence subProjects : Project [*] = 
            (suboccurrences->ControlFunctions::select({in o; o hastype Project})) as Project {
                doc /* List of all subProjects, for example, a standalone project for a subsystem or component of the system. */
            }
    }
    abstract occurrence projects : Project [*] {
        doc
        /* Base usage for all SYSMOD projects. It is the anchor of the #project semantic metadata. */
    }

    //
    // SYSMOD System Context
    //
    part def SystemContext {
        doc
        /* The SYSMOD System Context includes all system actors, the system of interest, 
         * the relationships between the actors and the system, as well as the use cases.
         */
        part actors [1..*] {
            doc
            /* The actors of the system of interest, i.e., all external entities which interact with system including humans, external systems, and environmental effects. */
            port actorPorts[0..*] {
                doc
                /* Dedicated ports of an actor to exchange items with the system. */
            }
        }
        part <soi> systemOfInterest {
            doc
            /* The system of interest as a black box. Implementation contexts redefine it to add the white-box view. */
            port systemPorts[1..*] {
                doc
                /* Ports of the system of interest to exchange items with the actors. */
            }
        }
        interface <asis> actorSystemInterfaces[1..*] : ActorSystemInterface 
            connect actors.actorPorts to soi.systemPorts {
            doc
            /* Set of all actor/system interfaces. */
        }
        use case useCases [0..*] : SystemUseCase {
            doc
            /* Set of all system use cases. */
            subject soi :> SystemContext::soi;
        }
    }
    abstract part systemContexts : SystemContext [*] {
        doc
        /* Base usage for all SYSMOD system contexts. It is the anchor of the #systemContext semantic metadata. */
    }

    interface def ActorSystemInterface {
        doc
        /* Common interface definition for the link between actors and the system of interest. */
        end [1..*] port actorPort;
        end [1] port systemPort;
    }

    // System
    metadata def System {
        doc /* System is merely a label used to tag an element. The element could play a different role in a different context. */
        :> annotatedElement : SysML::PartUsage;        
    }

    // Actor Categories
    metadata def User {
        doc /* User is merely a label used to tag an element. The element could play a different role in a different context. */
        :> annotatedElement : SysML::PartUsage;
    }
    metadata def ExternalSystem {
        doc /* ExternalSystem is merely a label used to tag an element. The element could play a different role in a different context. */
        :> annotatedElement : SysML::PartUsage;
    }
    metadata def EnvironmentalEffect {
        doc /* EnvironmentalEffect is merely a label used to tag an element. The element could play a different role in a different context. */
        :> annotatedElement : SysML::PartUsage;
    }

    // Use Case
    use case def SystemUseCase :> ConstrainedOccurrence {
        doc /* A SYSMOD use case adds attributes for documentation purposes. */
        attribute ucMotivation: ScalarValues::String {
            doc /* The motivation that prompts the actor to initiate the use case. */            
        }
        attribute ucTrigger : ScalarValues::String {
            doc /* The event at the system boundary that starts the use case. */
        }
        attribute ucResult : ScalarValues::String {
            doc /* The outcome the use case guarantees once it completes successfully. */
        }
    }
    use case systemUseCases[*] : SystemUseCase;

    //
    // SYSMOD Stakeholder and Requirement Concepts
    //
    part def ExtendedStakeholder {
        doc
        /* SYSMOD-specific stakeholder concept with attributes to assess and prioritize stakeholders. Stakeholders are individuals or organizations with an interest in the system and are potential sources of requirements. */
        attribute risk : LevelKind default LevelKind::none {
            doc
            /* What is the risk of failure if I ignore this stakeholder? */
        }
        attribute effort : LevelKind default LevelKind::none {
            doc
            /* How much effort is involved in identifying this stakeholder's concerns and requirements? */
        }
        derived attribute priority : ScalarValues::Real = risk * effort {
            doc
            /* Priority is the product of risk and effort. */
        }
        attribute contact : ScalarValues::String [0..1] {
            doc
            /* Contact information of the stakeholder. */
        }
        attribute categories : StakeholderCategoryKind [*] {
            doc
            /* Categories describing the roles of the stakeholder, for example, user, requirement owner, or expert. */
        }
    }
    abstract part stakeholders : ExtendedStakeholder [*] {
        doc
        /* Base usage for all SYSMOD stakeholders. It is the anchor of the #extendedStakeholder semantic metadata. */
    }

    enum def StakeholderCategoryKind {
        doc
        /* Different kinds of stakeholders. */
        expert;
        requirementOwner;
        user;
        other;
    }

    concern def ExtendedConcern {
        doc /* Base element for concerns. */
        attribute priority : LevelKind default LevelKind::none;
    }
    abstract concern extendedConcerns : ExtendedConcern [*] {
        doc
        /* Base usage for all SYSMOD concerns. It is the anchor of the #extendedConcern semantic metadata. */
    }

    requirement def ExtendedRequirement :> ExtendedConcern {
        doc
        /* The extended requirement adds further features to the requirement model element. 
         * Typically, you would define your own set of features and not use the SYSMOD set only.
         */
        attribute obligation : ObligationKind default ObligationKind::none {
            doc
            /* Is the requirement mandatory or optional? */
        }
        attribute stability : StabilityKind default StabilityKind::none {
            doc
            /* How likely is the requirement to change? */
        }
        attribute motivation : ScalarValues::String {
            doc
            /* Why does the requirement exist? A brief rationale supporting traceability and reviews. */
        }
    }
    abstract requirement extendedRequirements : ExtendedRequirement [*] {
        doc
        /* Base usage for all SYSMOD requirements. It is the anchor of the #extendedRequirement semantic metadata. */
    }

    enum def ObligationKind {
        doc
        /* Enumeration for different kinds of obligations of a requirement. */
        none;
        mandatory;
        optional;
    }
    enum def StabilityKind {
        doc
        /* Enumeration describing how likely a requirement is to change. */
        none;
        unstable;
        stable;
    }

    //
    // Common Concepts
    //
    enum def LevelKind :> ScalarValues::Real {
        doc
        /* Common enumeration of levels with real values, for example, for priority calculations. */
        none = 0.0;
        low = 0.25;
        medium = 0.5;
        high = 0.75;
        critical = 1.0;
    }

    occurrence def ConstrainedOccurrence {
        doc
        /* A reusable base for any occurrence whose life cycle is governed by a precondition and a
         * postcondition: the occurrence only starts once its precondition is satisfied, and it is
         * only considered done once its postcondition is satisfied. SystemUseCase specializes it
         * so that SYSMOD use cases get this contract for free.
         */
        constraint precondition {
            doc /* The condition that must hold before the use case starts. */
        }
        constraint postcondition {
            doc /* The condition that is guaranteed to hold once the use case completes successfully. */
        }
        ref occurrence :>> startShot {
            doc /* The occurrence starts only if the precondition is satisfied. */
            assert constraint :> precondition;
        }
        ref occurrence :>> endShot {
            doc /* The occurrence is only considered done if the postcondition is satisfied. */
            assert constraint :> postcondition;
        }
    }
    occurrence constrainedOccurrences[*] : ConstrainedOccurrence;

    //
    // Semantic Metadata
    //
    metadata def <project> ProjectMetadata :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #project to mark occurrence definitions and usages as SYSMOD projects. */
        :>> baseType = projects meta SysML::Type;
        :> annotatedElement : SysML::OccurrenceDefinition;
        :> annotatedElement : SysML::OccurrenceUsage;
    }
    metadata def <systemContext> SystemContextMetadata :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #systemContext to mark part definitions and usages as SYSMOD system contexts. */
        :>> baseType = systemContexts meta SysML::Type;
        :> annotatedElement : SysML::PartDefinition;
        :> annotatedElement : SysML::PartUsage;
    }
    metadata def <extendedStakeholder> StakeholderMetadata :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #extendedStakeholder to mark part definitions and usages as SYSMOD stakeholders. */
        :>> baseType = stakeholders meta SysML::Type;
        :> annotatedElement : SysML::PartDefinition;
        :> annotatedElement : SysML::PartUsage;
    }
    metadata def <extendedConcern> ExtendedConcernMetadata :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #extendedConcern to mark concern definitions and usages as SYSMOD concerns. */
        :>> baseType = extendedConcerns meta SysML::Type;
        :> annotatedElement : SysML::ConcernDefinition;
        :> annotatedElement : SysML::ConcernUsage;
    }
    metadata def <extendedRequirement> ExtendedRequirementMetadata
        :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #extendedRequirement to mark requirement definitions and usages as SYSMOD requirements. */
        :>> baseType = extendedRequirements meta SysML::Type;
        :> annotatedElement : SysML::RequirementDefinition;
        :> annotatedElement : SysML::RequirementUsage;
    }
    metadata def <systemUseCase> SystemUseCaseMetadata
        :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #systemUseCase. */
        :>> baseType = systemUseCases meta SysML::Type;
        :> annotatedElement : SysML::UseCaseDefinition;
        :> annotatedElement : SysML::UseCaseUsage;
    }    


    package RequirementBoilderplates {
        doc
        /* Library of generic, parametric requirement patterns. Each one captures a common quantitative requirement shape as a require constraint over placeholder attributes; specialize a boilerplate and redefine its attributes to bind it to a concrete quantity and threshold. */

        requirement def MaxValue {
            doc
            /* The quantity must stay strictly below an upper bound. */
            attribute currentValue : ScalarValues::Real;
            attribute maxValue : ScalarValues::Real;

            require constraint {
                currentValue < maxValue
            }
        }
        requirement def MinValue {
            doc
            /* The quantity must stay strictly above a lower bound. */
            attribute currentValue : ScalarValues::Real;
            attribute minValue : ScalarValues::Real;

            require constraint {
                currentValue > minValue
            }
        }
        requirement def RangeValue {
            doc
            /* The quantity must stay within an inclusive lower and upper bound. */
            attribute currentValue : ScalarValues::Real;
            attribute minValue : ScalarValues::Real;
            attribute maxValue : ScalarValues::Real;

            require constraint {
                minValue <= currentValue and currentValue <= maxValue
            }
        }
        requirement def ExactValue {
            doc
            /* The quantity must equal a specific target value. */
            attribute currentValue : ScalarValues::Real;
            attribute targetValue : ScalarValues::Real;

            require constraint {
                currentValue == targetValue
            }
        }
        requirement def ToleranceValue {
            doc
            /* The quantity must stay within a target value plus/minus a tolerance. */
            attribute currentValue : ScalarValues::Real;
            attribute targetValue : ScalarValues::Real;
            attribute tolerance : ScalarValues::Real;

            require constraint {
                currentValue >= targetValue - tolerance and currentValue <= targetValue + tolerance
            }
        }
        requirement def MinAvailability {
            doc
            /* The ratio of uptime to total time must reach at least a minimum availability. */
            attribute uptime :> ISQ::duration;
            attribute totalTime :> ISQ::duration;
            attribute minAvailability : ScalarValues::Real;

            require constraint {
                uptime / totalTime >= minAvailability
            }
        }
        requirement def MinReliability {
            doc
            /* The mean time between failures must reach at least a minimum MTBF. */
            attribute meanTimeBetweenFailures :> ISQ::duration;
            attribute minMTBF :> ISQ::duration;

            require constraint {
                meanTimeBetweenFailures >= minMTBF
            }
        }
    }
}

package SYSMOD4AI {
    doc
    /*
     * SYSMOD4AI: AI-assisted extension for SYSMOD v5
     *
     * Adds machine-readable AI instructions on top of the core SYSMOD library, so an AI assistant can
     * create, validate, and explain SYSMOD artifacts directly from this model — with no dependency on
     * any particular AI tool's skill, plugin, or extension mechanism. It is kept as a separate package
     * from SYSMOD so the core methodology library stays free of AI-specific concerns; import this
     * package in addition to SYSMOD only where AI assistance is wanted.
     *
     * Contents:
     * - metadata def AI: the attributes an AI assistant reads to work with one SYSMOD element —
     *   create_questions, create_prompt, and validation_prompt for the elicit/create/validate
     *   workflow (run together via perform_prompt), plus story_prompt and slide_prompt for explaining
     *   any selected element to non-technical stakeholders.
     * - AIProject: specializes Project and attaches an AI metadata usage to each of its main
     *   artifacts, in SYSMOD order, forming a complete AI-assisted workflow across the whole project.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * Copyright 2026, MBSE4U, Tim Weilkiens
     */

    private import SYSMOD::*;

    metadata def AI {
        doc
        /* Machine-readable AI instructions attached to SYSMOD artifacts. perform_prompt is the entry
         * point: an AI assistant executes it to run the fixed elicit/create/validate workflow over
         * this metadata's own create_questions, create_prompt, and validation_prompt for the single
         * SYSMOD element this metadata annotates. story_prompt and slide_prompt are separate, on-demand
         * entry points that retell any element the user selects for stakeholders who do not read SysML
         * notation: story_prompt as a plain-language narrative, slide_prompt as a single presentation
         * slide.
         * This metadata is self-contained and AI-tool-agnostic: any AI assistant that can read this
         * library follows these workflows directly from perform_prompt, story_prompt, and slide_prompt,
         * without needing a tool-specific skill, plugin, or extension file.
         */
        attribute name : ScalarValues::String {
            doc
            /* Unique identifier of the AI skill, for example, 'sysmod-problem-statement'. */
        }
        attribute create_prompt : ScalarValues::String {
            doc
            /* Step-by-step instructions for an AI assistant to create the annotated artifact. */
        }
        attribute create_questions : ScalarValues::String [*] {
            doc
            /* Questions the AI assistant can ask the user to elicit missing information. */
        }
        attribute validation_prompt : ScalarValues::String {
            doc
            /* Instructions for an AI assistant to verify and validate the annotated artifact against the SYSMOD rules. */
        }
        attribute perform_prompt : ScalarValues::String = "Perform the AI workflow for the single SYSMOD element annotated by this metadata, in this order:
            1. Elicit — ask the user only the entries of create_questions that are not already answered by the request or by the existing model.
            2. Create — execute create_prompt step by step to author or update the annotated element.
            3. Validate — run validation_prompt against the result and report findings grouped as errors, warnings, and suggestions before presenting the element as final; apply corrections and re-run validation_prompt if the user asks for it.
            Use only this metadata's own create_questions, create_prompt, and validation_prompt for this element — do not perform the workflow of any other AI metadata unless its own create_prompt explicitly directs you to." {
            doc
            /* Single, ready-to-run prompt that performs the elicit/create/validate workflow for the one SYSMOD
             * element this metadata annotates. An AI assistant can execute this attribute directly instead of
             * composing create_questions, create_prompt, and validation_prompt itself. Every AI metadata usage
             * inherits this default; override it only if a specific artifact needs a different orchestration.
             */
        }
        attribute story_prompt : ScalarValues::String = "Explain a SysML v2 element as a short natural-language story for a stakeholder who does not read modeling notation.
            1. Take the element the user has selected or named; if none is given, use the element this metadata annotates.
            2. Read the element's name, doc comments, and its immediate relationships in the model (e.g., what it frames, satisfies, subsets, is composed of, or is connected to).
            3. Retell it as a short narrative in the stakeholder's own language: who or what it represents, why it exists, and how it fits into the surrounding project story (e.g., 'This describes the problem the project owner asked us to solve, which is that...').
            4. Do not use SysML v2 keywords, notation, or diagrams, and avoid modeling jargon (e.g., 'part usage', 'subsets', 'occurrence') unless the user explicitly asks for the technical mapping alongside the story.
            5. Ground the story only in what is actually present in the element and its documented relationships — do not invent facts, causes, or consequences that are not in the model.
            6. Keep it concise: a few sentences to a short paragraph, unless the user asks for more detail.
            If the user selects a different element than the one this metadata annotates, and that element carries its own AI metadata, use that element's own story_prompt instead." {
            doc
            /* Prompt that lets an AI assistant explain any element the user selects — not only the one this
             * metadata annotates — as a plain-language story rather than SysML notation, for stakeholders who
             * find the formal model hard to read. Every AI metadata usage inherits this default; override it
             * only if a specific artifact needs a different narrative framing.
             */
        }
        attribute slide_prompt : ScalarValues::String = "Create a single presentation slide explaining a SysML v2 element for a stakeholder audience, in whatever slide or document format is available (e.g. PDF, PPTX, or an equivalent) so it can be dropped directly into a presentation.
            1. Take the element the user has selected or named; if none is given, use the element this metadata annotates.
            2. Read the element's name, doc comments, and its immediate relationships in the model (e.g., what it frames, satisfies, subsets, is composed of, or is connected to).
            3. Give the slide a short, descriptive title (not the raw SysML identifier) and a few plain-language bullet points covering what the element is, why it exists, and how it fits into the surrounding project — use the same plain-language framing as story_prompt, condensed to slide-appropriate bullets rather than a narrative.
            4. Do not use SysML v2 keywords, notation, or diagrams, and avoid modeling jargon (e.g., 'part usage', 'subsets', 'occurrence') unless the user explicitly asks for the technical mapping alongside the slide.
            5. Ground the slide only in what is actually present in the element and its documented relationships — do not invent facts, causes, or consequences that are not in the model.
            6. If the assistant is capable of generating or inserting images in the current environment, add at most one supporting image to the slide — an illustrative graphic of the element's real-world subject, not an invented SysML diagram or a fabricated technical drawing presented as fact; if image generation or insertion is not available, produce a text-only slide instead.
            7. Keep it to a single slide: one title, a handful of bullets, and at most one image — do not turn it into a multi-page or multi-slide document.
            8. If the user asks for a specific output format (e.g. PDF, PPTX, Keynote), produce that format; otherwise choose a format the current environment can actually generate and tell the user which one was used.
            If the user selects a different element than the one this metadata annotates, and that element carries its own AI metadata, use that element's own slide_prompt instead." {
            doc
            /* Prompt that lets an AI assistant turn any element the user selects — not only the one this
             * metadata annotates — into a single presentation-ready slide (PDF, PPTX, or another format the
             * environment supports) explaining it in plain language, for direct use in a stakeholder
             * presentation, adding a supporting image when the assistant is capable of it. Every AI metadata
             * usage inherits this default; override it only if a specific artifact needs different slide
             * content.
             */
        }
    }

    occurrence def AIProject :> Project {
        doc
        /* AIProject pairs AI metadata with the structure of Project. Metadata usages are not
         * inherited onto redefining features, so specializing AIProject instead of Project gives a
         * concrete project no metadata of its own — there is no structural benefit to using AIProject
         * in a model. Its value is as a reference for an AI assistant: because AIProject specializes
         * Project, it has exactly Project's structure, and each main artifact here carries an AI
         * metadata usage "about" the corresponding feature of Project. Reading
         * AIProject therefore tells an AI assistant both the structure a SYSMOD project must have and,
         * for each of its parts, which AI metadata (e.g. problemStatementAI) to apply — whether or not
         * the actual project being worked on specializes AIProject at all.
         */
        metadata projectAI : AI {
            name = "sysmod-project";
            create_prompt =
                "1. Create the SysML v2 textual notation for the project definition using the SYSMOD-defined keyword: '#project occurrence def PROJECTNAME {}'
                2. Use the create_prompt of the AI metadata of the projectOwner to create the project owner of the project.
                3. If not given by the user, use the questions to get the name of the project and the location where the project should be added.
                4. Optionally continue with the other engineering artifacts in SYSMOD order (brownfieldContext, problemStatement, projectStakeholders, stakeholderNeeds, systemIdeaContext, specificationContext, systemRequirementSpecification, functionalContext, logicalContext, productContext) using the create_prompts of their AI metadata.";
            create_questions = (
                "1. What is the name of the project?", 
                "2. Where should I add the project definition?",
                "3. Who is the project owner?"
            );
            validation_prompt =
                "Validate the project definition against the SYSMOD Project concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. The project is defined as an occurrence definition annotated with the #project keyword or specializing Project.
                2. A projectOwner part usage is present and subsets projectStakeholders.
                3. A brownfieldContext part usage is present and typed by a SystemContext specialization; a brownfieldContextImpl part usage is present and specializes brownfieldContext.
                4. A problemStatement concern usage is present.
                5. A stakeholderNeeds concern usage is present and frames the problemStatement.
                6. A systemIdeaContext part usage is present and specializes brownfieldContext; a systemIdeaContextImpl part usage is present and specializes systemIdeaContext and brownfieldContextImpl.
                7. A specificationContext part usage is present and specializes systemIdeaContext; a specificationContextImpl part usage is present and specializes specificationContext and systemIdeaContextImpl.
                8. A systemRequirementSpecification requirement usage is present and frames stakeholderNeeds.
                9. A productContext part usage is present and specializes specificationContextImpl.
                10. The cross-artifact traceability chain is intact: problemStatement <- stakeholderNeeds <- systemRequirementSpecification, and satisfy relationships exist at the system idea and solution levels.
                11. If both functionalContext and logicalContext are present, the functional2logical allocation is defined; if logicalContext is present, the logical2product allocation is defined.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata projectOwnerAI : AI about projectOwner {
            name = "sysmod-project-owner";
            create_prompt =
                "1. If the user has provided a projectOwner, use it. If not, ask the user for the projectOwner using appropriate questions from the questions field.
                2. Create a concise projectOwner description.
                3. Create the SysML v2 textual notation for the projectOwner.
                4. If the user asks to insert the projectOwner into the SysML model, find the project and the projectOwner within the project. If no project exists, create one and insert the projectOwner into the project redefining the inherited projectOwner part usage. If the projectOwner already exists, update it.";
            create_questions = (
                "Who is the project owner?", "Who is responsible for the project?",
            );
            validation_prompt =
                "Validate the projectOwner against the SYSMOD Project Owner concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. Exactly one projectOwner part usage is present in the project, redefining the inherited projectOwner.
                2. The projectOwner subsets projectStakeholders and is typed by an ExtendedStakeholder specialization.
                3. The risk attribute is set to LevelKind::critical (the project owner always has critical risk).
                4. The effort attribute is set to LevelKind::low (the project owner is typically easy to reach).
                5. The categories attribute includes StakeholderCategoryKind::requirementOwner.
                6. The projectOwner is referenced as the stakeholder of the problemStatement.
                7. A meaningful name or doc comment identifies who the project owner is in the context of this project.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata brownfieldContextAI : AI about brownfieldContext {
            name = "sysmod-brownfield-context";
            create_prompt =
                "1. Analyze the provided scenario and identify the brownfield system: the existing system, its relevant subcomponents, and all external actors (humans, external systems, environmental effects) that already interact with it before the project starts.
                2. Create a part definition for the brownfield context specializing SystemContext.
                3. Create a part definition for the brownfield system of interest.
                4. For each identified actor, create a part definition in a subpackage named 'Actors', if not already exists.
                5. For each identified actor, add a part usage defined by the corresponding part definition and subsetting the part usage 'actors' inherited from SystemContext.
                6. For the black-box view, redefine the inherited soi part (within brownfieldContext) with an appropriately named and typed part definition. For the white-box view, redefine the inherited soiImpl part (within brownfieldContextImpl, which specializes brownfieldContext) accordingly.
                7. Ensure the brownfield context reflects constraints and givens only — it must not include solution elements.
                8. Create the SysML v2 textual notation for the brownfieldContext and brownfieldContextImpl.
                9. If the user asks to insert the brownfieldContext into the SysML model, find the project and redefine the inherited brownfieldContext and brownfieldContextImpl part usages. If the project does not exist, create one first.";
            create_questions = (
                "1. What is the name of the existing system (system of interest)?",
                "2. Which external actors (users, operators, external systems, environments) interact with the existing system?",
                "3. Are there any known and preset subcomponents or subsystems of the existing system that are relevant?",
            );
            validation_prompt =
                "Validate the brownfieldContext and brownfieldContextImpl against the SYSMOD Brownfield Architecture concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. The brownfieldContext part usage is present in the project and typed by a SystemContext specialization.
                2. At least one actor part usage subsetting actors is present, representing an external entity that interacts with the existing system.
                3. The soi part is redefined within brownfieldContext with a named part definition representing the existing system of interest (black-box view).
                4. The brownfieldContextImpl part usage is present, specializes brownfieldContext, and redefines the soiImpl part representing the white-box view of the existing system.
                5. Actor-system interfaces (actorSystemInterfaces) connect actor ports to system ports.
                6. The brownfield context contains only elements that exist before the project starts — no solution-specific parts, new system ideas, or future-state components.
                7. Each actor has a meaningful name and, ideally, a doc comment describing its role.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata problemStatementAI : AI about problemStatement {
            name = "sysmod-problem-statement";
            create_prompt =
                "1. Follow the structure between engineering artifacts given by the SYSMOD library.
                2. Analyze the provided scenario. If it is forward engineering, identify the problem statement from the given scenario. If it is reverse engineering, identify the problem statement by identifying the problem that is solved by the given system.
                3. Create a concise elevator-pitch style problem statement text (typically 150-250 words).
                4. Follow this format: 'How can we...'
                5. Ensure the problem statement text is based on the brownfieldContext. If the brownfieldContext is not available, create one that is implied by the problem statement text using the AI metadata about the brownfieldContext.
                6. Ensure that the problem statement does not jump to the solution and describe it in advance.
                7. Ensure that the stakeholder projectOwner is set by subsetting the corresponding part usage in the project, if given. If it is not available, use the create_prompt of the AI metadata about the projectOwner to create one.
                8. If it is reverse engineering, create a satisfy relationship between the given system and the problem statement.
                9. Create the SysML v2 textual notation for the problemStatement.
                10. If the user asks to insert the problemStatement into the SysML model, find the project and the problemStatement within the project. If no project exists, create one and insert the problemStatement into the project redefining the inherited problemStatement concern usage. If the problemStatement already exists, update it.";
            create_questions = (
                "What is the core problem the system should solve?",
                "What are the main deficiencies or pain points of the existing (brownfield) system?",
            );
            validation_prompt =
                "Validate the problemStatement against the SYSMOD Problem Statement concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. The problemStatement concern usage is present in the project, redefining the inherited problemStatement.
                2. The subject references the brownfieldContextImpl soiImpl (the existing system is the subject of the problem).
                3. The projectOwner is set as the stakeholder of the problemStatement.
                4. The priority attribute is set to LevelKind::critical.
                5. A doc comment is present containing the problem statement text.
                6. The problem statement text starts with 'How can we...' or an equivalent problem-framing phrase.
                7. The problem statement text describes the problem, not a solution — check for premature solution language (e.g., 'we will build', 'the new system shall', named technologies or architectures).
                8. The problem statement text references the brownfield system and its deficiencies.
                9. The problem statement text is concise (typically 150-250 words).
                10. If it is reverse engineering, a satisfy relationship exists between the existing system and the problemStatement.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata projectStakeholdersAI : AI about projectStakeholders {
            name = "sysmod-stakeholders";
            create_prompt =
                "1. Analyze the brownfieldContext and the problemStatement and identify all relevant stakeholders (individuals or organizations with an interest in the system).
                2. For each stakeholder, create a part definition specializing ExtendedStakeholder.
                3. Assess and set the risk (what is the risk of failure if this stakeholder is ignored?), effort (how much effort is needed to identify their concerns?), and one or more stakeholder categories (user, requirementOwner, expert, other) for each stakeholder.
                4. Add each stakeholder as a named part usage subsetting projectStakeholders inside the project, typed by the corresponding stakeholder definition.
                5. Create the SysML v2 textual notation for all stakeholder definitions and their usages within the project.
                6. If the user asks to insert the stakeholders into the SysML model, find the project and add or update the stakeholder part usages.";
            create_questions = (
                "Who are the primary users of the system?",
                "Which organizations or roles own or define the requirements?",
                "Are there regulatory bodies, standards authorities, or other external parties with an interest in the system?",
            );
            validation_prompt =
                "Validate the projectStakeholders against the SYSMOD Stakeholders concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. At least one stakeholder part usage (beyond the projectOwner) subsets projectStakeholders.
                2. Each stakeholder part usage is typed by a part definition specializing ExtendedStakeholder.
                3. Each stakeholder definition has the risk attribute set to a non-default LevelKind value (i.e., not LevelKind::none).
                4. Each stakeholder definition has the effort attribute set to a non-default LevelKind value (i.e., not LevelKind::none).
                5. Each stakeholder definition has at least one category assigned from StakeholderCategoryKind.
                6. The set of stakeholders covers all actors present in the brownfieldContext — every actor should map to at least one stakeholder.
                7. At least one stakeholder with category requirementOwner is present (beyond the projectOwner).
                8. Each stakeholder has a doc comment or name that clearly identifies its role.
                9. No two stakeholders have identical risk, effort, and category values without a distinguishing doc comment explaining the distinction.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata stakeholderPriorityMapAI : AI about projectStakeholders {
            name = "sysmod-stakeholder-priority-map";
            create_prompt =
                "1. Use the risk and effort attribute values of each stakeholder in projectStakeholders (typed by ExtendedStakeholder) to position it on a two-dimensional map: risk on the y axis (low to critical, bottom to top), effort on the x axis (low to high, left to right).
                2. Depict each stakeholder as a stakeholder symbol labeled with its name, placed in the map cell that matches its risk/effort combination.
                3. If two or more stakeholders share the same risk/effort combination, group their symbols within the same cell without overlapping.
                4. The stakeholder priority map is a derived view, not a new model element — it must not introduce new stakeholders or change existing risk/effort values. If a stakeholder has no risk or effort value assigned, ask the user for it or use the create_prompt of projectStakeholdersAI first to assess it.
                5. Render the map as a diagram (e.g., SVG or a described grid), not as SysML v2 textual notation, since it is an analysis artifact rather than a persisted model element.";
            create_questions = (
                "1. Which stakeholders (from projectStakeholders) should be included in the map?",
                "2. Do all included stakeholders already have risk and effort values assigned? If not, what are they?",
            );
            validation_prompt =
                "Validate the stakeholder priority map against the SYSMOD Stakeholder Priority Map concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. Every stakeholder shown in the map corresponds to an actual part usage subsetting projectStakeholders in the project — no invented stakeholders.
                2. Every stakeholder in projectStakeholders with both risk and effort assigned is represented exactly once in the map — none silently omitted.
                3. Each stakeholder's position matches its risk (y axis) and effort (x axis) attribute values exactly.
                4. Stakeholders sharing the same risk/effort cell are all visible and distinguishable, not overlapping or hidden.
                5. The map does not introduce or imply risk/effort values that are not set on the underlying stakeholder definitions.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata stakeholderNeedsAI : AI about stakeholderNeeds {
            name = "sysmod-stakeholder-needs";
            create_prompt =
                "1. Analyze the projectStakeholders and the problemStatement and derive the high-level needs of each stakeholder.
                2. For each stakeholder need, create a concern usage subsetting stakeholderNeeds, framed by the problemStatement and referencing the brownfield system (the soiImpl of brownfieldContextImpl) as its subject.
                3. Ensure each need is expressed from the stakeholder's perspective and describes what they need the system to do or be, not how.
                4. Do not express needs as solution-specific requirements; keep them at the stakeholder intent level.
                5. Create the SysML v2 textual notation for the stakeholderNeeds.
                6. If the user asks to insert the stakeholderNeeds into the SysML model, find the project and redefine the inherited stakeholderNeeds concern usage. If the project does not exist, create one first.";
            create_questions = (
                "What does each stakeholder group need the system to do or be?",
                "Are there any known constraints or non-functional needs (safety, cost, compliance) expressed by stakeholders?",
            );
            validation_prompt =
                "Validate the stakeholderNeeds against the SYSMOD Stakeholder Needs concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. The stakeholderNeeds concern usage is present in the project, redefining the inherited stakeholderNeeds.
                2. The stakeholderNeeds frames the problemStatement.
                3. The subject references the brownfieldContextImpl soiImpl.
                4. At least one stakeholder need is defined as a nested concern usage.
                5. Each stakeholder need is traceable to at least one stakeholder from projectStakeholders (via stakeholder reference or doc comment attribution).
                6. Each need is expressed at the stakeholder intent level — check for premature solution or design language (e.g., specific technologies, implementation details, design choices).
                7. The set of stakeholder needs covers all projectStakeholders — no stakeholder group should be left without at least one associated need.
                8. Each need has a doc comment or name that is understandable without reading the full model.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata systemIdeaContextAI : AI about systemIdeaContext {
            name = "sysmod-system-idea";
            create_prompt =
                "1. Based on the problemStatement, develop a high-level system idea: an elevator-pitch-style outline of the new or changed system that solves the stated problem.
                2. Specialize brownfieldContext by redefining the soi part (black-box view) with a named system idea definition, within systemIdeaContext. Specialize systemIdeaContext and brownfieldContextImpl by redefining the soiImpl part (white-box view) with the matching system idea implementation, within systemIdeaContextImpl. The systemIdeaSystemImpl must include a satisfy relationship to the problemStatement.
                3. Add any additional actors that are introduced by the system idea and are not already present in the brownfieldContext.
                4. Keep the system idea at a conceptual level — no detailed architecture or design decisions.
                5. Create the SysML v2 textual notation for the systemIdeaContext and systemIdeaContextImpl.
                6. If the user asks to insert the systemIdeaContext into the SysML model, find the project and redefine the inherited systemIdeaContext and systemIdeaContextImpl part usages. If the project does not exist, create one first.";
            create_questions = (
                "What is the high-level concept or approach for the new or changed system?",
                "Are there any new actors introduced by the system idea that do not exist in the brownfield?",
            );
            validation_prompt =
                "Validate the systemIdeaContext and systemIdeaContextImpl against the SYSMOD System Idea concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. The systemIdeaContext part usage is present in the project and specializes brownfieldContext.
                2. The soi part is redefined within systemIdeaContext with a named system idea definition that specializes the brownfield soi.
                3. The systemIdeaContextImpl part usage is present, specializes systemIdeaContext and brownfieldContextImpl, and redefines the soiImpl part, specializing the system idea soi.
                4. The soiImpl contains a satisfy relationship to the problemStatement.
                5. All actors from the brownfieldContext are inherited or explicitly redefined — no brownfield actor should silently disappear.
                6. Any new actors introduced by the system idea are added as additional actor part usages.
                7. The system idea stays at a conceptual level — check for premature architecture or design detail (e.g., specific components, protocols, or technologies named in the soiImpl structure).
                8. A doc comment on the soiImpl describes the system idea in elevator-pitch style.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata specificationContextAI : AI about specificationContext {
            name = "sysmod-specification-context";
            create_prompt =
                "1. Specialize systemIdeaContext by redefining the soi part (black-box view) with a specification-level system definition, within specificationContext. Specialize specificationContext and systemIdeaContextImpl by redefining the soiImpl part (white-box view) with the matching specification implementation, within specificationContextImpl.
                2. Identify and add any actors or subcomponents that become visible during requirements analysis (e.g., specific interfaces, subsystems defined at the black-box level).
                3. Add system use cases to the specificationContext that describe how actors interact with the system of interest at the specification level.
                4. Ensure the specificationContext owns the use cases and that each use case references the specificationSystem as its subject.
                5. Create the SysML v2 textual notation for the specificationContext and specificationContextImpl, including actor parts and use case usages.
                6. If the user asks to insert the specificationContext into the SysML model, find the project and redefine the inherited specificationContext and specificationContextImpl part usages.";
            create_questions = (
                "Which use cases describe how actors interact with the system?",
                "Are there additional actors or subcomponents that become visible at the specification level?",
            );
            validation_prompt =
                "Validate the specificationContext and specificationContextImpl against the SYSMOD Specification Context concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. The specificationContext part usage is present in the project and specializes systemIdeaContext.
                2. The soi part is redefined within specificationContext with a named specification system definition that specializes the system idea soi.
                3. The specificationContextImpl part usage is present, specializes specificationContext and systemIdeaContextImpl, and redefines the soiImpl part, specializing the specification soi.
                4. At least one use case usage is present in the specificationContext, referencing the specificationSystem as its subject.
                5. Each use case has at least one actor involved (include or extend relationships, or actor references in the use case subject/stakeholder).
                6. Each use case has a meaningful name and doc comment describing the interaction goal.
                7. All actors from the systemIdeaContext are inherited or redefined — no actor should silently disappear.
                8. The specificationContext does not contain solution elements — it should remain a black-box view of the system.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata systemRequirementSpecificationAI : AI about systemRequirementSpecification {
            name = "sysmod-system-requirements";
            create_prompt =
                "1. Derive system requirements from the stakeholderNeeds, framed by the stakeholderNeeds and referencing the specificationSystem as subject.
                2. For each requirement, create a requirement usage or definition specializing ExtendedRequirement. Set obligation (mandatory/optional), stability (stable/unstable), and a brief motivation.
                3. Ensure each requirement is verifiable, unambiguous, and solution-neutral where possible.
                4. Group requirements logically (e.g., functional, performance, safety, interface) using nested requirement usages if appropriate.
                5. Create the SysML v2 textual notation for the systemRequirementSpecification.
                6. If the user asks to insert the systemRequirementSpecification into the SysML model, find the project and redefine the inherited systemRequirementSpecification requirement usage.";
            create_questions = (
                "What are the key functional requirements of the system?",
                "Are there non-functional requirements (performance, safety, reliability, compliance)?",
                "Which requirements are mandatory and which are optional?",
            );
            validation_prompt =
                "Validate the systemRequirementSpecification against the SYSMOD System Requirements concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. The systemRequirementSpecification requirement usage is present in the project, framing the stakeholderNeeds.
                2. The subject references the specificationContext soi (the specification system is the subject of the requirements).
                3. At least one system requirement is defined as a nested requirement usage or definition.
                4. Each requirement specializes ExtendedRequirement and has the obligation attribute set (not ObligationKind::none).
                5. Each requirement has the stability attribute set (not StabilityKind::none).
                6. Each requirement has a non-empty motivation attribute explaining why the requirement exists.
                7. Each requirement is traceable to at least one stakeholder need (via frame or derive relationships, or doc comment reference).
                8. Each requirement text is verifiable — check for vague qualifiers without measurable criteria (e.g., 'fast', 'easy', 'reliable' without a threshold).
                9. Each requirement is solution-neutral — check for implementation-specific language (named technologies, specific designs) that constrain the solution unnecessarily.
                10. The set of requirements covers all defined use cases — every use case should be reflected in at least one functional requirement.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata functionalContextAI : AI about functionalContext {
            name = "sysmod-functional-architecture";
            create_prompt =
                "1. If a functional architecture is required, specialize specificationContext (black-box view) within functionalContext. Do not specialize specificationContextImpl — the functional architecture must not depend on the physical internal structure of the system.
                2. Redefine the inherited functionalSystem part (which redefines the black-box solution soi) as the root of the functional architecture (e.g., developed with the FAS method). It inherits the system ports, so functions can be related to the system's external interfaces.
                3. Define the top-level functions as action usages or part usages within the functionalSystem.
                4. If allocations to the logical architecture are known, note them; formal allocations are expressed via the functional2logical allocation in the project.
                5. Create the SysML v2 textual notation for the functionalContext.
                6. If the user asks to insert the functionalContext into the SysML model, find the project and redefine the inherited functionalContext part usage (note: multiplicity is [0..1]).";
            create_questions = (
                "Is a functional architecture required for this project?",
                "What are the top-level functions the system must perform?",
                "Should the functional architecture follow the FAS method or another approach?",
            );
            validation_prompt =
                "Validate the functionalContext against the SYSMOD Functional Architecture concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. If present, the functionalContext part usage specializes specificationContext.
                2. A functionalSystem part is present as the root of the functional decomposition, redefining the black-box solution soi.
                3. At least one top-level function is defined as an action usage or part usage within the functionalSystem.
                4. Each top-level function is traceable to at least one system requirement (via satisfy, refine, or doc comment reference).
                5. Functions are technology-independent — check for implementation-specific naming or structure that belongs in the logical or product architecture.
                6. If a logicalContext is present in the project, a functional2logical allocation is defined connecting the functionalContext to the logicalContext.
                7. The functionalSystem contains only functional blocks — no physical or internal structure of the system, which belongs in the white-box solution, logical, or product contexts.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata logicalContextAI : AI about logicalContext {
            name = "sysmod-logical-architecture";
            create_prompt =
                "1. If a logical architecture is required, specialize specificationContext by redefining the soi part for the logical level.
                2. Define logical components as part usages within logicalSystem (the redefined black-box soi), representing technology-independent building blocks that realize the functional architecture.
                3. If allocations from the functional architecture are known, note them; formal allocations are expressed via the functional2logical allocation in the project.
                4. If allocations to the product architecture are known, note them; formal allocations are expressed via the logical2product allocation in the project.
                5. Create the SysML v2 textual notation for the logicalContext.
                6. If the user asks to insert the logicalContext into the SysML model, find the project and redefine the inherited logicalContext part usage (note: multiplicity is [0..1]).";
            create_questions = (
                "Is a logical architecture required for this project?",
                "What are the key logical components or subsystems?",
                "Are there technology-independent partitioning principles to apply (e.g., separation of concerns, layers)?",
            );
            validation_prompt =
                "Validate the logicalContext against the SYSMOD Logical Architecture concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. If present, the logicalContext part usage specializes specificationContext.
                2. At least one logical component is defined as a part usage within logicalSystem.
                3. Logical components are technology-independent — check for product-specific naming, vendor names, physical form factors, or deployment-specific details that belong in the productContext.
                4. Each logical component is traceable to at least one function from the functionalContext (if present) via allocation or doc comment.
                5. If a functionalContext is present in the project, a functional2logical allocation is defined connecting functionalContext to logicalContext.
                6. If a productContext is present in the project, a logical2product allocation is defined connecting logicalContext to productContext.
                7. Logical component interfaces are defined where components interact, using port and interface definitions.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata productContextAI : AI about productContext {
            name = "sysmod-product-architecture";
            create_prompt =
                "1. Specialize specificationContextImpl for the product architecture by redefining the soiImpl part with a concrete product-level definition.
                2. Define product components as part usages within productSystem (the redefined white-box soiImpl), representing physical or deployable building blocks (hardware, software components, assemblies).
                3. If allocations from the logical architecture are known, note them; formal allocations are expressed via the logical2product allocation in the project.
                4. Include interfaces between product components where relevant.
                5. Create the SysML v2 textual notation for the productContext.
                6. If the user asks to insert the productContext into the SysML model, find the project and redefine the inherited productContext part usage.";
            create_questions = (
                "What are the main physical or deployable components of the system?",
                "Are there hardware/software splits or deployment boundaries to model?",
                "Which product components are derived from the logical architecture?",
            );
            validation_prompt =
                "Validate the productContext against the SYSMOD Product Architecture concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. The productContext part usage is present in the project and specializes specificationContextImpl.
                2. At least one product component is defined as a part usage within productSystem.
                3. Product components represent concrete, physical or deployable building blocks — check that logical or functional abstractions have been resolved to specific technologies, hardware types, or software components.
                4. Each product component is traceable to at least one logical component from the logicalContext (if present) via the logical2product allocation or doc comment.
                5. If a logicalContext is present in the project, a logical2product allocation is defined connecting logicalContext to productContext.
                6. Interfaces between product components are defined where components interact physically or through APIs.
                7. All system requirements are satisfied — verify that a satisfy relationship chain exists from the product architecture back to the systemRequirementSpecification.
                8. Every dependency between two product components crosses only through a defined port/interface — flag any part-to-part reference that bypasses the published interface. A back-door dependency is both a MOSA violation and the exact thing that breaks module-scoped context retrieval.
                9. Each component's published interface is specified completely enough that a neighbor — or an AI assistant — never needs that component's internal structure to use it correctly.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }

        metadata subProjectsAI : AI about subProjects {
            name = "sysmod-sub-projects";
            create_prompt =
                "1. If the project is decomposed into sub-projects, create occurrence definitions specializing Project (or AIProject) for each sub-project.
                2. Add each sub-project as an occurrence usage subsetting subProjects within the parent project.
                3. Ensure each sub-project has its own projectOwner, brownfieldContext, and problemStatement as appropriate.
                4. Cross-reference shared artifacts (e.g., shared stakeholders or requirements) by subsetting or referencing the parent project's elements.
                5. Create the SysML v2 textual notation for all sub-project definitions and their usages.
                6. If the user asks to insert sub-projects into the SysML model, find the parent project and add the sub-project occurrence usages.";
            create_questions = (
                "Should the project be decomposed into sub-projects?",
                "What are the names and scopes of the sub-projects?",
                "Do the sub-projects share stakeholders or requirements with the parent project?",
            );
            validation_prompt =
                "Validate the subProjects against the SYSMOD sub-project decomposition concept and report findings grouped as errors, warnings, and suggestions.
                Check:
                1. Each sub-project occurrence usage subsets the inherited subProjects and is typed by an occurrence definition specializing Project or AIProject.
                2. Each sub-project has at least a projectOwner and a brownfieldContext defined.
                3. Each sub-project has a problemStatement that is consistent with and narrower in scope than the parent project's problemStatement.
                4. Shared stakeholders between parent and sub-projects are referenced by subsetting the parent project's stakeholder part usages rather than duplicated as independent definitions.
                5. There are no overlapping scopes between sibling sub-projects — each sub-project addresses a distinct part of the parent problem.
                6. Each sub-project has a meaningful name and doc comment describing its scope and relationship to the parent project.
                Report each finding with the element name, the violated SYSMOD rule, and a concrete suggestion for correction.";
        }
    }    
}
