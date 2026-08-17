package <DDCS> DeliveryDroneControlStation {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone Control Station
     *
     * Definition of the Control Station Sub-Project
     *
     * The focus is on demonstrating how to use SYSMOD, in particular how a
     * sub-project relates to its parent project. Therefore, the model is
     * oversimplified and does not cover the subject in either breadth or depth.
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
    #SYSMOD::project occurrence def <PRJ> DeliveryDroneControlStationProject {
        doc
        /* Project Charter: Delivery Drone Control Station
         *
         * Client: The Delivery Drone project needs a ground control station
         * from which the autonomous drone fleet is monitored and commanded.
         *
         * Contractor: The in-house ground-segment team develops the control
         * station as a sub-project of the Delivery Drone project.
         *
         * Goal: A control station that enables a single operator to safely
         * supervise the entire autonomous delivery drone fleet.
         *
         */

        part tomSchilling :>> projectOwner {
            doc /* Tom Schilling leads the ground-segment team and is accountable
                   for the control station sub-project. */
        }

        concern :>> problemStatement {
            doc /* How can a single operator safely monitor and command a fleet
                   of autonomous delivery drones from the ground? The existing
                   control station was built for manually piloted drones and one
                   operator per drone; it does not scale to an autonomous fleet. */
            subject :>> brownfieldSystem = controlStationBrownfieldContextImpl.controlStationImpl;
            stakeholder :>> projectOwner = tomSchilling;
        }

        //------------------------- Stakeholders
        private import DD_STAKEHOLDERS::*;
        part droneOperator : DroneOperator :> projectStakeholders {
            doc /* Shared with the parent Delivery Drone project: the operator is
                   the primary user of the control station. */
        }

        //------------------------- Stakeholder Needs
        concern :>> stakeholderNeeds {
            // frame problemStatement is inherited from SYSMOD::Project
            subject :>> brownfieldSystem = controlStationBrownfieldContextImpl.controlStationImpl;
            concern singleOperatorFleet {
                doc /* One operator must be able to supervise the whole fleet
                       without safety-critical workload peaks. */
            }
        }

        //------------------------- Brownfield Architecture
        part controlStationBrownfieldContext :>> brownfieldContext : ControlStationContext;
        part controlStationBrownfieldContextImpl :>> brownfieldContextImpl : ControlStationContextImpl :> controlStationBrownfieldContext;

        //------------------------- System Idea
        // Omitted in this oversimplified example; it follows the same pattern
        // as the parent Delivery Drone project.

        //------------------------- Specification
        // Omitted in this oversimplified example.

        //------------------------- Solution Architecture
        // Omitted in this oversimplified example.
    }

    //------------------------- Control Station Brownfield
    #systemContext part def ControlStationContext {
        doc
        /* The black-box brownfield context of the existing control station,
         * built for manually piloted drones. */
        #System part controlStation : ControlStation :>> soi {
            doc /* The existing control station as a black box. */
        }
        #User part operator :> actors {
            doc /* The operator manually piloting one drone at a time. */
            port stationPort;
        }
        interface operatorInterface :> asis connect operator.stationPort to controlStation.operatorPort {
            doc /* Manual command and monitoring interface. */
        }
    }
    #systemContext part def ControlStationContextImpl :> ControlStationContext {
        doc
        /* The white-box brownfield context of the existing control station. */
        #System part controlStationImpl : ControlStationImpl :>> controlStation {
            doc /* The existing control station as a white box. */
        }
    }
    part def ControlStation {
        doc
        /* Black-box definition of the existing control station. */
        port operatorPort;
    }
    part def ControlStationImpl :> ControlStation {
        doc
        /* White-box definition of the existing control station: one console and
         * one radio link per manually piloted drone. */
        part console {
            doc /* Operator console for a single drone. */
        }
        part radioLink {
            doc /* Radio link to the piloted drone. */
        }
        connect console to radioLink;
    }
}
