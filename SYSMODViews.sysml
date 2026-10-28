library package SYSMODViews {
    doc
    /* 
     * Definition of SYSMOD v5 Views
     *
     * Version v5.1.7
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

    package Stakeholders {
        doc /* Typical stakeholders of a systems engineering project that have concerns framed by the SYSMOD viewpoints.
             * ISO/IEC/IEEE 15288 defines processes, not roles. The stakeholders are derived from the roles
             * that are responsible for the respective life cycle processes.
             * Each role specializes ExtendedStakeholder, so that a project stakeholder can play one or more roles by
             * multiple typing, e.g., part johnFinch : ProductManager :>> projectOwner, or
             * part logisticCompany : LogisticCompany, Acquirer :> projectStakeholders.
             */

        // Agreement processes
        part def Acquirer :> ExtendedStakeholder {
            doc /* Organization or person that acquires or procures the system from a supplier (ISO/IEC/IEEE 15288 Acquisition process). */
        }
        part def Supplier :> ExtendedStakeholder {
            doc /* Organization or person that provides the system to an acquirer (ISO/IEC/IEEE 15288 Supply process). */
        }

        // Organizational project-enabling processes
        part def PortfolioManager :> ExtendedStakeholder {
            doc /* Responsible for initiating, sustaining, and terminating projects in line with the organization's strategy (ISO/IEC/IEEE 15288 Portfolio Management process). */
        }
        part def QualityManager :> ExtendedStakeholder {
            doc /* Responsible for ensuring that products, services, and processes meet the organization's quality objectives (ISO/IEC/IEEE 15288 Quality Management process). */
        }

        // Technical management processes
        part def ProjectManager :> ExtendedStakeholder {
            doc /* Responsible for planning, assessing, and controlling the project, e.g., schedule, cost, resources, and progress (ISO/IEC/IEEE 15288 Project Planning and Project Assessment and Control processes). */
        }
        part def RiskManager :> ExtendedStakeholder {
            doc /* Responsible for identifying, analyzing, treating, and monitoring risks (ISO/IEC/IEEE 15288 Risk Management process). */
        }
        part def ConfigurationManager :> ExtendedStakeholder {
            doc /* Responsible for managing and controlling system elements, configurations, and baselines over the life cycle (ISO/IEC/IEEE 15288 Configuration Management process). */
        }

        // Technical processes
        part def ProductManager :> ExtendedStakeholder {
            doc /* Responsible for the business or mission problem or opportunity, the solution space, and the product's success on the market (ISO/IEC/IEEE 15288 Business or Mission Analysis process).
                 * In a SYSMOD project, the projectOwner typically plays this role, since the projectOwner is the stakeholder of the problemStatement. */
        }
        part def RequirementsEngineer :> ExtendedStakeholder {
            doc /* Responsible for eliciting stakeholder needs and defining stakeholder and system requirements (ISO/IEC/IEEE 15288 Stakeholder Needs and Requirements Definition and System Requirements Definition processes). */
        }
        part def SystemArchitect :> ExtendedStakeholder {
            doc /* Responsible for the system architecture, i.e., the fundamental concepts and properties of the system and the integration of problem and solution across several levels (ISO/IEC/IEEE 15288 System Architecture Definition process). */
        }
        part def DesignEngineer :> ExtendedStakeholder {
            doc /* Responsible for the detailed design of system elements so that they can be implemented (ISO/IEC/IEEE 15288 Design Definition and Implementation processes). */
        }
        part def SystemAnalyst :> ExtendedStakeholder {
            doc /* Responsible for providing a rigorous basis of data and information for technical decisions, e.g., by simulations and trade studies (ISO/IEC/IEEE 15288 System Analysis process). */
        }
        part def IntegrationEngineer :> ExtendedStakeholder {
            doc /* Responsible for assembling the system elements into a realized system (ISO/IEC/IEEE 15288 Integration process). */
        }
        part def VerificationEngineer :> ExtendedStakeholder {
            doc /* Responsible for providing objective evidence that the system fulfills its specified requirements (ISO/IEC/IEEE 15288 Verification process). */
        }
        part def ValidationEngineer :> ExtendedStakeholder {
            doc /* Responsible for providing objective evidence that the system fulfills its intended use in its intended operational environment (ISO/IEC/IEEE 15288 Validation process). */
        }
        part def Operator :> ExtendedStakeholder {
            doc /* Uses the system to deliver its services (ISO/IEC/IEEE 15288 Operation process). */
        }
        part def Maintainer :> ExtendedStakeholder {
            doc /* Sustains the capability of the system to provide its services (ISO/IEC/IEEE 15288 Maintenance and Disposal processes). */
        }
    }
    package Concerns {
        private import Stakeholders::*;
        doc /* Concerns of the SYSMOD stakeholders, i.e., their interests in the system and the project.
             * The concerns are derived from the outcomes of the ISO/IEC/IEEE 15288 life cycle processes.
             *
             * Entity of interest: the subject of all concerns is the SYSMOD Project (projectOfInterest). In the sense of
             * ISO/IEC/IEEE 42010, the Project is the entity of interest of the SYSMOD architecture description framework.
             * The system of interest is reached through the system contexts of the Project, e.g., the problemStatement
             * has the brownfield system (brownfieldContextImpl.soiImpl) as its own subject.
             */

        // Agreement processes
        concern def ContractualAgreement {
            doc /* What is the agreed scope of the system, which deliverables are to be provided,
                 * and what are the acceptance criteria? (ISO/IEC/IEEE 15288 Acquisition and Supply processes)
                 */
            subject projectOfInterest : Project;
            stakeholder acquirer : Acquirer;
            stakeholder supplier : Supplier;
        }

        // Organizational project-enabling processes
        concern def PortfolioAlignment {
            doc /* Does the project contribute to the organization's strategy, and should it be
                 * initiated, continued, redirected, or terminated? (ISO/IEC/IEEE 15288 Portfolio Management process)
                 */
            subject projectOfInterest : Project;
            stakeholder portfolioManager : PortfolioManager;
        }
        concern def QualityCompliance {
            doc /* Do the system, the work products, and the applied processes meet the quality objectives
                 * and the applicable standards? (ISO/IEC/IEEE 15288 Quality Management and Quality Assurance processes)
                 */
            subject projectOfInterest : Project;
            stakeholder qualityManager : QualityManager;
        }

        // Technical management processes
        concern def ProjectStatus {
            doc /* What is the current status and progress of the project, e.g., the state of the work products
                 * and process steps, compared to the plan? (ISO/IEC/IEEE 15288 Project Planning and Project Assessment and Control processes)
                 */
            subject projectOfInterest : Project;
            stakeholder projectManager : ProjectManager;
            stakeholder portfolioManager : PortfolioManager;
        }
        concern def RiskExposure {
            doc /* Which risks threaten the system and the project, how likely and severe are they,
                 * and how are they treated? (ISO/IEC/IEEE 15288 Risk Management process)
                 */
            subject projectOfInterest : Project;
            stakeholder riskManager : RiskManager;
            stakeholder projectManager : ProjectManager;
        }
        concern def ConfigurationBaseline {
            doc /* Which configuration items and baselines exist, what is their version and status,
                 * and which changes are pending? (ISO/IEC/IEEE 15288 Configuration Management process)
                 */
            subject projectOfInterest : Project;
            stakeholder configurationManager : ConfigurationManager;
        }

        // Technical processes
        concern def ProblemSolutionPitch {
            doc /* What is the problem to be solved and what is the solution idea? Pitch both concisely
                 * to decision makers. (ISO/IEC/IEEE 15288 Business or Mission Analysis process)
                 */
            subject projectOfInterest : Project;
            stakeholder productManager : ProductManager;
            stakeholder acquirer : Acquirer;
        }
        concern def MissionGoalsAndMeasures {
            doc /* Which mission, goals, and objectives does the project pursue, and by which measures of success
                 * is it decided whether the problem is solved? (ISO/IEC/IEEE 15288 Business or Mission Analysis process)
                 * In SYSMOD, the goals are stated with the problemStatement and become measurable in the
                 * systemRequirementSpecification, e.g., with the SYSMODRequirementsBoilerplates.
                 */
            subject projectOfInterest : Project;
            stakeholder productManager : ProductManager;
            stakeholder acquirer : Acquirer;
        }
        concern def StakeholderNeedsCoverage {
            doc /* Are all relevant stakeholders identified, and are their needs captured and transformed
                 * into stakeholder and system requirements? (ISO/IEC/IEEE 15288 Stakeholder Needs and Requirements Definition
                 * and System Requirements Definition processes)
                 */
            subject projectOfInterest : Project;
            stakeholder requirementsEngineer : RequirementsEngineer;
            stakeholder productManager : ProductManager;
        }
        concern def ProblemSolutionIntegration {
            doc /* How are the problem artifacts, e.g., requirements and use cases, integrated with the solution artifacts,
                 * e.g., the architecture, across several levels of the system hierarchy? (ISO/IEC/IEEE 15288 System Architecture Definition process)
                 */
            subject projectOfInterest : Project;
            stakeholder systemArchitect : SystemArchitect;
        }
        concern def DesignConsistency {
            doc /* Do the designs of the system elements conform to the architecture, and are they
                 * sufficiently detailed to be implemented? (ISO/IEC/IEEE 15288 Design Definition and Implementation processes)
                 */
            subject projectOfInterest : Project;
            stakeholder designEngineer : DesignEngineer;
            stakeholder systemArchitect : SystemArchitect;
        }
        concern def TradeOffDecision {
            doc /* Which solution alternatives exist, how do they perform with respect to the relevant criteria,
                 * and which one is preferred? (ISO/IEC/IEEE 15288 System Analysis and Decision Management processes)
                 */
            subject projectOfInterest : Project;
            stakeholder systemAnalyst : SystemAnalyst;
            stakeholder systemArchitect : SystemArchitect;
        }
        concern def InterfaceIntegration {
            doc /* Which interfaces exist between the system elements and to the system context,
                 * and in which order are the system elements integrated? (ISO/IEC/IEEE 15288 Integration process)
                 */
            subject projectOfInterest : Project;
            stakeholder integrationEngineer : IntegrationEngineer;
            stakeholder designEngineer : DesignEngineer;
        }
        concern def VerificationCoverage {
            doc /* Is each requirement verified by an appropriate verification case,
                 * and what are the verification results? (ISO/IEC/IEEE 15288 Verification process)
                 */
            subject projectOfInterest : Project;
            stakeholder verificationEngineer : VerificationEngineer;
            stakeholder requirementsEngineer : RequirementsEngineer;
        }
        concern def OperationalSuitability {
            doc /* Does the system fulfill its intended use and the stakeholder needs in its intended
                 * operational environment? (ISO/IEC/IEEE 15288 Validation process)
                 */
            subject projectOfInterest : Project;
            stakeholder validationEngineer : ValidationEngineer;
            stakeholder operator : Operator;
            stakeholder acquirer : Acquirer;
        }
        concern def SystemOperation {
            doc /* How is the system used to deliver its services, i.e., which use cases, operational modes,
                 * and interactions with users and external systems exist? (ISO/IEC/IEEE 15288 Operation process)
                 */
            subject projectOfInterest : Project;
            stakeholder operator : Operator;
        }
        concern def MaintainabilityAndDisposal {
            doc /* How is the system maintained, repaired, and supported during operation,
                 * and how is it retired and disposed of at the end of its life? (ISO/IEC/IEEE 15288 Maintenance and Disposal processes)
                 */
            subject projectOfInterest : Project;
            stakeholder maintainer : Maintainer;
        }
    }
    package Viewpoints {
        doc /* Viewpoints of SYSMOD according to ISO/IEC/IEEE 42010. A viewpoint frames one or more
             * stakeholder concerns and establishes the conventions for views that address them.
             * The conventions are based on the artifacts of the SYSMOD Project and formalized, where possible,
             * as required constraints on the SYSMOD concepts of the elements exposed by a conforming view.
             */
        private import Concerns::*;
        private import SYSMODProcesses::*;
        private import ControlFunctions::forAll;

        constraint def OnlyProjectElements {
            doc /* All given elements are SYSMOD projects. */
            in elements : Base::Anything;
            elements->forAll {
                in e; e istype Project
            }
        }
        constraint def OnlyProcessStepElements {
            doc /* All given elements are the SYSMOD process or its steps. */
            in elements : Base::Anything;
            elements->forAll {
                in e; e istype SYSMODDefaultProcess or e istype SetupProject or e istype SpecifyBrownfieldSystem
                    or e istype SpecifyProblemStatement or e istype IdentifyStakeholders or e istype ElaborateStakeholderNeeds
                    or e istype PitchSystemIdea or e istype DefineSystemSpecification or e istype CreateFunctionalArchitecture
                    or e istype CreateLogicalArchitecture or e istype CreateProductArchitecture
                    or e istype VerifyAndValidateRequirements
            }
        }

        // Agreement processes
        viewpoint def AgreementViewpoint {
            doc /* Shows the SYSMOD artifacts that define the agreed scope and the acceptance criteria:
                 * the problemStatement, the systemRequirementSpecification, and the verificationCases of the verificationContext of the Project.
                 */
            subject theView;
            frame concern cca : ContractualAgreement;
            require constraint onlyAgreementElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype ExtendedConcern or e istype VerificationCases::VerificationCase
                }
            }
        }

        // Organizational project-enabling processes
        viewpoint def PortfolioViewpoint {
            doc /* Shows the SYSMOD Projects with their purpose, projectOwner, and subProjects
                 * as a basis for portfolio decisions.
                 */
            subject theView;
            frame concern cpa : PortfolioAlignment;
            frame concern cps : ProjectStatus;
            require constraint onlyProjectElements : OnlyProjectElements {
                in elements = (theView as SysML::ViewUsage).exposedElement;
            }
        }
        viewpoint def QualityViewpoint {
            doc /* Shows the systemRequirementSpecification and the verificationCases of the verificationContext of the Project
                 * as evidence that the system meets the quality objectives.
                 */
            subject theView;
            frame concern cqc : QualityCompliance;
            require constraint onlyQualityElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype ExtendedRequirement or e istype VerificationCases::VerificationCase
                }
            }
        }

        // Technical management processes
        viewpoint def ProjectViewpoint {
            doc /* Provides an overview of the SYSMOD Project and the integration of its problem artifacts
                 * (problemStatement, stakeholderNeeds, systemRequirementSpecification) and solution artifacts
                 * (the system contexts from the brownfieldContext to the productContext).
                 */
            subject theView;
            frame concern cps : ProjectStatus;
            frame concern cpsi : ProblemSolutionIntegration;
            require constraint onlyProjectElements {
                OnlyProjectElements((theView as SysML::ViewUsage).exposedElement)
            }
        }
        viewpoint def ProcessViewpoint {
            doc /* Shows the steps of the SYSMOD process (Project::defaultProcess) together with their StepStatus. */
            subject theView;
            frame concern cps : ProjectStatus;
            require constraint onlyProcessStepElements : OnlyProcessStepElements {
                in elements = (theView as SysML::ViewUsage).exposedElement;
            }
        }
        viewpoint def RiskViewpoint {
            doc /* Shows the projectStakeholders with their risk, effort, and attention, and the concerns with their priority,
                 * to identify and assess the risks of the system and the project.
                 */
            subject theView;
            frame concern cre : RiskExposure;
            require constraint onlyRiskElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype ExtendedStakeholder or e istype ExtendedConcern
                }
            }
        }
        viewpoint def ConfigurationViewpoint {
            doc /* Shows the Project, its subProjects, and the chain of system contexts from the brownfieldContext
                 * via the systemIdeaContext and the specificationContext to the productContext as configuration baselines.
                 */
            subject theView;
            frame concern ccb : ConfigurationBaseline;
            require constraint onlyConfigurationElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype Project or e istype SystemContext
                }
            }
        }

        // Technical processes
        viewpoint def ProblemSolutionViewpoint {
            doc /* Shows the problemStatement with its projectOwner and the brownfieldContext,
                 * and the systemIdeaContext that answers the problem.
                 * The stakeholders are those of the framed concerns: the ProductManager, a role typically played by
                 * the projectOwner, and the Acquirer, who has the problem and must agree with the problemStatement.
                 */
            subject theView;
            frame concern cpsp : ProblemSolutionPitch;
            frame concern cmgm : MissionGoalsAndMeasures;
            require constraint onlyProblemSolutionElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype ExtendedConcern or e istype ExtendedStakeholder or e istype SystemContext
                }
            }
        }
        viewpoint def RequirementsViewpoint {
            doc /* Shows the projectStakeholders, their stakeholderNeeds, and the systemRequirementSpecification
                 * that frames the stakeholder needs.
                 */
            subject theView;
            frame concern csnc : StakeholderNeedsCoverage;
            require constraint onlyRequirementsElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype ExtendedStakeholder or e istype ExtendedConcern
                }
            }
        }
        viewpoint def ArchitectureViewpoint {
            doc /* Shows the solution architectures, i.e., the functionalContext, logicalContext, and productContext with their white-box
                 * contexts (functionalContextImpl, logicalContextImpl, productContextImpl), their allocations (functional2logical,
                 * logical2product, functionalImpl2logicalImpl, logicalImpl2productImpl), and the systemRequirementSpecification they satisfy.
                 */
            subject theView;
            frame concern cpsi : ProblemSolutionIntegration;
            frame concern cdc : DesignConsistency;
            require constraint onlyArchitectureElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype SystemContext or e istype ExtendedRequirement or e istype Allocations::Allocation
                }
            }
        }
        viewpoint def TradeOffViewpoint {
            doc /* Shows alternative system contexts, the system requirements as evaluation criteria,
                 * and the analysis cases that compare the alternatives.
                 */
            subject theView;
            frame concern ctod : TradeOffDecision;
            require constraint onlyTradeOffElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype SystemContext or e istype ExtendedRequirement or e istype AnalysisCases::AnalysisCase
                }
            }
        }
        viewpoint def InterfaceViewpoint {
            doc /* Shows the system contexts with the actors, the systemOfInterest, their actorPorts and systemPorts,
                 * and the actorSystemInterfaces between them.
                 */
            subject theView;
            frame concern cii : InterfaceIntegration;
            require constraint onlyInterfaceElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype SystemContext or e istype ActorSystemInterface
                }
            }
        }
        viewpoint def VerificationViewpoint {
            doc /* Shows the systemRequirementSpecification and the verificationCases that verify the productSystem against it. */
            subject theView;
            frame concern cvc : VerificationCoverage;
            require constraint onlyVerificationElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype ExtendedRequirement or e istype VerificationCases::VerificationCase
                }
            }
        }
        viewpoint def ValidationViewpoint {
            doc /* Shows the problemStatement, the stakeholderNeeds, the system use cases describing the intended use,
                 * and the verificationCases that validate the productSystem against them.
                 */
            subject theView;
            frame concern cos : OperationalSuitability;
            require constraint onlyValidationElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype ExtendedConcern or e istype SystemUseCase or e istype VerificationCases::VerificationCase
                }
            }
        }
        viewpoint def UseCaseViewpoint {
            doc /* Shows the specificationContext with the actors, the systemOfInterest, and the system use cases,
                 * including secondary use cases, system processes, and continuous use cases.
                 */
            subject theView;
            frame concern cso : SystemOperation;
            require constraint onlyUseCaseElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype SystemContext or e istype SystemUseCase
                }
            }
        }
        viewpoint def MaintenanceViewpoint {
            doc /* Shows the system use cases for maintenance, repair, and disposal with the maintaining actors,
                 * and the productContext with the system elements involved.
                 */
            subject theView;
            frame concern cmd : MaintainabilityAndDisposal;
            require constraint onlyMaintenanceElements {
                (theView as SysML::ViewUsage).exposedElement->forAll {
                    in e; e istype SystemContext or e istype SystemUseCase
                }
            }
        }
    }

    private import Viewpoints::*;

    // Step 01
    view def ProjectView :> StandardViewDefinitions::GeneralView {
        doc /* Product "The Project": the SYSMOD Project with its purpose, projectOwner, and subProjects. */
        satisfy requirement pvp : ProjectViewpoint;
        filter @ProjectMetadata;
        render Views::asTreeDiagram;
    }
    view def ProjectAIView :> ProjectView {
        doc /* Product "The Project" as an AI-generated management summary: a short markdown text with the project name,
                * project owner, documentation, and purpose. It specializes ProjectView and replaces the tree diagram
                * by the AI rendering asProjectFacts.
                */
        render asProjectFacts;
    }
    rendering asProjectFacts : AIRendering :> Views::renderings {
        doc /* AI rendering that turns the exposed Project into markdown text. The create_prompt defines the structure:
                * headline with the project name, the project owner, the documentation, and the purpose.
                */
        :>> create_prompt = "Create pure text in markdown with a headline #Project <project name> and below 'Project owner: <project owner name>', and below ##Documentation, new line: <project doc>, and finally ##Purpose, new line <project purpose>.";
    }

    // Step 02
    view def ProblemStatementView :> StandardViewDefinitions::GeneralView {
        doc /* Product "Problem Statement": the problemStatement of the Project with its projectOwner as stakeholder
                * and the brownfield system as subject.
                */
        satisfy requirement psvp : ProblemSolutionViewpoint;
        filter @SysML::ConcernUsage and (as SysML::ConcernUsage).name == "problemStatement";
        render Views::asTreeDiagram;
    }
    view def ProblemStatementAIView :> ProblemStatementView {
        doc /* Product "Problem Statement" as an AI-generated summary: a short markdown text with the problem statement, project owner, and brownfield system. */
        render asMarkdown {
            :>> title = "Problem Statement";
        }
    }
    rendering asMarkdown : AIRendering :> Views::renderings {
        doc /* AI rendering that turns the exposed Problem Statement into markdown text. The create_prompt defines the structure:
                * headline with the problem statement, the project owner, and the brownfield system.
                */
        attribute title : ScalarValues::String;
        :>> create_prompt = "Create pure text in markdown with a headline <title>, and below the exposed element as text.";
    }

    // Step 03
    view def StakeholdersView :> StandardViewDefinitions::GridView {
        doc /* Product "Stakeholders": the projectStakeholders with their risk, effort, attention, and categories. */
        satisfy requirement rvp : RequirementsViewpoint;
        filter @StakeholderMetadata;
        render Views::asElementTable;
    }
    // Step 04
    view def StakeholderNeedsView :> StandardViewDefinitions::GeneralView {
        doc /* Product "Stakeholder Needs": the stakeholderNeeds of the Project, framed by the problemStatement
                * and traced to the projectStakeholders they come from.
                */
        satisfy requirement rvp : RequirementsViewpoint;
        filter @SysML::ConcernUsage or @ExtendedConcernMetadata or @StakeholderMetadata;
        render Views::asTreeDiagram;
    }
    // Step 05
    view def BrownfieldArchitectureView :> SystemContextView {
        doc /* Product "The Brownfield Architecture": the brownfieldContext and brownfieldContextImpl of the Project,
                * i.e., the existing system of interest with its actors, ports, and actorSystemInterfaces.
                */
        satisfy requirement ivp : InterfaceViewpoint;
    }
    // Step 06
    view def SystemIdeaView :> SystemContextView {
        doc /* Product "The System Idea": the systemIdeaContext and systemIdeaContextImpl of the Project
                * that answer the problemStatement.
                */
        satisfy requirement psvp : ProblemSolutionViewpoint;
    }
    // Step 07
    view def SpecificationSystemView :> SystemContextView {
        doc /* Product "The Specification System": the specificationContext of the Project that defines
                * the system boundary with the actors, the system ports, and the actorSystemInterfaces.
                */
        satisfy requirement ivp : InterfaceViewpoint;
    }
    // Step 08
    view def UseCasesView :> StandardViewDefinitions::GeneralView {
        doc /* Product "Use Cases": the system use cases of the specificationContext with their actors and subject. */
        satisfy requirement ucvp : UseCaseViewpoint;
        filter @SystemUseCaseMetadata or @SecondaryUsageCaseMetadata or @SystemProcessMetadata or @ContinuousUseCaseMetadata
            or @SysML::UseCaseUsage or @system or @user or @externalSystem or @environmentalEffect;
        render Views::asTreeDiagram;
    }
    view def UseCaseFlowView :> StandardViewDefinitions::ActionFlowView {
        doc /* Product "Use Cases": the flow of a single system use case, step by step. */
        satisfy requirement ucvp : UseCaseViewpoint;
    }
    // Step 09
    view def SystemRequirementsView :> StandardViewDefinitions::GridView {
        doc /* Product "System Requirements": the systemRequirementSpecification of the Project
                * with the system requirements that frame the stakeholderNeeds.
                */
        satisfy requirement rvp : RequirementsViewpoint;
        filter @ExtendedRequirementMetadata or @SysML::RequirementUsage;
        render Views::asElementTable;
    }
    // Step 10
    abstract view def SolutionArchitectureView :> StandardViewDefinitions::InterconnectionView {
        doc /* Product "Functional, Logical, Product Architecture": base view for the solution architectures. */
        satisfy requirement avp : ArchitectureViewpoint;
        filter @SystemContextMetadata or @system or @SysML::PartUsage or @SysML::PortUsage
            or @SysML::InterfaceUsage or @SysML::ConnectionUsage;
        filter not (@KerML::Element::isLibraryElement);
        render Views::asInterconnectionDiagram;
    }
    view def FunctionalArchitectureView :> SolutionArchitectureView {
        doc /* The functionalContext and functionalContextImpl of the Project with the functional blocks of the functional system. */
    }
    view def LogicalArchitectureView :> SolutionArchitectureView {
        doc /* The logicalContext and logicalContextImpl of the Project with the technology-independent building blocks of the logical system. */
    }
    view def ProductArchitectureView :> SolutionArchitectureView {
        doc /* The productContext and productContextImpl of the Project with the concrete building blocks of the product system. */
    }
    view def ArchitectureAllocationView :> StandardViewDefinitions::GridView {
        doc /* The allocations functional2logical, logical2product, functionalImpl2logicalImpl, and logicalImpl2productImpl between the solution architectures. */
        satisfy requirement avp : ArchitectureViewpoint;
        filter @SysML::AllocationUsage or @SystemContextMetadata;
        render Views::asElementTable;
    }
    // Step 11
    view def VerificationAndValidationView :> StandardViewDefinitions::GeneralView {
        doc /* Product "Verification and Validation": the verificationCases of the verificationContext of the Project with the tested productSystem
                * and the system requirements, stakeholder needs, and problem statement they verify and validate.
                */
        satisfy requirement vvp : VerificationViewpoint;
        satisfy requirement valvp : ValidationViewpoint;
        filter @SysML::VerificationCaseUsage or @SysML::VerificationCaseDefinition
            or @SysML::RequirementUsage or @ExtendedRequirementMetadata;
        render Views::asTreeDiagram;
    }
    view def VerificationMatrixView :> StandardViewDefinitions::GridView {
        doc /* Product "Verification and Validation": matrix of the system requirements and the verificationCases that verify them. */
        satisfy requirement vvp : VerificationViewpoint;
        filter @SysML::VerificationCaseUsage or @SysML::RequirementUsage or @ExtendedRequirementMetadata;
        render Views::asElementTable;
    }

    view def AIUseCaseView {
        doc /* Classical use case view. Shows the use case definitions exposed by the view,
             * together with their subjects and actors, as an AI-generated diagram.
             */
        filter @SysML::UseCaseDefinition;
        render asAIGenerated {
            doc /* Renders the view with AI, using a traditional use case notation. */
            :>> create_prompt = "Create a classical use case view showing the use cases exposed and filtered of the view in a traditional use case representation with stick figures for the actors, ellipse for the use case, and a boundary box around the use case for the subject.";
        }
    }
    view def AIUseCase4ManagersView {
        doc /* Management summary view. Shows the use case definitions exposed by the view
             * as a single AI-generated slide for managers who do not read SysML.
             */
        filter @SysML::UseCaseDefinition;
        render as4Managers;
    }
    rendering def AIRendering :> Views::Rendering {
        doc /* Rendering that is produced by an AI assistant instead of a fixed notation. */
        attribute create_prompt : ScalarValues::String {
            doc /* Instruction given to the AI describing how the view is to be rendered. */
        }
    }
    rendering asAIGenerated : AIRendering[1] :> Views::renderings {
        doc /* Default AI rendering. Views redefine its create_prompt to describe their specific notation. */
    }
    rendering as4Managers : AIRendering[1] :> Views::renderings {
        doc /* AI rendering that summarizes the exposed and filtered information as a single slide for managers. */
        :>> create_prompt = "Create a single slide that presents the exposed and filtered information from the view, summarizing it concisely for managers: What does this mean, and how can we use it to make decisions? Assume that the managers cannot read SysML.";
    }
    view def SystemContextView :> StandardViewDefinitions::InterconnectionView {
        doc /* Base view for the system contexts. Shows the parts, ports, interfaces, connections, and use cases
             * of the exposed system context as an interconnection diagram, without library elements.
             */
        filter @SysML::PartUsage or @SysML::PortUsage or @SysML::InterfaceUsage or @SysML::ConnectionUsage or @SysML::UseCaseUsage;
        filter not (@KerML::Element::isLibraryElement);
        render Views::asInterconnectionDiagram;
    }
}


