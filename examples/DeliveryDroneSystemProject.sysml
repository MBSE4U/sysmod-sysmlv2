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

        part johnFinch :>> projectOwner {
            doc /* John Finch is the head of drone engineering at the contractor
                   and accountable for the Delivery Drone project. */
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
        part logisticCompany : LogisticCompany :> projectStakeholders;
        part droneOperator : DroneOperator :> projectStakeholders;

        //------------------------- Stakeholder Needs
        private import DD_STAKEHOLDERNEEDS::*;
        concern :>> stakeholderNeeds {
            subject :>> brownfieldSystem = deliveryDroneBrownfieldContextImpl.deliveryDroneSystemImpl;
            frame problemStatement :>> Project::stakeholderNeeds::problemStatement :> PRJ::problemStatement;
            concern reliableDelivery : ReliableDelivery;
            concern safeOperation : SafeOperation;
            concern lowDeliveryCost : LowDeliveryCost;

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
        }

        //------------------------- Specification
        part deliveryDroneSpecificationContext :>> specificationContext : DD_SPECIFICATION::DeliveryDroneSystemContext :> deliveryDroneSystemIdeaContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneSystemIdeaContext::deliveryDroneSystem, Project::systemIdeaContext::soi;
        }
        part deliveryDroneSpecificationContextImpl :>> specificationContextImpl : DD_SPECIFICATION::DeliveryDroneSystemContextImpl :> deliveryDroneSpecificationContext, deliveryDroneSystemIdeaContextImpl {
            part deliveryDroneSystemImpl :>> deliveryDroneSystem, deliveryDroneSystemImpl, deliveryDroneSystemIdeaContextImpl::deliveryDroneSystemImpl, Project::systemIdeaContextImpl::soiImpl;
        }
        requirement deliveryDroneSystemRequirementsSpecification :>> systemRequirementSpecification : DD_SPECIFICATION::Requirements::DeliveryDroneSystemRequirements {
            subject :>> specificationSystem = deliveryDroneSpecificationContext.deliveryDroneSystem;
        }

        //------------------------- Solution Architecture: Functional Architecture
        part deliveryDroneFunctionalContext :>> functionalContext : DD_FUNCTIONAL_ARCHITECTURE::DeliveryDroneFunctionalContext :> deliveryDroneSpecificationContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneSpecificationContext::deliveryDroneSystem, Project::functionalContext::functionalSystem;
        }

        //------------------------- Solution Architecture: Logical Architecture
        part deliveryDroneLogicalContext :>> logicalContext : DD_LOGICAL::DeliveryDroneLogicalContext :> deliveryDroneSpecificationContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, deliveryDroneSpecificationContext::deliveryDroneSystem, Project::logicalContext::logicalSystem;            
        }

        //------------------------- Solution Architecture: Product Architecture
        part deliveryDroneProductContext :>> productContext : DD_PRODUCT::DeliveryDroneProductContext :> deliveryDroneSpecificationContextImpl {
            part deliveryDroneProduct :>> deliveryDroneSystemImpl, deliveryDroneSpecificationContextImpl::deliveryDroneSystemImpl, Project::productContext::productSystem;
        }
        // The functional2logical and logical2product allocations are inherited from SYSMOD::Project.

        //------------------------- Sub-Projects
        occurrence controlStationProject : DDCS::DeliveryDroneControlStationProject {
            doc /* The control station is developed in a SYSMOD sub-project. As a
                   suboccurrence of this project, it is automatically a member of
                   the derived subProjects list. */
        }
    }
}
