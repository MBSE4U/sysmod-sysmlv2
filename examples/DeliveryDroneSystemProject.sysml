package <DD> DeliveryDrone {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Project
     *
     * The focus is on demonstrating how to use SYSMOD. Therefore, the model is oversimplified and does not cover the subject in either breadth or depth.
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
    private import SYSMODViews::Stakeholders::*;

    #project occurrence def <PRJ> 'Delivery Drone Project' {
        doc
        /* Project Charter: Delivery Drone
         *
         * Client: A logistics company wants to speed up last-mile deliveries 
         * to remote places and reduce delivery costs.
         *
         * Contractor: Our company AmperDrones, an established drone manufacturer, will
         * design and develop the delivery drone system.
         *
         * Goal: An autonomous drone system that delivers small packages
         * faster and cheaper than the client's current ground-based delivery.
         *
         */

        attribute :>> purpose = "Develop an autonomous delivery drone system for remote last-mile deliveries that is faster and cheaper than the client's ground-based delivery.";

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
            subject deliveryDroneSystem :>> specificationSystem, deliveryDroneSystem :> deliveryDroneSpecificationContext.deliveryDroneSystem;
            stakeholder :>> projectOwner = johnFinch;
        }

        //------------------------- Solution Architecture: Functional Architecture
        part deliveryDroneFunctionalContext :>> functionalContext : DD_FUNCTIONAL_ARCHITECTURE::DeliveryDroneFunctionalContext :> deliveryDroneSpecificationContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneSpecificationContext::deliveryDroneSystem, Project::functionalContext::functionalSystem;
        }
        part deliveryDroneFunctionalContextImpl :>> functionalContextImpl : DD_FUNCTIONAL_ARCHITECTURE::DeliveryDroneFunctionalContextImpl :> deliveryDroneFunctionalContext, deliveryDroneSpecificationContextImpl {
            part deliveryDroneSystemImpl :>> deliveryDroneSystem, deliveryDroneSystemImpl, deliveryDroneSpecificationContextImpl::deliveryDroneSystemImpl, Project::functionalContextImpl::functionalSystemImpl;
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
            part deliveryDroneProduct :>> deliveryDroneSystem, deliveryDroneSystemImpl, deliveryDroneSpecificationContextImpl::deliveryDroneSystemImpl, Project::productContextImpl::productSystemImpl;
        }
        // The allocations functional2logical, logical2product, functionalImpl2logicalImpl,
        // and logicalImpl2productImpl are inherited from SYSMOD::Project.

        //------------------------- Verification
        part deliveryDroneVerificationContext :>> verificationContext : DD_VV::DeliveryDroneVerificationContext :> deliveryDroneProductContextImpl {
            doc /* The verification context adds the wind tunnel as test system and
                   owns the verification cases of the Delivery Drone. */
            verification maxPayloadTest : DD_VV::MaxPayloadTest :> verificationCases {
                subject :>> productSystem, testedSystem;
            }
        }

        //------------------------- Sub-Projects
        occurrence controlStationProject : DDCS::DeliveryDroneControlStationProject :> subProjects {
            doc /* The control station is developed in a SYSMOD sub-project. It
                   subsets the subProjects list inherited from SYSMOD::Project. */
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


        view useCaseView : AIUseCaseView {
            expose DD_SPECIFICATION::UseCases::*;
        }
        view useCaseManagerView : AIUseCase4ManagersView {
            expose DD_SPECIFICATION::UseCases::*;
        }

    }
}
