package <DDCS> DeliveryDroneControlStation {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone Control Station
     *
     * Definition of the Control Station Sub-Project
     *
     * The focus is on demonstrating how to use SYSMOD, in particular how a
     * sub-project relates to its parent project: it only gets the handover
     * package of the parent project (DeliveryDroneControlStationHandover) and
     * needs no access to the parent model. Therefore, the model is
     * oversimplified and does not cover the subject in either breadth or depth.
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
    private import RequirementDerivation::*;

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
            attribute :>> name = "Tom Schilling";
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
        part droneOperator : DDCS_HANDOVER::DroneOperator :> projectStakeholders {
            doc /* Handed over by the parent Delivery Drone project: the operator is
                   the primary user of the control station. */
            attribute :>> name = "Drone Operator";
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
        // The black box brownfield context is the handover context of the parent project
        // (sub-project contract); the white box adds the existing control station.
        part controlStationBrownfieldContext :>> brownfieldContext : DDCS_HANDOVER::ControlStationContext;
        part controlStationBrownfieldContextImpl :>> brownfieldContextImpl : ControlStationContextImpl :> controlStationBrownfieldContext;

        //------------------------- System Idea
        // Omitted in this oversimplified example; it follows the same pattern
        // as the parent Delivery Drone project.

        //------------------------- Specification
        // The specification contexts are omitted in this oversimplified example. The system
        // requirements are derived from the handover requirements of the parent project.
        requirement :>> handoverRequirements : DDCS_HANDOVER::ControlStationRequirements {
            doc /* The requirements handed over by the parent Delivery Drone project. */
        }
        requirement controlStationRequirementSpecification :>> systemRequirementSpecification : ControlStationSystemRequirements {
            subject controlStation :>> specificationSystemImpl, controlStation;
            stakeholder :>> projectOwner = tomSchilling;
        }
        #derivation connection chargerAssignmentDerivation {
            doc /* The charger assignment time of the parent splits into the computation time of the
                   assignment and the age of the battery levels it is based on. */
            end #original ::> handoverRequirements.chargerAssignment;
            end #derive ::> controlStationRequirementSpecification.assignmentComputation;
            end #derive ::> controlStationRequirementSpecification.batteryTelemetry;
        }
        #derivation connection batteryTrackingDerivation {
            end #original ::> handoverRequirements.batteryTracking;
            end #derive ::> controlStationRequirementSpecification.batteryTelemetry;
        }
        // The parent project declares the requirement flow-down from its requirement AirCharging
        // to these requirements (requirementFlowDowns), where both levels are accessible.

        //------------------------- Solution Architecture: Product Architecture
        // The functional and logical architectures are omitted in this oversimplified example.
        part controlStationProductContext :>> productContext : ControlStationProductContext :> controlStationBrownfieldContext;
        part controlStationProductContextImpl :>> productContextImpl : ControlStationProductContextImpl :> controlStationProductContext, controlStationBrownfieldContextImpl {
            #system part :>> controlStationImpl, Project::productContextImpl::productSystemImpl;
        }
    }

    //------------------------- Control Station Brownfield
    #systemContext part def ControlStationContextImpl :> DDCS_HANDOVER::ControlStationContext {
        doc
        /* The white box brownfield context: adds the internal structure of the existing control station. */
        #system part controlStationImpl : ControlStationImpl :>> controlStation {
            doc /* The existing control station as a white box. */
        }
    }
    part def ControlStationImpl :> DDCS_HANDOVER::ControlStation {
        doc
        /* White box definition of the existing control station, built for manually piloted drones:
         * one console and one radio link per drone. */
        part console [1..*] {
            doc /* Operator console for a single drone. */
        }
        part radioLink [1..*] {
            doc /* Radio link to the piloted drone. */
        }
        connect console to radioLink;
    }

    //------------------------- Control Station System Requirements
    requirement def ControlStationSystemRequirements :> ExtendedRequirement {
        doc
        /* Root of the control station system requirements, derived from the handover requirements. */
        subject controlStation : DDCS_HANDOVER::ControlStation;
        stakeholder projectOwner : ExtendedStakeholder;
        requirement assignmentComputation : AssignmentComputationTime;
        requirement batteryTelemetry : BatteryTelemetryInterval;
    }
    #extendedRequirement requirement def AssignmentComputationTime {
        doc
        /* The control station shall compute the charger assignment for a drone with low battery within 5 s. */
        subject controlStation : DDCS_HANDOVER::ControlStation;
        stakeholder droneOperator : DDCS_HANDOVER::DroneOperator;
        attribute :>> obligation = ObligationKind::mandatory;
        attribute :>> stability = StabilityKind::unstable;
        attribute :>> motivation = "Leaves 5 s of the 10 s charger assignment time for transmitting the assignment to the drones.";
    }
    #extendedRequirement requirement def BatteryTelemetryInterval {
        doc
        /* The control station shall receive the battery level of every drone in flight at least every 2 s. */
        subject controlStation : DDCS_HANDOVER::ControlStation;
        stakeholder droneOperator : DDCS_HANDOVER::DroneOperator;
        attribute :>> obligation = ObligationKind::mandatory;
        attribute :>> stability = StabilityKind::stable;
        attribute :>> motivation = "The battery levels must be tracked and recent enough for a charger assignment within 10 s.";
    }

    //------------------------- Control Station Product Architecture
    #systemContext part def ControlStationProductContext :> DDCS_HANDOVER::ControlStationContext {
        doc
        /* The black box context of the product architecture of the control station. */
    }
    #systemContext part def ControlStationProductContextImpl :> ControlStationProductContext, ControlStationContextImpl {
        doc
        /* The white box context of the product architecture of the control station. */
        #system part :>> controlStationImpl : ControlStationProductSystemImpl;
    }
    part def ControlStationProductSystemImpl :> ControlStationImpl {
        doc
        /* The product architecture of the control station: one fleet console, fleet management software,
         * and one radio gateway for the whole fleet. The Delivery Drone project integrates it by redefining
         * its control station building block with this definition. */
        part :>> console [1] {
            doc /* A single fleet console from which one operator supervises the whole fleet. */
        }
        part :>> radioLink [1] {
            doc /* A radio gateway that links all drones of the fleet. */
        }
        part fleetManager {
            doc /* Fleet management software that tracks the battery levels and assigns charger drones. */
        }
        connect console to fleetManager;
        connect fleetManager to radioLink;
    }
}
