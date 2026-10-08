library package SYSMOD {
    doc
    /* 
     * Definition of SYSMOD v5 for SysML v2
     *
     * Version v5.1.4
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

        action defaultProcess : SYSMODProcesses::SYSMODDefaultProcess {
            doc
            /* The SYSMOD process performed by the project. It defaults to SYSMODDefaultProcess and can be redefined with a specialization of it to tailor the process. */
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
            /* The Functional Context is optional and specializes the black-box specification context. It provides the context for a functional architecture, for example, developed with the FAS method. It deliberately does not specialize the white-box specification context: a functional architecture contains only functional blocks and must not depend on the physical internal structure of the system. */
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
        verification verificationCases[*] {
            doc
            /* The verification cases verify and validate the system requirements. */
            subject productSystem :> productContext.soiImpl;
        }

        allocation functional2logical [0..1] allocate functionalContext to logicalContext {
            doc
            /* Allocation of the functional architecture to the logical architecture. */
        }
        allocation logical2product [0..1] allocate logicalContext to productContext {
            doc
            /* Allocation of the logical architecture to the product architecture. */
        }

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

    package SYSMODViews {
        view def ProjectView;
        view def ArchitectureView;
        view def RequirementsView;
        view def UseCaseOverviewView;
        view def UseCaseView;

        view def SystemContextView :> StandardViewDefinitions::InterconnectionView {
            filter @SysML::PartUsage or @SysML::PortUsage or @SysML::InterfaceUsage or @SysML::ConnectionUsage or @SysML::UseCaseUsage;
            filter not (@KerML::Element::isLibraryElement);
            render Views::asInterconnectionDiagram;
        }
    }

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
         * SpecifyBrownfieldSystem in a greenfield project or the functional and logical architectures.
         *
         * Each step refines one or more ISO/IEC/IEEE 15288 processes from the package ISO15288Processes (#refinement dependencies at the end of this package).
         * A project can tailor the process by redefining Project::defaultProcess with a specialization of SYSMODDefaultProcess.
         */

        private import ModelingMetadata::refinement;

        action def SYSMODDefaultProcess {
            doc
            /*
             * The default SYSMOD process: setupProject, specifyBrownfieldSystem, specifyProblemStatement, identifyStakeholders,
             * elaborateStakeholderNeeds, pitchSystemIdea, defineSystemSpecification, createSolutionArchitectures, and verifyAndValidateRequirements, in this order.
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
            in item solutionArchitecture : ArchitectureDescription {
                doc
                /* The solution architecture is a description of the solution system. */
            }

            first start then setupProject;
            first [0..1]setupProject then [0..1]specifyBrownfieldSystem;
            first [0..1]specifyBrownfieldSystem then [0..1]specifyProblemStatement;
            first [0..1]specifyProblemStatement then [0..1]identifyStakeholders;
            first [0..1]identifyStakeholders then [0..1]elaborateStakeholderNeeds;
            first [0..1]elaborateStakeholderNeeds then [0..1]pitchSystemIdea;
            first [0..1]pitchSystemIdea then [0..1]defineSystemSpecification;
            first [0..1]defineSystemSpecification then [0..1]createSolutionArchitectures;
            first [0..1]createSolutionArchitectures then [0..1]verifyAndValidateRequirements;
            first [0..1]verifyAndValidateRequirements then done;

            flow from specifyBrownfieldSystem.brownfieldContext to project.brownfieldContext;
            flow from specifyBrownfieldSystem.brownfieldContextImpl to project.brownfieldContextImpl;
            flow from specifyProblemStatement.problemStatement to project.problemStatement;
            flow from identifyStakeholders.projectStakeholders to project.projectStakeholders;
            flow from elaborateStakeholderNeeds.stakeholderNeeds to project.stakeholderNeeds;
            flow from pitchSystemIdea.systemIdeaContext to project.systemIdeaContext;
            flow from pitchSystemIdea.systemIdeaContextImpl to project.systemIdeaContextImpl;
            flow from defineSystemSpecification.specificationContext to project.specificationContext;
            flow from defineSystemSpecification.specificationContextImpl to project.specificationContextImpl;
            flow from defineSystemSpecification.systemRequirementSpecification to project.systemRequirementSpecification;
            flow from createSolutionArchitectures.functionalContext to project.functionalContext;
            flow from createSolutionArchitectures.logicalContext to project.logicalContext;
            flow from createSolutionArchitectures.productContext to project.productContext;
            flow from verifyAndValidateRequirements.verificationCases to project.verificationCases;

            bind project.brownfieldContextImpl = specifyProblemStatement.brownfieldContextImpl;
            bind project.brownfieldContextImpl = specifyBrownfieldSystem.brownfieldContextImpl;
            bind project.problemStatement = identifyStakeholders.problemStatement;
            bind project.problemStatement = elaborateStakeholderNeeds.problemStatement;
            bind project.projectStakeholders = elaborateStakeholderNeeds.projectStakeholders;
            bind project.problemStatement = pitchSystemIdea.problemStatement;
            bind project.stakeholderNeeds = pitchSystemIdea.stakeholderNeeds;
            bind project.systemIdeaContextImpl = defineSystemSpecification.systemIdeaContextImpl;
            bind project.stakeholderNeeds = defineSystemSpecification.stakeholderNeeds;
            bind project.specificationContextImpl = createSolutionArchitectures.specificationContextImpl;
            bind project.systemRequirementSpecification = verifyAndValidateRequirements.systemRequirementSpecification;
            bind project.productContext = verifyAndValidateRequirements.productContext;

            action setupProject : SetupProject {
                in attribute projectOwnerName = SYSMODDefaultProcess::projectOwnerName;
                in attribute projectPurpose = SYSMODDefaultProcess::projectPurpose;
            }
            action specifyBrownfieldSystem : SpecifyBrownfieldSystem {
                in item brownfieldArchitecture = SYSMODDefaultProcess::brownfieldArchitecture;
            }
            action specifyProblemStatement : SpecifyProblemStatement {
                in part projectOwner = SYSMODDefaultProcess::project.projectOwner;
                in attribute problemStatementText = SYSMODDefaultProcess::problemStatementText;
            }
            action identifyStakeholders : IdentifyStakeholders;
            action elaborateStakeholderNeeds : ElaborateStakeholderNeeds;
            action pitchSystemIdea : PitchSystemIdea {
                in item systemIdeaArchitecture = SYSMODDefaultProcess::systemIdeaArchitecture;
            }
            action defineSystemSpecification : DefineSystemSpecification;
            action createSolutionArchitectures : CreateSolutionArchitectures {
                in item solutionArchitecture = SYSMODDefaultProcess::solutionArchitecture;
            }
            action verifyAndValidateRequirements : VerifyAndValidateRequirements;
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

        action def SpecifyBrownfieldSystem {
            doc
            /* Specifies the existing (brownfield) system and its actors as black-box context (brownfieldContext) and white-box context (brownfieldContextImpl), based on a given description of the existing architecture. Optional for greenfield projects. Refines the ISO 15288 Business or Mission Analysis process. */
            in item brownfieldArchitecture : ArchitectureDescription;
            out part brownfieldContext : SystemContext;
            out part brownfieldContextImpl : SystemContext;
        }

        action def SpecifyProblemStatement {
            doc
            /* Specifies the problem statement: a solution-free elevator pitch of the problem, with the brownfield system as subject and the project owner as stakeholder. Refines the ISO 15288 Business or Mission Analysis process. */
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
            /* Identifies the stakeholders of the project based on the problem statement and assesses their risk, effort, and categories. Refines the ISO 15288 Stakeholder Needs and Requirements Definition process. */
            in concern problemStatement : ExtendedConcern;
            out part projectStakeholders[*] : ExtendedStakeholder {
                doc /* The stakeholders of the project are individuals and organizations that have an interest in the system. The list includes the project owner retrieved from the problemStatement.*/
            }
        }

        action def ElaborateStakeholderNeeds {
            doc
            /* Elaborates the needs of the stakeholders at intent level, framed by the problem statement and traced to the stakeholders they come from. Refines the ISO 15288 Stakeholder Needs and Requirements Definition process. */
            in concern problemStatement : ExtendedConcern;
            in part projectStakeholders[*] : ExtendedStakeholder;
            out concern stakeholderNeeds : ExtendedConcern;
        }

        action def PitchSystemIdea {
            doc
            /* Pitches the system idea: a conceptual, elevator-pitch-style outline of the new or changed system that answers the problem statement and the stakeholder needs, as black-box (systemIdeaContext) and white-box (systemIdeaContextImpl) context. Refines the ISO 15288 Business or Mission Analysis process. */
            in item systemIdeaArchitecture : ArchitectureDescription;
            in concern problemStatement : ExtendedConcern;
            in concern stakeholderNeeds : ExtendedConcern;
            out part systemIdeaContext : SystemContext;
            out part systemIdeaContextImpl : SystemContext;
        }

        action def DefineSystemSpecification {
            doc
            /* Defines the system specification based on the system idea and the stakeholder needs: the specification contexts, the system use cases, and the system requirements. Refines the ISO 15288 System Requirements Definition process. */
            in part systemIdeaContextImpl : SystemContext;
            in concern stakeholderNeeds : ExtendedConcern;
            out part specificationContext : SystemContext;
            out part specificationContextImpl : SystemContext;
            out requirement systemRequirementSpecification : ExtendedRequirement;

            action specifySpecificationArchitecture {
                doc
                /* Refines the system idea contexts into the black-box and white-box specification contexts. */
                in part systemIdeaContextImpl : SystemContext = DefineSystemSpecification::systemIdeaContextImpl;
                out part specificationContext : SystemContext = DefineSystemSpecification::specificationContext;
                out part specificationContextImpl : SystemContext = DefineSystemSpecification::specificationContextImpl;
            }
            action identifyUseCases {
                doc
                /* Identifies the system use cases of the specification context that describe how the actors interact with the system. */
                in part specificationContextImpl : SystemContext = DefineSystemSpecification::specificationContextImpl;
                in concern stakeholderNeeds : ExtendedConcern = DefineSystemSpecification::stakeholderNeeds;
                out use case systemUseCases[*] : SystemUseCase = DefineSystemSpecification::specificationContext.useCases;
            }
            action elaborateSystemRequirements {
                doc
                /* Elaborates the verifiable, solution-neutral system requirements that frame the stakeholder needs. */
                in part specificationContextImpl : SystemContext = DefineSystemSpecification::specificationContextImpl;
                in concern stakeholderNeeds : ExtendedConcern = DefineSystemSpecification::stakeholderNeeds;
                out requirement systemRequirementSpecification : ExtendedRequirement = DefineSystemSpecification::systemRequirementSpecification;
            }
        }

        action def CreateSolutionArchitectures {
            doc
            /* Creates the solution architectures based on the white-box specification context: the optional functional and logical architectures and the product architecture. Refines the ISO 15288 System Architecture Definition process. */
            in item solutionArchitecture : ArchitectureDescription;
            in part specificationContextImpl : SystemContext;
            out part functionalContext[0..1] : SystemContext;
            out part logicalContext[0..1] : SystemContext;
            out part productContext : SystemContext;
        }

        action def VerifyAndValidateRequirements {
            doc
            /* Creates the verification cases that verify the product system against the system requirements and validate it against the stakeholder needs and the problem statement. Refines the ISO 15288 Verification and Validation processes. */
            in requirement systemRequirementSpecification : ExtendedRequirement;
            in part productContext : SystemContext;
            out verification verificationCases[*];
        }

        item def ArchitectureDescription {
            doc
            /* An informal description of a system architecture, given by a human or an AI assistant as input to a process step, for example, a text, sketch, or document of the existing system. */
        }

        //
        // Refinement of the ISO 15288 processes by the SYSMOD processes
        //
        #refinement dependency SetupProject to ISO15288Processes::ProjectPlanning;
        #refinement dependency SpecifyBrownfieldSystem to ISO15288Processes::BusinessOrMissionAnalysis;
        #refinement dependency SpecifyProblemStatement to ISO15288Processes::BusinessOrMissionAnalysis;
        #refinement dependency IdentifyStakeholders to ISO15288Processes::StakeholderNeedsAndRequirementsDefinition;
        #refinement dependency ElaborateStakeholderNeeds to ISO15288Processes::StakeholderNeedsAndRequirementsDefinition;
        #refinement dependency PitchSystemIdea to ISO15288Processes::BusinessOrMissionAnalysis;
        #refinement dependency DefineSystemSpecification to ISO15288Processes::SystemRequirementsDefinition;
        #refinement dependency CreateSolutionArchitectures to ISO15288Processes::SystemArchitectureDefinition;
        #refinement dependency VerifyAndValidateRequirements to ISO15288Processes::Verification;
        #refinement dependency VerifyAndValidateRequirements to ISO15288Processes::Validation;
    }

    package ISO15288Processes {
        doc /* Package containing the 30 system life cycle processes of ISO/IEC/IEEE 15288, grouped into agreement, organizational project-enabling, technical management, and technical processes. */

        //
        // Agreement Processes
        //
        action def Acquisition {
            doc
            /* The Acquisition process obtains a product or service in accordance with the acquirer's requirements. */
        }
        action def Supply {
            doc
            /* The Supply process provides an acquirer with a product or service that meets agreed requirements. */
        }

        //
        // Organizational Project-Enabling Processes
        //
        action def LifeCycleModelManagement {
            doc
            /* The Life Cycle Model Management process defines, maintains, and assures availability of policies, life cycle processes, life cycle models, and procedures for use by the organization. */
        }
        action def InfrastructureManagement {
            doc
            /* The Infrastructure Management process provides the infrastructure and services to projects to support organization and project objectives throughout the life cycle. */
        }
        action def PortfolioManagement {
            doc
            /* The Portfolio Management process initiates and sustains necessary, sufficient, and suitable projects in order to meet the strategic objectives of the organization. */
        }
        action def HumanResourceManagement {
            doc
            /* The Human Resource Management process provides the organization with necessary human resources and maintains their competencies consistent with business needs. */
        }
        action def QualityManagement {
            doc
            /* The Quality Management process assures that products, services, and implementations of the life cycle processes meet the organization's quality objectives and achieve customer satisfaction. */
        }
        action def KnowledgeManagement {
            doc
            /* The Knowledge Management process creates the capability and assets that enable the organization to exploit opportunities to re-apply existing knowledge. */
        }

        //
        // Technical Management Processes
        //
        action def ProjectPlanning {
            doc
            /* The Project Planning process produces and coordinates effective and workable plans. */
        }
        action def ProjectAssessmentAndControl {
            doc
            /* The Project Assessment and Control process assesses if the plans are aligned and feasible, determines the status of the project, technical, and process performance, and directs execution to help ensure that the performance is according to plans and schedules, within projected budgets, and satisfies technical objectives. */
        }
        action def DecisionManagement {
            doc
            /* The Decision Management process provides a structured, analytical framework for objectively identifying, characterizing, and evaluating a set of alternatives for a decision at any point in the life cycle and selecting the most beneficial course of action. */
        }
        action def RiskManagement {
            doc
            /* The Risk Management process continually identifies, analyzes, treats, and monitors risks. */
        }
        action def ConfigurationManagement {
            doc
            /* The Configuration Management process manages and controls system elements and configurations over the life cycle. */
        }
        action def InformationManagement {
            doc
            /* The Information Management process generates, obtains, confirms, transforms, retains, retrieves, disseminates, and disposes of information to designated stakeholders. */
        }
        action def Measurement {
            doc
            /* The Measurement process collects, analyzes, and reports objective data and information to support effective management and demonstrate the quality of the products, services, and processes. */
        }
        action def QualityAssurance {
            doc
            /* The Quality Assurance process helps ensure the effective application of the organization's Quality Management process to the project. */
        }

        //
        // Technical Processes
        //
        action def BusinessOrMissionAnalysis {
            doc
            /* The Business or Mission Analysis process defines the business or mission problem or opportunity, characterizes the solution space, and determines potential solution class(es) that can address a problem or take advantage of an opportunity. */
        }
        action def StakeholderNeedsAndRequirementsDefinition {
            doc
            /* The Stakeholder Needs and Requirements Definition process defines the stakeholder requirements for a system that can provide the capabilities needed by users and other stakeholders in a defined environment. */
        }
        action def SystemRequirementsDefinition {
            doc
            /* The System Requirements Definition process transforms the stakeholder, user-oriented view of desired capabilities into a technical view of a solution that meets the operational needs of the user. */
        }
        action def SystemArchitectureDefinition {
            doc
            /* The System Architecture Definition process generates system architecture alternatives, selects one or more alternatives that address stakeholder concerns and system requirements, and expresses this in consistent views and models. */
        }
        action def DesignDefinition {
            doc
            /* The Design Definition process provides sufficient detailed data and information about the system and its elements to enable the implementation consistent with the architectural entities as defined in the models and views of the system architecture. */
        }
        action def SystemAnalysis {
            doc
            /* The System Analysis process provides a rigorous basis of data and information for technical understanding to aid decision-making across the life cycle. */
        }
        action def Implementation {
            doc
            /* The Implementation process realizes a specified system element. */
        }
        action def Integration {
            doc
            /* The Integration process synthesizes a set of system elements into a realized system that satisfies the system requirements, architecture, and design. */
        }
        action def Verification {
            doc
            /* The Verification process provides objective evidence that a system or system element fulfills its specified requirements and characteristics. */
        }
        action def Transition {
            doc
            /* The Transition process establishes a capability for a system to provide services specified by stakeholder requirements in the operational environment. */
        }
        action def Validation {
            doc
            /* The Validation process provides objective evidence that the system, when in use, fulfills its business or mission objectives and stakeholder requirements, achieving its intended use in its intended operational environment. */
        }
        action def Operation {
            doc
            /* The Operation process uses the system to deliver its services. */
        }
        action def Maintenance {
            doc
            /* The Maintenance process sustains the capability of the system to provide a service. */
        }
        action def Disposal {
            doc
            /* The Disposal process ends the existence of a system element or system for a specified intended use, appropriately handling replaced or retired elements. */

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
}

library package SYSMODRequirementBoilerplates {
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

    