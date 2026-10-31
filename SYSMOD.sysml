library package SYSMOD {
    doc
    /* 
     * Definition of SYSMOD v5 for SysML v2
     *
     * Version v5.1.8
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

        //
        // Project Cover
        //
        action defaultProcess : SYSMODProcesses::SYSMODDefaultProcess {
            doc
            /* The SYSMOD process performed by the project. It defaults to SYSMODDefaultProcess and can be redefined with a specialization of it to tailor the process. */
            in attribute projectOwner = Project::projectOwner.name;
            in attribute purpose = Project::purpose;
        }

        attribute purpose : ScalarValues::String {
            doc
            /* The purpose of the project is a brief description of the purpose of the project. */
        }

        part projectOwner :> projectStakeholders {
            doc
            /* The Project Owner is a special Stakeholder who is in charge of the Project. */
            attribute :>> risk default LevelKind::critical;
            attribute :>> effort default LevelKind::low;
            attribute :>> categories default StakeholderCategoryKind::requirementOwner;
        }

        //
        // Problem Statement
        //
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
        concern stakeholderNeeds : ExtendedConcern {
            doc
            /* The concern stakeholderNeeds is the root element for all stakeholder needs which will be translated into system requirements. The needs are based on the brownfield system (white box view) and frame the problem statement. */
            subject brownfieldSystem :> Project::brownfieldContextImpl.soiImpl;
            frame problemStatement;
        }
        part brownfieldContext : SystemContext {
            doc
            /* The Brownfield Context includes the system and actors that are already identified at the start of the Project. These constraints limit the set of possible solutions. This is the black box context without specifying the internals of the system of interest. */
            part <soi> systemOfInterest :>> soi {
                doc
                /* The existing (brownfield) system of interest as a black box. It is the explicit anchor for the refinement along the context chain. */
            }
        }
        part brownfieldContextImpl :> brownfieldContext {
            doc
            /* The implementation of the brownfield context includes the internal structure of the system of interest. This is the white box context. */
            part <soiImpl> systemOfInterestImpl :>> soi {
                doc
                /* The white box view of the existing system of interest including its internal structure. It redefines the black box soi. */
            }
        }

        // 
        // The System Idea and the System Objectives
        //
        concern systemObjectives : ExtendedConcern {
            doc
            /* The System Objectives are the measurable goals of the system idea. They frame the
             * stakeholder needs and are the basis for the system requirements and for validation. */
            subject systemIdea :> Project::systemIdeaContext.soi;
            stakeholder projectOwner :> Project::projectOwner;
            frame stakeholderNeeds;
        }
        
        part systemIdeaContext :> brownfieldContext {
            doc
            /* The system idea context contains the system idea and additional actors, if necessary. It specializes the black box brownfield context. */
            part <soi> systemIdeaSystem :>> brownfieldContext::soi {
                doc
                /* The system idea as a black box. It redefines the brownfield system of interest. */
            }
        }
        part systemIdeaContextImpl :> systemIdeaContext, brownfieldContextImpl {
            doc
            /* The white box view of the system idea context. It combines the black box system idea context with the internal structure view inherited from the brownfield implementation context. */
            part <soiImpl> systemIdeaSystemImpl :>> systemIdeaContext::soi, brownfieldContextImpl::soiImpl {
                doc
                /* The system idea is the answer to the problem statement. It is a rough, elevator-pitch-style outline of the system designed to solve the problem. The system idea specializes the brownfield system. */
                satisfy Project::problemStatement;
            }
        }
        part specificationContext :> systemIdeaContext {
            doc
            /* The specification context includes the actors and the system, along with specific subcomponents, which are defined during the requirements analysis. The specification context is also the owner of the system use cases. The context specializes the black box system idea context. */
            part <soi> specificationSystem :>> systemIdeaContext::soi {
                doc
                /* The specification system as a black box. It redefines the system idea and is the subject of the system requirements and use cases. */
            }
        }
        part specificationContextImpl :> specificationContext, systemIdeaContextImpl {
            doc
            /* The white box view of the specification context. It combines the black box specification context with the internal structure view inherited from the system idea implementation context. */
            part <soiImpl> specificationSystemImpl :>> specificationContext::soi, systemIdeaContextImpl::soiImpl {
                doc
                /* The white box view of the specification system including its internal structure. */
            }
        }
        requirement systemRequirementSpecification : ExtendedRequirement {
            doc
            /* The System Requirement Specification is the root element for system requirements. They frame the stakeholder needs. */
            subject specificationSystem :> specificationContext.soi;
            frame stakeholderNeeds;
        }
        part functionalContext[0..1] :> specificationContext {
            doc
            /* The Functional Context is optional and specializes the black box specification context. It provides the context for a functional architecture, for example, developed with the FAS method. It deliberately does not specialize the white box specification context, and neither does the functional context implementation: the functional architecture does not depend on the physical internal structure of the system. The functional blocks are the internal structure of the functional system and belong to the white box functional context implementation. */
            part <soi> functionalSystem :>> specificationContext::soi {
                doc
                /* The Functional System is the root element of the functional architecture. It redefines the black box specification system and thereby inherits the context information such as the system ports, so that functions can be related to the system's external interfaces without depending on its physical internal structure. */
            }
        }
        part functionalContextImpl[0..1] :> functionalContext {
            doc
            /* The Functional Context Implementation is optional and the white box view of the functional context. It specializes the functional context and contains the internal structure of the functional system, i.e., its functional blocks. */
            part <soiImpl> functionalSystemImpl :>> functionalContext::soi {
                doc
                /* The white box view of the functional system. It redefines the functional system and contains the functional blocks of the functional architecture. It does not inherit the internal structure of the white box specification system. */
            }
        }
        part logicalContext[0..1] :> specificationContext {
            doc
            /* The Logical Context is optional and specializes the black box specification context. It provides the context for a logical architecture with technology-independent building blocks. */
            part <soi> logicalSystem :>> specificationContext::soi {
                doc
                /* The Logical System is the root element of the logical architecture. It redefines the black box specification system and thereby inherits the context information such as the system ports. */
            }
        }
        part logicalContextImpl[0..1] :> logicalContext, specificationContextImpl {
            doc
            /* The Logical Context Implementation is optional and the white box view of the logical context. It specializes the logical context and the white box specification context and contains the internal structure of the logical system, i.e., its technology-independent building blocks. */
            part <soiImpl> logicalSystemImpl :>> logicalContext::soi, specificationContextImpl::soiImpl {
                doc
                /* The white box view of the logical system. It redefines the logical system and the white box specification system and contains the technology-independent building blocks of the logical architecture. */
            }
        }
        part productContext :> specificationContext {
            doc
            /* The Product Context specializes the black box specification context. It provides the context for a product architecture with concrete, physical or deployable building blocks. */
            part <soi> productSystem :>> specificationContext::soi {
                doc
                /* The Product System is the root element of the product architecture. It redefines the black box specification system and thereby inherits the context information such as the system ports. */
            }
        }
        part productContextImpl :> productContext, specificationContextImpl {
            doc
            /* The Product Context Implementation is the white box view of the product context. It specializes the product context and the white box specification context and contains the internal structure of the product system, i.e., its concrete, physical or deployable building blocks. */
            part <soiImpl> productSystemImpl :>> productContext::soi, specificationContextImpl::soiImpl {
                doc
                /* The white box view of the product system. It redefines the product system and the white box specification system and contains the concrete, physical or deployable building blocks of the product architecture. It satisfies the system requirements and is the subject of the verification cases. */
                satisfy systemRequirementSpecification;
            }
        }

        //
        // Architecture Allocations
        //
        allocation functional2logical [0..1] allocate functionalContext to logicalContext {
            doc
            /* Allocation of the functional architecture to the logical architecture. Created by the modelLogicalArchitecture step. */
        }
        allocation functionalImpl2logicalImpl [0..1] allocate functionalContextImpl to logicalContextImpl {
            doc
            /* Allocation of the white box functional architecture, i.e., its functional blocks, to the white box logical architecture. Created by the modelLogicalArchitecture step. */
        }
        allocation logical2product [0..1] allocate logicalContext to productContext {
            doc
            /* Allocation of the logical architecture to the product architecture. Created by the modelProductArchitecture step. */
        }
        allocation logicalImpl2productImpl [0..1] allocate logicalContextImpl to productContextImpl {
            doc
            /* Allocation of the white box logical architecture, i.e., its logical building blocks, to the white box product architecture. Created by the modelProductArchitecture step. */
        }

        //
        // Verification
        //
        part verificationContext :> productContextImpl {
            doc
            /* The context in which the verification takes place, including all relevant actors and the system of interest. */
        
            verification verificationCases[*] {
                doc
                /* The verification cases verify and validate the system requirements. */
                subject productSystem :> soiImpl;
            }
        }

        //
        // Sub Projects
        //
        occurrence subProjects : Project [*] {
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
            /* The system of interest as a black box. Implementation contexts redefine it to add the white box view. */
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
    metadata def system {
        doc /* System is merely a label used to tag an element. The element could play a different role in a different context. */
        :> annotatedElement : SysML::PartUsage;        
    }

    // Actor Categories
    metadata def user {
        doc /* User is merely a label used to tag an element. The element could play a different role in a different context. */
        :> annotatedElement : SysML::PartUsage;
    }
    metadata def externalSystem {
        doc /* ExternalSystem is merely a label used to tag an element. The element could play a different role in a different context. */
        :> annotatedElement : SysML::PartUsage;
    }
    metadata def environmentalEffect {
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

    use case def SecondaryUseCase :> SystemUseCase {
        doc /* Marks a use case as a SYSMOD secondary use case: a use case that is not started directly by an actor and does not deliver a result of value to an actor on its own, but describes a part of the behavior shared by other use cases, which include it. */
    }
    use case secondaryUseCases[*] : SecondaryUseCase;
    use case def SystemProcess :> SystemUseCase {
        doc /* Marks a use case as a SYSMOD system process: a use case that describes the logical and temporal order of several related system use cases that together form one overall process of the system. */
    }
    use case systemProcesses[*] : SystemProcess;
    use case def ContinuousUseCase :> SystemUseCase {
        doc /* Marks a use case as a SYSMOD continuous use case: a use case whose result is delivered continuously while it runs rather than once at its end, e.g., monitoring or controlling a quantity, so it typically has no regular termination. */
    }
    use case continuousUseCases[*] : ContinuousUseCase;

    //
    // SYSMOD Stakeholder and Requirement Concepts
    //
    part def ExtendedStakeholder {
        doc
        /* SYSMOD-specific stakeholder concept with attributes to assess and prioritize stakeholders. Stakeholders are individuals or organizations with an interest in the system and are potential sources of requirements. */
        attribute name : ScalarValues::String {
            doc
            /* Name of the stakeholder. */
        }
        attribute risk : LevelKind default LevelKind::none {
            doc
            /* What is the risk of failure if I ignore this stakeholder? */
        }
        attribute effort : LevelKind default LevelKind::none {
            doc
            /* How much effort is involved in identifying this stakeholder's concerns and requirements? */
        }
        derived attribute attention : ScalarValues::Real = risk * effort {
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
        middle = 0.5;
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
    }    
    metadata def <secondaryUseCase> SecondaryUsageCaseMetadata
        :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #secondaryUseCase. */
        :>> baseType = secondaryUseCases meta SysML::Type;
        :> annotatedElement : SysML::UseCaseDefinition;
    }
    metadata def <systemProcess> SystemProcessMetadata
        :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #systemProcess. */
        :>> baseType = systemProcesses meta SysML::Type;
        :> annotatedElement : SysML::UseCaseDefinition;
    }
    metadata def <continuousUseCase> ContinuousUseCaseMetadata
        :> Metaobjects::SemanticMetadata {
        doc
        /* Enables the user-defined keyword #continuousUseCase. */
        :>> baseType = continuousUseCases meta SysML::Type;
        :> annotatedElement : SysML::UseCaseDefinition;
    }

    package SYSMODProcesses {
        doc
        /*
         * The SYSMOD process definitions.
         *
         * SYSMODDefaultProcess is the default SYSMOD workflow and is performed by every project as Project::defaultProcess.
         * It consists of one action definition per SYSMOD step. Each step reads artifacts of the project and produces
         * the project artifacts it is responsible for (flows to and bindings with the project features).
         * The successions define the default order; all steps after SetupProject are optional ([0..1]), for example,
         * ModelBrownfieldSystem in a greenfield project or the functional and logical architectures.
         *
         * Each step refines one or more ISO/IEC/IEEE 15288 processes from the library package ISO15288Processes in SYSMOD15288.sysml (#refinement dependencies at the end of this package).
         * A project can tailor the process by redefining Project::defaultProcess with a specialization of SYSMODDefaultProcess.
         *
         * Step names follow the pattern verb + product. The verb states how formal the content of the step's output is,
         * from informal to fully formal:
         *
         * | Level | Verb     | Result                                                                                         | Test question                                                              | Steps |
         * |-------|----------|------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|-------|
         * | 1     | describe | Text in natural language without a prescribed structure, e.g., an elevator pitch               | Is a paragraph of prose enough?                                            | DescribeProblemStatement, DescribeSystemIdea |
         * | 2     | identify | Named elements with a short text, optionally traced or classified                              | Is it about what exists, not how it is structured?                         | IdentifyStakeholders, IdentifyStakeholderNeeds, identifyUseCases |
         * | 3     | define   | Elements with fixed attributes and clear boundaries                                            | Must ambiguity be ruled out, without needing structure yet?                | (none yet) |
         * | 4     | model    | Structure: contexts, parts, connections, allocations, and refinements                          | Does the result connect to other model elements as structure?              | ModelBrownfieldSystem, modelSpecificationContext, ModelFunctionalArchitecture, ModelLogicalArchitecture, ModelProductArchitecture |
         * | 5     | specify  | Verifiable or executable content: measurable requirements, constraints, and verification cases | Can a tool or test evaluate the result?                                    | SpecifySystem, specifySystemRequirements, SpecifyVerificationContext |
         *
         * SetupProject is outside the scale, as it organizes the project rather than producing a product.
         * A step that contains nested steps takes the verb of its most formal nested step.
         * Verbs outside this scale name activities, not step outputs: set up (project organization), elicit (gather
         * information from stakeholders), elaborate (refine an existing output without changing its level), derive,
         * analyze, verify, and validate.
         */
        private import ModelingMetadata::refinement;

        action def SYSMODDefaultProcess {
            doc
            /*
             * The default SYSMOD process: setupProject, modelBrownfieldSystem, describeProblemStatement, identifyStakeholders,
             * identifyStakeholderNeeds, describeSystemIdea, specifySystem, modelFunctionalArchitecture, modelLogicalArchitecture,
             * modelProductArchitecture, and specifyVerificationContext, in this order.
             * The project that performs the process is referenced by project. Outputs of the steps flow into the corresponding project features,
             * and the inputs of the steps are bound to the project features created by earlier steps.
             * The input parameters are the information a human or an AI assistant provides to start the process. */
            ref occurrence project :>> this : Project;

            in attribute projectOwnerName : ScalarValues::String {
                doc
                /* The project owner is the stakeholder who is in charge of the project. */
            }
            in attribute projectPurpose : ScalarValues::String {
                doc
                /* The project purpose is a brief description of the purpose of the project. */
            }
            in item brownfieldArchitecture : ArchitectureDescription {
                doc
                /* The brownfield architecture is a description of the existing system. */
            }
            in attribute problemStatementText : ScalarValues::String {
                doc
                /* The problem statement is a brief description of the problem the system of interest is intended to solve. */
            }
            in item systemIdeaArchitecture : ArchitectureDescription {
                doc
                /* The system idea architecture is a description of the proposed system. */
            }
            in item functionalArchitecture : ArchitectureDescription {
                doc
                /* The functional architecture is a description of the functions and functional blocks of the solution system. */
            }
            in item logicalArchitecture : ArchitectureDescription {
                doc
                /* The logical architecture is a description of the technology-independent building blocks of the solution system. */
            }
            in item productArchitecture : ArchitectureDescription {
                doc
                /* The product architecture is a description of the concrete, physical or deployable building blocks of the solution system. */
            }

            first start then setupProject;
            first [0..1]setupProject then [0..1]modelBrownfieldSystem;
            first [0..1]modelBrownfieldSystem then [0..1]describeProblemStatement;
            first [0..1]describeProblemStatement then [0..1]identifyStakeholders;
            first [0..1]identifyStakeholders then [0..1]identifyStakeholderNeeds;
            first [0..1]identifyStakeholderNeeds then [0..1]describeSystemIdea;
            first [0..1]describeSystemIdea then [0..1]specifySystem;
            first [0..1]specifySystem then [0..1]modelFunctionalArchitecture;
            first [0..1]modelFunctionalArchitecture then [0..1]modelLogicalArchitecture;
            first [0..1]modelLogicalArchitecture then [0..1]modelProductArchitecture;
            first [0..1]modelProductArchitecture then [0..1]specifyVerificationContext;
            first [0..1]specifyVerificationContext then done;

            flow from modelBrownfieldSystem.brownfieldContext to project.brownfieldContext;
            flow from modelBrownfieldSystem.brownfieldContextImpl to project.brownfieldContextImpl;
            flow from describeProblemStatement.problemStatement to project.problemStatement;
            flow from identifyStakeholders.projectStakeholders to project.projectStakeholders;
            flow from identifyStakeholderNeeds.stakeholderNeeds to project.stakeholderNeeds;
            flow from describeSystemIdea.systemIdeaContext to project.systemIdeaContext;
            flow from describeSystemIdea.systemIdeaContextImpl to project.systemIdeaContextImpl;
            flow from describeSystemIdea.systemObjectives to project.systemObjectives;
            flow from specifySystem.specificationContext to project.specificationContext;
            flow from specifySystem.specificationContextImpl to project.specificationContextImpl;
            flow from specifySystem.systemRequirementSpecification to project.systemRequirementSpecification;
            flow from modelFunctionalArchitecture.functionalContext to project.functionalContext;
            flow from modelFunctionalArchitecture.functionalContextImpl to project.functionalContextImpl;
            flow from modelLogicalArchitecture.logicalContext to project.logicalContext;
            flow from modelLogicalArchitecture.logicalContextImpl to project.logicalContextImpl;
            flow from modelLogicalArchitecture.functional2logical to project.functional2logical;
            flow from modelLogicalArchitecture.functionalImpl2logicalImpl to project.functionalImpl2logicalImpl;
            flow from modelProductArchitecture.productContext to project.productContext;
            flow from modelProductArchitecture.productContextImpl to project.productContextImpl;
            flow from modelProductArchitecture.logical2product to project.logical2product;
            flow from modelProductArchitecture.logicalImpl2productImpl to project.logicalImpl2productImpl;
            flow from specifyVerificationContext.verificationContext to project.verificationContext;

            bind project.brownfieldContextImpl = describeProblemStatement.brownfieldContextImpl;
            bind project.brownfieldContextImpl = modelBrownfieldSystem.brownfieldContextImpl;
            bind project.problemStatement = identifyStakeholders.problemStatement;
            bind project.problemStatement = identifyStakeholderNeeds.problemStatement;
            bind project.projectStakeholders = identifyStakeholderNeeds.projectStakeholders;
            bind project.problemStatement = describeSystemIdea.problemStatement;
            bind project.stakeholderNeeds = describeSystemIdea.stakeholderNeeds;
            bind project.systemIdeaContextImpl = specifySystem.systemIdeaContextImpl;
            bind project.stakeholderNeeds = specifySystem.stakeholderNeeds;
            bind project.systemObjectives = specifySystem.systemObjectives;
            bind project.specificationContext = modelFunctionalArchitecture.specificationContext;
            bind project.specificationContextImpl = modelLogicalArchitecture.specificationContextImpl;
            bind project.functionalContext = modelLogicalArchitecture.functionalContext;
            bind project.functionalContextImpl = modelLogicalArchitecture.functionalContextImpl;
            bind project.specificationContextImpl = modelProductArchitecture.specificationContextImpl;
            bind project.functionalContextImpl = modelProductArchitecture.functionalContextImpl;
            bind project.logicalContext = modelProductArchitecture.logicalContext;
            bind project.logicalContextImpl = modelProductArchitecture.logicalContextImpl;
            bind project.systemRequirementSpecification = specifyVerificationContext.systemRequirementSpecification;
            bind project.productContextImpl = specifyVerificationContext.productContextImpl;

            action setupProject : SetupProject {
                @StepStatus;
                in attribute projectOwnerName = SYSMODDefaultProcess::projectOwnerName;
                in attribute projectPurpose = SYSMODDefaultProcess::projectPurpose;
            }
            action modelBrownfieldSystem : ModelBrownfieldSystem {
                @StepStatus;
                in item brownfieldArchitecture = SYSMODDefaultProcess::brownfieldArchitecture;
            }
            action describeProblemStatement : DescribeProblemStatement {
                @StepStatus;
                in part projectOwner = SYSMODDefaultProcess::project.projectOwner;
                in attribute problemStatementText = SYSMODDefaultProcess::problemStatementText;
            }
            action identifyStakeholders : IdentifyStakeholders { @StepStatus; }
            action identifyStakeholderNeeds : IdentifyStakeholderNeeds { @StepStatus; }
            action describeSystemIdea : DescribeSystemIdea {
                @StepStatus;
                in item systemIdeaArchitecture = SYSMODDefaultProcess::systemIdeaArchitecture;
            }
            action specifySystem : SpecifySystem { @StepStatus; } 
            action modelFunctionalArchitecture : ModelFunctionalArchitecture {
                @StepStatus;
                in item functionalArchitecture = SYSMODDefaultProcess::functionalArchitecture;
            }
            action modelLogicalArchitecture : ModelLogicalArchitecture {
                @StepStatus;
                in item logicalArchitecture = SYSMODDefaultProcess::logicalArchitecture;
            }
            action modelProductArchitecture : ModelProductArchitecture {
                @StepStatus;
                in item productArchitecture = SYSMODDefaultProcess::productArchitecture;
            }
            action specifyVerificationContext : SpecifyVerificationContext { @StepStatus; }
        }

        action def SetupProject { 
            doc
            /* Sets up a new SYSMOD project: assigns the name of the project owner and the purpose of the project. Refines the ISO 15288 Project Planning process. */
            ref occurrence project :>> this : Project;

            in attribute projectOwnerName : ScalarValues::String {
                doc
                /* The project owner is the stakeholder who is in charge of the project. */
            }
            in attribute projectPurpose : ScalarValues::String {
                doc
                /* The project purpose is a brief description of the purpose of the project. */
            }

            assign project.projectOwner.name := projectOwnerName;
            assign project.purpose := projectPurpose;
        }

        action def ModelBrownfieldSystem {
            doc
            /* Models the existing (brownfield) system and its actors as black box context (brownfieldContext) and white box context (brownfieldContextImpl), based on a given description of the existing architecture. Optional for greenfield projects. Refines the ISO 15288 Business or Mission Analysis process. */
            in item brownfieldArchitecture : ArchitectureDescription;
            out part brownfieldContext : SystemContext;
            out part brownfieldContextImpl : SystemContext;
        }

        action def DescribeProblemStatement {
            doc
            /* Describes the problem statement: a solution-free elevator pitch of the problem, with the brownfield system as subject and the project owner as stakeholder. Refines the ISO 15288 Business or Mission Analysis process. */
            in part projectOwner : ExtendedStakeholder;
            in attribute problemStatementText : ScalarValues::String {
                doc
                /* The problem statement is a brief description of the problem the system of interest is intended to solve. */
            }
            in part brownfieldContextImpl : SystemContext;
            out concern problemStatement : ExtendedConcern;
        }

        action def IdentifyStakeholders {
            doc
            /* Identifies the stakeholders of the project based on the problem statement and assesses their risk, effort, and categories. Refines the ISO 15288 Business or Mission Analysis process (identification of the major stakeholders) and the Stakeholder Needs and Requirements Definition process. */
            in concern problemStatement : ExtendedConcern;
            out part projectStakeholders[*] : ExtendedStakeholder {
                doc /* The stakeholders of the project are individuals and organizations that have an interest in the system. The list includes the project owner retrieved from the problemStatement.*/
            }
        }

        action def IdentifyStakeholderNeeds {
            doc
            /* Identifies the needs of the stakeholders at intent level, framed by the problem statement and traced to the stakeholders they come from. Refines the ISO 15288 Stakeholder Needs and Requirements Definition process. */
            in concern problemStatement : ExtendedConcern;
            in part projectStakeholders[*] : ExtendedStakeholder;
            out concern stakeholderNeeds : ExtendedConcern;
        }

        action def DescribeSystemIdea {
            doc
            /* Describes the system idea: a conceptual, elevator-pitch-style outline of the new or changed system that answers the problem statement and the stakeholder needs, as black box (systemIdeaContext) and white box (systemIdeaContextImpl) context, and its measurable goals, the system objectives. Refines the ISO 15288 Business or Mission Analysis process. */
            in item systemIdeaArchitecture : ArchitectureDescription;
            in concern problemStatement : ExtendedConcern;
            in concern stakeholderNeeds : ExtendedConcern;
            out part systemIdeaContext : SystemContext;
            out part systemIdeaContextImpl : SystemContext;
            out concern systemObjectives : ExtendedConcern;
        }

        action def SpecifySystem {
            doc
            /* Specifies the system based on the system idea, the system objectives, and the stakeholder needs: the specification contexts, the system use cases, and the system requirements. Refines the ISO 15288 System Requirements Definition process. */
            in part systemIdeaContextImpl : SystemContext;
            in concern stakeholderNeeds : ExtendedConcern;
            in concern systemObjectives : ExtendedConcern;
            out part specificationContext : SystemContext;
            out part specificationContextImpl : SystemContext;
            out requirement systemRequirementSpecification : ExtendedRequirement;

            action modelSpecificationContext {
                doc
                /* Models the black box and white box specification contexts by refining the system idea contexts. */
                in part systemIdeaContextImpl : SystemContext = SpecifySystem::systemIdeaContextImpl;
                out part specificationContext : SystemContext = SpecifySystem::specificationContext;
                out part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
            }
            action identifyUseCases {
                doc
                /* Identifies the system use cases of the specification context that describe how the actors interact with the system. */
                in part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
                in concern stakeholderNeeds : ExtendedConcern = SpecifySystem::stakeholderNeeds;
                out use case systemUseCases[*] : SystemUseCase = SpecifySystem::specificationContext.useCases;
            }
            action specifySystemRequirements {
                doc
                /* Specifies the verifiable, solution-neutral system requirements that frame the stakeholder needs. */
                in part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
                in concern stakeholderNeeds : ExtendedConcern = SpecifySystem::stakeholderNeeds;
                in concern systemObjectives : ExtendedConcern = SpecifySystem::systemObjectives;
                out requirement systemRequirementSpecification : ExtendedRequirement = SpecifySystem::systemRequirementSpecification;
            }
        }

        action def ModelFunctionalArchitecture {
            doc
            /* Models the optional functional architecture based on the black box specification context: the black box functional context and the white box functional context with the functional blocks, and the #refinement dependencies from the functional elements to the system requirements they refine. Refines the ISO 15288 System Architecture Definition process. */
            in item functionalArchitecture : ArchitectureDescription;
            in part specificationContext : SystemContext;
            out part functionalContext[0..1] : SystemContext;
            out part functionalContextImpl[0..1] : SystemContext;
        }

        action def ModelLogicalArchitecture {
            doc
            /* Models the optional logical architecture based on the white box specification context and, if present, the white box functional context: the black box logical context and the white box logical context with the technology-independent building blocks, the #refinement dependencies from the logical elements to the system requirements they refine, and, if a functional architecture is present, the allocations functional2logical and functionalImpl2logicalImpl from the functional to the logical architecture. Refines the ISO 15288 System Architecture Definition process. */
            in item logicalArchitecture : ArchitectureDescription;
            in part specificationContextImpl : SystemContext;
            in part functionalContext[0..1] : SystemContext;
            in part functionalContextImpl[0..1] : SystemContext;
            out part logicalContext[0..1] : SystemContext;
            out part logicalContextImpl[0..1] : SystemContext;
            out abstract allocation functional2logical[0..1];
            out abstract allocation functionalImpl2logicalImpl[0..1];
        }

        action def ModelProductArchitecture {
            doc
            /* Models the product architecture based on the white box specification context and, if present, the white box functional and logical contexts: the black box product context and the white box product context with the concrete, physical or deployable building blocks, and, if a logical architecture is present, the allocations logical2product and logicalImpl2productImpl from the logical to the product architecture. Refines the ISO 15288 System Architecture Definition process. */
            in item productArchitecture : ArchitectureDescription;
            in part specificationContextImpl : SystemContext;
            in part functionalContextImpl[0..1] : SystemContext;
            in part logicalContext[0..1] : SystemContext;
            in part logicalContextImpl[0..1] : SystemContext;
            out part productContext : SystemContext;
            out part productContextImpl : SystemContext;
            out abstract allocation logical2product[0..1];
            out abstract allocation logicalImpl2productImpl[0..1];
        }

        action def SpecifyVerificationContext {
            doc
            /* Specifies the verification context with the test systems, e.g., test benches or a wind tunnel, as additional actors, and its verification cases that verify the product system against the system requirements and validate it against the stakeholder needs and the problem statement. Refines the ISO 15288 Verification and Validation processes. */
            in requirement systemRequirementSpecification : ExtendedRequirement;
            in part productContextImpl : SystemContext;
            out part verificationContext : SystemContext;
        }

        item def ArchitectureDescription {
            doc
            /* An informal description of a system architecture, given by a human or an AI assistant as input to a process step, for example, a text, sketch, or document of the existing system. */
        }

        //
        // Refinement of the ISO 15288 processes by the SYSMOD processes
        //
        #refinement dependency SetupProject to ISO15288Processes::ProjectPlanning;
        #refinement dependency ModelBrownfieldSystem to ISO15288Processes::BusinessOrMissionAnalysis;
        #refinement dependency DescribeProblemStatement to ISO15288Processes::BusinessOrMissionAnalysis;
        #refinement dependency IdentifyStakeholders to ISO15288Processes::StakeholderNeedsAndRequirementsDefinition;
        #refinement dependency IdentifyStakeholders to ISO15288Processes::BusinessOrMissionAnalysis;
        #refinement dependency IdentifyStakeholderNeeds to ISO15288Processes::StakeholderNeedsAndRequirementsDefinition;
        #refinement dependency DescribeSystemIdea to ISO15288Processes::BusinessOrMissionAnalysis;
        #refinement dependency SpecifySystem to ISO15288Processes::SystemRequirementsDefinition;
        #refinement dependency ModelFunctionalArchitecture to ISO15288Processes::SystemArchitectureDefinition;
        #refinement dependency ModelLogicalArchitecture to ISO15288Processes::SystemArchitectureDefinition;
        #refinement dependency ModelProductArchitecture to ISO15288Processes::SystemArchitectureDefinition;
        #refinement dependency SpecifyVerificationContext to ISO15288Processes::Verification;
        #refinement dependency SpecifyVerificationContext to ISO15288Processes::Validation;

        //
        // Additional Elements
        //    
        enum def StepStatusKind { open; inProgress; done; skipped; }
        attribute def Percentage :> ScalarValues::Real {
            assert constraint { that >= 0.0 and that <= 1.0 }
        }
        metadata def StepStatus {
            attribute status : StepStatusKind default StepStatusKind::open;
            attribute percentage : Percentage default = 0.0 as Percentage;
            :> annotatedElement : SysML::ActionUsage;
        }        
    }
}