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
    occurrence def Project :> MBSEMethodology::Product {
        doc 
        /* The Project provides a context for all main engineering artifacts used for this specific project and sets cross relationships. */

        //
        // Project Cover
        //
        attribute purpose : ScalarValues::String {
            doc
            /* The purpose of the project is a brief description of the purpose of the project. */
        }
        attribute scope : ScalarValues::String {
            doc
            /* The scope of the project is a brief description of the boundaries and extent of the project. In particular, it describes what is not part of the project but could be consideres by stakeholders. */
        }
        part projectOwner :> projectStakeholders :>> owner {
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


        //
        // Stakeholders and their Needs
        //
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

        //
        // The Brownfield Context (Black Box and White Box)
        //
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

        //
        // The System Specification: Specification Context, Use Cases, and System Requirements
        //
        part specificationContext :> systemIdeaContext {
            doc
            /* The specification context includes the actors and the system, which are defined during the requirements analysis. The specification context is also the owner of the system use cases. The context specializes the black box system idea context. */
            part <soi> specificationSystem :>> systemIdeaContext::soi {
                doc
                /* The specification system as a black box. It redefines the system idea and is the subject of the use cases. */
            }
        }
        part specificationContextImpl :> specificationContext, systemIdeaContextImpl {
            doc
            /* The white box view of the specification context. It combines the black box specification context with the internal structure view inherited from the system idea implementation context. Additional features, such as subparts or attributes, which are used by use cases and requirements can be defined here. */
            part <soiImpl> specificationSystemImpl :>> specificationContext::soi, systemIdeaContextImpl::soiImpl {
                doc
                /* The white box view of the specification system including its internal structure. It is the subject of the system requirements, so that requirements can refer to its subparts and attributes. */
            }
        }
        requirement systemRequirementSpecification : ExtendedRequirement {
            doc
            /* The System Requirement Specification is the root element for system requirements. They frame the stakeholder needs. Its subject is the white box specification system, so that nested requirements can refer to subparts of the system, e.g., a requirement on a drone of a drone delivery system. */
            subject specificationSystemImpl :> specificationContextImpl.soiImpl;
            frame stakeholderNeeds;
        }

        //
        // The Solution Architectures: Functional, Logical, and Product Architectures
        //
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
        part productContext[0..1] :> specificationContext {
            doc
            /* The Product Context is optional and specializes the black box specification context. It provides the context for a product architecture with concrete, physical or deployable building blocks. */
            part <soi> productSystem :>> specificationContext::soi {
                doc
                /* The Product System is the root element of the product architecture. It redefines the black box specification system and thereby inherits the context information such as the system ports. */
            }
        }
        part productContextImpl[0..1] :> productContext, specificationContextImpl {
            doc
            /* The Product Context Implementation is optional and the white box view of the product context. It specializes the product context and the white box specification context and contains the internal structure of the product system, i.e., its concrete, physical or deployable building blocks. */
            part <soiImpl> productSystemImpl :>> productContext::soi, specificationContextImpl::soiImpl {
                doc
                /* The white box view of the product system. It redefines the product system and the white box specification system and contains the concrete, physical or deployable building blocks of the product architecture. It satisfies the system requirements. */
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
        // Alternatives and Trade Studies
        //
        part architectureAlternatives : SystemContext [0..*] {
            doc
            /* Candidate architectures: alternative system contexts for an architecture decision, which the tradeStudies evaluate against each other.
             * An alternative is typed by a context definition that specializes the definition of the context it is an alternative for, e.g., the
             * definition of the white box specification context for an alternative product architecture, or the definition of the white box
             * brownfield context for an alternative system idea. The definition of the selected alternative becomes the definition of the
             * respective context of the project, e.g., of the productContextImpl, which records the decision with Rationale metadata whose
             * explanation is the trade study. Created by the specifyTradeStudy step. */
        }
        analysis tradeStudies : SYSMODTradeStudy [0..*] {
            doc
            /* The trade studies of the project. Each trade study evaluates some of the architectureAlternatives against the systemObjectives
             * and selects the preferred alternative. Created by the specifyTradeStudy step. */
        }

        //
        // Verification
        //
        part verificationContext : SystemContext {
            doc
            /* The context in which the verification takes place, including all relevant actors, e.g., the test systems, and the system of interest. It is not bound to an architecture: it can be any system context, e.g., one that specializes the white box product, logical, or specification context, or a context with a prototype or a simulation model as system of interest. */

            verification verificationCases[*] {
                doc
                /* The verification cases verify and validate the system requirements. They are specified while specifying the system,
                 * before any solution architecture exists (step specifySystem, nested step specifyVerificationCases): each verification case
                 * definition states its objective, i.e., the system requirements it verifies, and its verdict, e.g., with VerificationCases::PassIf,
                 * against the black box specification system, so that verification engineers and systems engineers discuss the verification in
                 * SysML from the start instead of in a separate test language. */
            }

            item verificationReports[*] : VerificationReport {
                doc
                /* The results of performing the verificationCases on the system of interest of the verification context, created by the step performVerification. */
            }
        }

        // 
        // SYSMOD Processes
        //
        action defaultProcess : SYSMODProcesses::SYSMODDefaultProcess {
            doc
            /* The SYSMOD process performed by the project. It defaults to SYSMODDefaultProcess and can be redefined with a specialization of it to tailor the process. */
            in item projectDescription = new SYSMODProcesses::ProjectDescription(
                projectPurpose = Project::purpose,
                projectScope = Project::scope,
                projectOwnerName = Project::projectOwner.name);
        }

        //
        // Sub Projects
        //
        occurrence subProjects : Project [*] {
            doc /* List of all subProjects, for example, a standalone project for a subsystem or component of the system.
                 * A sub-project that develops a building block of the white box product context refers to it as its parentElement
                 * (sub-project contract). Created by the modelSubProjects step. */
        }

        //
        // Sub-Project Contract
        //
        ref part parentElement [0..1] {
            doc
            /* Only for a sub-project: the building block of the white box product context (productContextImpl) of the parent project that
             * this sub-project develops. The parent project sets it in the usage of the sub-project. It anchors the sub-project contract:
             * 1. Boundary: the parent project specifies a handover context in a separate handover package: a system context whose
             *    system of interest is the black box of the parent element and whose actors are the external entities of the parent
             *    element that are handed over (its neighbors in the parent white box and the parent actors whose interfaces the parent
             *    delegates to it), with the actor/system interfaces. The parent white box specializes the elements of the handover
             *    context, e.g., the definition of the parent element specializes the definition of the system of interest. The
             *    sub-project uses the handover context as its black box brownfield context. The handover package is the only package
             *    that both projects share, so the sub-project, e.g., a supplier, needs no access to the parent project. These decisions
             *    of the parent architecture are fixed at the start of the sub-project.
             * 2. Flow-down: the parent project derives the system requirements of the sub-project from the parent requirements
             *    that constrain the parent element, with its requirementFlowDowns.
             * 3. Integration: the parent project redefines the parent element in its white box product context with the white box
             *    product system (productSystemImpl) of the sub-project. */
        }
        abstract connection requirementFlowDowns : DerivationConnections::Derivation [0..*] :> DerivationConnections::derivations {
            doc
            /* The requirement flow-down to the subProjects: #derivation connections from the requirements of this project that
             * constrain the parentElement of a sub-project (#original) to the system requirements of that sub-project (#derive),
             * e.g., end #derive ::> <sub-project usage>.<requirement specification>.<requirement>. They are declared in this project,
             * where the requirements of both levels are accessible. Together with the subProjects, they form the specification tree.
             * Created by the modelSubProjects step. */
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
        end port actorPort;
        end port systemPort;
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
    // SYSMOD Trade Studies
    //
    analysis def SYSMODTradeStudy :> TradeStudies::TradeStudy {
        doc
        /* A SYSMOD trade study evaluates alternative system contexts (architectureAlternatives) for an architecture decision
         * and selects the preferred one (ISO/IEC/IEEE 15288 Decision Management and System Analysis processes).
         * The criteria are system objectives of the project. The evaluation of an alternative is the weighted sum of its
         * assessments: for each criterion, the weight (by default the priority of the system objective) times the score, i.e.,
         * the degree to which the alternative achieves the objective, from 0.0 (not at all) to 1.0 (fully), determined by
         * analysis, simulation, or expert judgment. The trade study selects the alternative with the maximum evaluation.
         * Mandatory system requirements are must-criteria: an alternative that violates one is not eligible and is not an
         * alternative of the trade study.
         */
        subject alternatives : SystemContext [1..*] :>> studyAlternatives {
            doc /* The alternative system contexts compared by the trade study. */
        }
        ref concern criteria : ExtendedConcern [1..*] {
            doc /* The evaluation criteria: the system objectives, or individual objectives nested in them, against which the alternatives are evaluated. */
        }
        attribute assessments : Assessment [0..*] {
            doc /* The assessments of the alternatives, one per alternative and criterion. */
        }
        calc :>> evaluationFunction {
            doc /* The evaluation of an alternative: the sum of the weighted scores of its assessments. */
            in ref :>> alternative : SystemContext;
            return :>> result : ScalarValues::Real = NumericalFunctions::sum(
                assessments->ControlFunctions::select { in a : Assessment; a.alternative == alternative }
                    ->ControlFunctions::collect { in a : Assessment; a.weightedScore });
        }
        objective :>> tradeStudyObjective : TradeStudies::MaximizeObjective {
            doc /* Select the alternative with the maximum evaluation. */
        }
        return :>> selectedAlternative : SystemContext {
            doc /* The selected alternative. Its context definition becomes the definition of the respective context of the project. */
        }
    }

    attribute def Assessment {
        doc /* The assessment of one alternative of a SYSMOD trade study for one criterion. */
        ref part alternative : SystemContext {
            doc /* The assessed alternative. */
        }
        ref concern criterion : ExtendedConcern {
            doc /* The criterion, i.e., a system objective. */
        }
        attribute weight : ScalarValues::Real default criterion.priority {
            doc /* The weight of the criterion; by default the priority of the system objective. */
        }
        attribute score : ScalarValues::Real {
            doc /* The degree to which the alternative achieves the criterion, from 0.0 (not at all) to 1.0 (fully). */
        }
        attribute weightedScore : ScalarValues::Real = weight * score {
            doc /* The contribution of this assessment to the evaluation of the alternative. */
        }
        assert constraint scoreRange {
            doc /* The score is a degree between 0.0 and 1.0. */
            score >= 0.0 and score <= 1.0
        }
    }

    //
    // Verification
    //
    item def VerificationReport {
        doc
        /* Verification Report — supports the Verification process of ISO/IEC/IEEE 15288; content aligned with ISO/IEC/IEEE 15289.
         * It documents the results of performing the verification cases of the verification context on its system of interest:
         * the verdict of each verification case, the verified requirements, and the evidence. */
    }
    dependency verificationReportSupportsVerification from VerificationReport to ISO15288Processes::Verification {
        doc
        /* The Verification Report supports the Verification process of ISO/IEC/IEEE 15288; its content is aligned with ISO/IEC/IEEE 15289. */
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
}