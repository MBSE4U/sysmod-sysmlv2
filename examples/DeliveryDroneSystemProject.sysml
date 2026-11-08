package <DD> DeliveryDrone {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Project
     *
     * The focus is on demonstrating how to use SYSMOD. Therefore, the model is oversimplified and does not cover the subject in either breadth or depth.
     *
     * based on SYSMOD v5.1.8
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
    private import SYSMODProcesses::*;
    private import ISO15288Processes::Stakeholders::*;
    private import RequirementDerivation::*;

    occurrence def <DDMBSEEnvironment> 'Delivery Drone MBSE Environment' :> MBSEMethodology::MBSEEnvironment {

        // Tools used in the Delivery Drone MBSE Environment
        part matlab :> tools;
        part requirementsTool :> tools;

        // Roles involved in the Delivery Drone MBSE Environment
        part systemArchitect : SystemArchitect :> roles;
        part verificationEngineer : VerificationEngineer :> roles;
        part projectManager : ProjectManager :> roles;
        part requirementsEngineer : RequirementsEngineer :> roles;
    
        // Methodology used in the Delivery Drone MBSE Environment
        part sysmodMethodology :>> methodology {
            part :>> tools :> SYSMODEnvironment::tools;
            part :>> roles :> SYSMODEnvironment::roles;

            //
            // Process Status
            //
            action SYSMODDefaultProcess : SYSMODProcesses::SYSMODDefaultProcess :> processes {
                doc
                /* The status of the SYSMOD steps in the Delivery Drone project. The project redefines the
                * steps of the default process and sets their @StepStatus. The SYSMOD Map reads it with
                * scripts/generate_map_status.py. The charging concept trade study is done, the control
                * station sub-project is modeled and its product architecture integrated. Verification has
                * only started: MaxPayloadTest is the first verification case of the verification context;
                * it is specified in specifySystem and bound to the product system in specifyVerificationContext. */
                action :>> setupProject { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> modelBrownfieldSystem { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> describeProblemStatement { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> identifyStakeholders { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> identifyStakeholderNeeds { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> describeSystemIdea { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> specifySystem { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> modelSolutionArchitecture {
                    @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; }
                    action :>> modelFunctionalArchitecture { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                    action :>> modelLogicalArchitecture { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                    action :>> modelProductArchitecture { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                }
                action :>> modelSubProjects { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> integrateSubProjects { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                action :>> specifyVerificationContext { @StepStatus { status = StepStatusKind::inProgress; percentage = 0.2 as Percentage; } }
                action :>> performVerification { @StepStatus { status = StepStatusKind::open; percentage = 0.0 as Percentage; } }
                action :>> specifyTradeStudy { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
            }

        }    
        occurrence sysmodProject : 'Delivery Drone Project' :>> rootProduct;
    }


    #project occurrence def <PRJ> 'Delivery Drone Project' {
        doc
        /* Project Charter: Delivery Drone
         *
         * Client: A logistics company wants to speed up last-mile deliveries 
         * to remote places and reduce delivery costs.
         *
         * Contractor: Our company Quite Remote Deliveries, an established drone manufacturer, will
         * design and develop the delivery drone system.
         *
         * Goal: An autonomous drone system that delivers small packages
         * faster and cheaper than the client's current ground-based delivery.
         *
         */

        attribute :>> purpose = "Develop an autonomous delivery drone system for remote last-mile deliveries that is faster and cheaper than the client's ground-based delivery.";
        attribute :>> scope = "The project covers the model-based systems engineering of the delivery drone system with in-flight recharging between drones: the model of the existing system, the problem statement, the stakeholders and their needs, the system idea, the system specification with the verification cases, and the functional, logical, and product architectures. Not included: the detailed design of the mechanics, electronics, and software, and building and flight-testing a hardware prototype, which stakeholders could expect as a result of the project.";
        
        part johnFinch : ProductManager :>> projectOwner {
            doc /* John Finch is the head of drone engineering at the contractor
                   and accountable for the Delivery Drone project. As project owner,
                   he plays the ProductManager role, i.e., he is responsible for the
                   problem statement (ISO 15288 Business or Mission Analysis). */
            attribute :>> name = "John Finch";
        }

        concern :>> problemStatement {
            doc /* How can we deliver small packages to remote places faster and
                   at lower cost than today's ground-based delivery, using our
                   existing electric delivery drone platform? The current drones
                   must return to a ground dock to recharge, which limits their
                   range and makes remote deliveries slow and expensive. */
            subject :>> brownfieldSystem = deliveryDroneBrownfieldContextImpl.deliveryDroneSystemImpl;
            stakeholder :>> projectOwner = johnFinch;
        }

        //------------------------- Stakeholders
        private import DD_STAKEHOLDERS::*;
        part logisticCompany : LogisticCompany, Acquirer :> projectStakeholders {
            doc /* The client who has the problem. It plays the Acquirer role and must
                   agree with the problem statement (ISO 15288 Business or Mission Analysis). */
            attribute :>> name = "Logistic Company";
        }
        part droneOperator : DroneOperator :> projectStakeholders {
            attribute :>> name = "Drone Operator";
        }
        part recipient : Recipient :> projectStakeholders {
            attribute :>> name = "Recipient";
        }
        part regulator : Regulator :> projectStakeholders {
            attribute :>> name = "Aviation Authority";
        }
        part flightTestTeam : VerificationEngineer :> projectStakeholders {
            doc /* The flight test team of the contractor plays the VerificationEngineer role
                   (ISO 15288 Verification). It joins the project while the system is specified
                   and specifies the verification cases together with the systems engineers
                   (step specifySystem, nested step specifyVerificationCases). */
            attribute :>> name = "Flight Test Team";
            attribute :>> risk = LevelKind::middle;
            attribute :>> effort = LevelKind::middle;
            attribute :>> categories = StakeholderCategoryKind::expert;
        }

        //------------------------- Stakeholder Needs
        private import DD_STAKEHOLDERNEEDS::*;
        concern :>> stakeholderNeeds {
            subject :>> brownfieldSystem = deliveryDroneBrownfieldContextImpl.deliveryDroneSystemImpl;
            frame problemStatement :>> Project::stakeholderNeeds::problemStatement :> PRJ::problemStatement;
            concern reliableDelivery : ReliableDelivery {
                subject :>> brownfieldSystem = deliveryDroneBrownfieldContextImpl.deliveryDroneSystemImpl;
                stakeholder :>> logisticCompany = PRJ::logisticCompany;
            }
            concern safeOperation : SafeOperation {
                subject :>> brownfieldSystem = deliveryDroneBrownfieldContextImpl.deliveryDroneSystemImpl;
                stakeholder :>> droneOperator = PRJ::droneOperator;
            }
            concern lowDeliveryCost : LowDeliveryCost {
                subject :>> brownfieldSystem = deliveryDroneBrownfieldContextImpl.deliveryDroneSystemImpl;
                stakeholder :>> logisticCompany = PRJ::logisticCompany;
            }
        }

        //------------------------- Brownfield Architecture
        part deliveryDroneBrownfieldContext :>> brownfieldContext : DD_BROWNFIELD::DeliveryDroneSystemContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, soi;
        }
        part deliveryDroneBrownfieldContextImpl :>> brownfieldContextImpl : DD_BROWNFIELD::DeliveryDroneSystemContextImpl :> deliveryDroneBrownfieldContext {
            part deliveryDroneSystemImpl :>> deliveryDroneSystem, deliveryDroneSystemImpl, soiImpl;
        }

        //------------------------- System Idea
        part deliveryDroneSystemIdeaContext :>> systemIdeaContext : DD_SYSTEMIDEA::DeliveryDroneSystemIdeaContext :> deliveryDroneBrownfieldContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneBrownfieldContext::deliveryDroneSystem, Project::systemIdeaContext::soi;
        }
        part deliveryDroneSystemIdeaContextImpl :>> systemIdeaContextImpl : DD_SYSTEMIDEA::DeliveryDroneSystemIdeaContextImpl :> deliveryDroneSystemIdeaContext, deliveryDroneBrownfieldContextImpl {
            part deliveryDroneSystemImpl :>> deliveryDroneSystem, deliveryDroneSystemImpl, deliveryDroneBrownfieldContextImpl::deliveryDroneSystemImpl, Project::systemIdeaContextImpl::soiImpl;
            satisfy PRJ::problemStatement;
        }

        //------------------------- System Objectives
        concern :>> systemObjectives {
            doc /* The measurable goals of the system idea, agreed with the project owner.
                   They frame the stakeholder needs and are the basis for the system
                   requirements and for validation. */
            subject :>> systemIdea = deliveryDroneSystemIdeaContext.deliveryDroneSystem;
            stakeholder :>> projectOwner = johnFinch;
            frame stakeholderNeeds :>> Project::systemObjectives::stakeholderNeeds :> PRJ::stakeholderNeeds;
            concern fastRemoteDelivery : DD_SYSTEMIDEA::FastRemoteDelivery {
                subject :>> systemIdea = deliveryDroneSystemIdeaContext.deliveryDroneSystem;
            }
            concern lowCostPerDelivery : DD_SYSTEMIDEA::LowCostPerDelivery {
                subject :>> systemIdea = deliveryDroneSystemIdeaContext.deliveryDroneSystem;
            }
            concern onTimeDelivery : DD_SYSTEMIDEA::OnTimeDelivery {
                subject :>> systemIdea = deliveryDroneSystemIdeaContext.deliveryDroneSystem;
            }
        }

        //------------------------- Specification
        part deliveryDroneSpecificationContext :>> specificationContext : DD_SPECIFICATION::DeliveryDroneSystemContext :> deliveryDroneSystemIdeaContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneSystemIdeaContext::deliveryDroneSystem, Project::specificationContext::soi;
        }
        part deliveryDroneSpecificationContextImpl :>> specificationContextImpl : DD_SPECIFICATION::DeliveryDroneSystemContextImpl :> deliveryDroneSpecificationContext, deliveryDroneSystemIdeaContextImpl {
            part deliveryDroneSystemImpl :>> deliveryDroneSystem, deliveryDroneSystemImpl, deliveryDroneSystemIdeaContextImpl::deliveryDroneSystemImpl, Project::specificationContextImpl::soiImpl;
        }
        requirement deliveryDroneSystemRequirementsSpecification :>> systemRequirementSpecification : DD_SPECIFICATION::Requirements::DeliveryDroneSystemRequirements {
            subject deliveryDroneSystem :>> specificationSystemImpl, deliveryDroneSystem :> deliveryDroneSpecificationContextImpl.deliveryDroneSystemImpl;
            stakeholder :>> projectOwner = johnFinch;
        }

        //------------------------- Solution Architecture: Functional Architecture
        part deliveryDroneFunctionalContext :>> functionalContext : DD_FUNCTIONAL_ARCHITECTURE::DeliveryDroneFunctionalContext :> deliveryDroneSpecificationContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneSpecificationContext::deliveryDroneSystem, Project::functionalContext::functionalSystem;
        }
        part deliveryDroneFunctionalContextImpl :>> functionalContextImpl : DD_FUNCTIONAL_ARCHITECTURE::DeliveryDroneFunctionalContextImpl :> deliveryDroneFunctionalContext {
            part deliveryDroneSystemImpl :>> deliveryDroneSystemImpl, deliveryDroneFunctionalContext::deliveryDroneSystem, Project::functionalContextImpl::functionalSystemImpl;
        }

        //------------------------- Solution Architecture: Logical Architecture
        part deliveryDroneLogicalContext :>> logicalContext : DD_LOGICAL::DeliveryDroneLogicalContext :> deliveryDroneSpecificationContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneSpecificationContext::deliveryDroneSystem, Project::logicalContext::logicalSystem;
        }
        part deliveryDroneLogicalContextImpl :>> logicalContextImpl : DD_LOGICAL::DeliveryDroneLogicalContextImpl :> deliveryDroneLogicalContext, deliveryDroneSpecificationContextImpl {
            part deliveryDroneSystemImpl :>> deliveryDroneSystem, deliveryDroneSystemImpl, deliveryDroneSpecificationContextImpl::deliveryDroneSystemImpl, Project::logicalContextImpl::logicalSystemImpl;
        }

        //------------------------- Solution Architecture: Product Architecture
        part deliveryDroneProductContext :>> productContext : DD_PRODUCT::DeliveryDroneProductContext :> deliveryDroneSpecificationContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneSpecificationContext::deliveryDroneSystem, Project::productContext::productSystem;
        }
        part deliveryDroneProductContextImpl :>> productContextImpl : DD_PRODUCT::DeliveryDroneProductContextImpl :> deliveryDroneProductContext, deliveryDroneSpecificationContextImpl {
            @ModelingMetadata::Rationale {
                text = "Convertible drones: the highest evaluation in the charging concept trade study, without a separate charger fleet to buy, operate, and maintain.";
                explanation = PRJ::chargingConceptStudy meta SysML::Usage;
            }
            part deliveryDroneProduct :>> deliveryDroneSystem, deliveryDroneSystemImpl, deliveryDroneSpecificationContextImpl::deliveryDroneSystemImpl, Project::productContextImpl::productSystemImpl {
                // Integration of the control station sub-project (integrateSubProjects)
                part :>> DD_PRODUCT::DeliveryDroneProductSystemImpl::controlStation, DD_BROWNFIELD::DeliveryDroneSystemImpl::controlStation = controlStationProject.controlStationProductContextImpl.controlStationImpl;
            }
        }
        // The allocations functional2logical, logical2product, functionalImpl2logicalImpl,
        // and logicalImpl2productImpl are inherited from SYSMOD::Project.

        //------------------------- Alternatives and Trade Studies
        part convertibleDronesAlternative : DD_PRODUCT::DeliveryDroneProductContextImpl :> architectureAlternatives {
            doc /* Alternative A: every delivery drone can carry the optional air charger and serve as
                   charger drone. Selected; it is the product architecture of the project. */
        }
        part dedicatedChargerDronesAlternative : DD_PRODUCT::DedicatedChargerProductContextImpl :> architectureAlternatives {
            doc /* Alternative B: a separate fleet of dedicated charger drones with large batteries
                   recharges the delivery drones in flight. */
        }
        analysis chargingConceptStudy : SYSMODTradeStudy :> tradeStudies {
            doc /* Which product architecture realizes the air charging of the system idea best?
                   The scores are expert judgments of the drone engineering team: convertible drones
                   find a charger nearby more often and need no extra fleet, while dedicated charger
                   drones are more punctual but cost more. The weights are the priorities of the
                   system objectives. Evaluation: A = 1.0 * 0.9 + 0.75 * 0.8 + 0.75 * 0.8 = 2.1,
                   B = 1.0 * 0.8 + 0.75 * 0.5 + 0.75 * 0.9 = 1.85; A is selected. */
            subject :>> alternatives = (convertibleDronesAlternative, dedicatedChargerDronesAlternative);
            ref concern :>> criteria = (systemObjectives.fastRemoteDelivery, systemObjectives.lowCostPerDelivery, systemObjectives.onTimeDelivery);
            // Alternative A: convertible drones
            attribute aFast :> assessments { ref part :>> alternative = convertibleDronesAlternative; ref concern :>> criterion = systemObjectives.fastRemoteDelivery; attribute :>> score = 0.9; }
            attribute aCost :> assessments { ref part :>> alternative = convertibleDronesAlternative; ref concern :>> criterion = systemObjectives.lowCostPerDelivery; attribute :>> score = 0.8; }
            attribute aOnTime :> assessments { ref part :>> alternative = convertibleDronesAlternative; ref concern :>> criterion = systemObjectives.onTimeDelivery; attribute :>> score = 0.8; }
            // Alternative B: dedicated charger drones
            attribute bFast :> assessments { ref part :>> alternative = dedicatedChargerDronesAlternative; ref concern :>> criterion = systemObjectives.fastRemoteDelivery; attribute :>> score = 0.8; }
            attribute bCost :> assessments { ref part :>> alternative = dedicatedChargerDronesAlternative; ref concern :>> criterion = systemObjectives.lowCostPerDelivery; attribute :>> score = 0.5; }
            attribute bOnTime :> assessments { ref part :>> alternative = dedicatedChargerDronesAlternative; ref concern :>> criterion = systemObjectives.onTimeDelivery; attribute :>> score = 0.9; }
        }


        //------------------------- Verification
        part deliveryDroneVerificationContext :>> verificationContext : DD_VV::DeliveryDroneVerificationContext :> deliveryDroneProductContextImpl {
            doc /* The verification context holds the verification cases specified with the
                   system requirements (step specifySystem), adds the wind tunnel as test system,
                   and binds the verification cases to the product system as system of
                   interest (step specifyVerificationContext). */
            verification maxPayloadTest : DD_SPECIFICATION::Verification::MaxPayloadTest :> verificationCases {
                doc /* Specified together with the system requirements, before the solution
                       architecture: the flightTestTeam (VerificationEngineer) and the systems
                       engineers agree in SysML on the objective (verify MaxPayloadMass) and the
                       verdict (PassIf) against the black box specification system. Bound to the
                       product system: the tested system is the white box product system, and the
                       drone under test is one of its drones. */
                subject :>> testedSystem : DD_PRODUCT::DeliveryDroneProductSystemImpl;
                requirement :>> maxReq {
                    subject :>> deliveryDrone :> testedSystem.drones;
                }
            }
        }

        //------------------------- Sub-Projects
        occurrence controlStationProject : DDCS::DeliveryDroneControlStationProject :> subProjects {
            doc /* The control station is developed in a SYSMOD sub-project. It
                   subsets the subProjects list inherited from SYSMOD::Project. The handover
                   package DeliveryDroneControlStationHandover carries the sub-project contract:
                   the control station building block of the white box product context is typed
                   by the system of interest of the handover context, and the handoverRequirements
                   of the sub-project are typed by the handover requirements. */
        }
        #derivation connection airChargingFlowDown :> requirementFlowDowns {
            doc /* Requirement flow-down to the control station sub-project: the requirement AirCharging
                   flows down to the control station, which coordinates the air charging of the fleet. */
            end #original ::> deliveryDroneSystemRequirementsSpecification.airCharging;
            end #derive ::> controlStationProject.handoverRequirements.chargerAssignment;
            end #derive ::> controlStationProject.handoverRequirements.batteryTracking;
        }

        //
        // Views
        //
        private import SYSMODViews::*;

        view projectCoverView : SYSMODViews::ProjectView { 
            doc
            /* The Project Cover view shows the project with its purpose, project owner, and the main engineering artifacts. */
            expose this;
        }
        view projectCoverAIView : SYSMODViews::ProjectAIView {
            doc
            /* The Project Cover view is an AI-generated management summary of the project. It exposes the project itself, i.e., its purpose, project owner, and the main engineering artifacts. */
            expose this;
        }
        view sysmodMapView : SYSMODViews::SYSMODMapView {
            doc
            /* The SYSMOD Map shows the project's features by concerns, black box, and white box from the brownfield system to verification, with the status of the steps. */
            expose this;
        }
        view problemStatementView : SYSMODViews::ProblemStatementView {
            doc
            /* The Problem Statement view shows the problem statement with its project owner and the brownfield system. */
            expose problemStatement;
        }
        view problemStatementAIView : SYSMODViews::ProblemStatementAIView {
            doc
            /* The Problem Statement view is an AI-generated summary of the problem statement. It exposes the problem statement itself, i.e., its project owner and the brownfield system. */
            expose problemStatement;
        }
        view systemObjectivesView : SYSMODViews::SystemObjectivesView {
            doc
            /* The System Objectives view shows the measurable goals of the system idea with the project owner, the system idea, and the stakeholder needs they frame. */
            expose systemObjectives;
        }
        view specificationTreeView : SYSMODViews::SpecificationTreeView {
            doc
            /* The Specification Tree view shows the project with its control station sub-project, the building block the sub-project develops, the system requirements of both levels, and the requirement flow-down between them. */
            expose this;
            expose controlStationProject;
        }
        view tradeStudyView : SYSMODViews::TradeStudyView {
            doc
            /* The Trade Study view shows the charging concept trade study as decision matrix: the alternatives, the system objectives as weighted criteria, the scores, and the selected alternative. */
            expose chargingConceptStudy;
        }


        view useCaseView : AIUseCaseView {
            expose DD_SPECIFICATION::UseCases::*;
        }
        view useCaseManagerView : AIUseCase4ManagersView {
            expose DD_SPECIFICATION::UseCases::*;
        }

    }
}
