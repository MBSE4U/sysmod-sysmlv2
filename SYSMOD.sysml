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
}

    