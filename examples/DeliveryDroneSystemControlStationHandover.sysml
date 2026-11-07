package <DDCS_HANDOVER> DeliveryDroneControlStationHandover {
    doc
    /*
     * SYSMOD Example Model: Delivery Drone Control Station Handover
     *
     * Handover Package of the Control Station Sub-Project
     *
     * The handover package is the only part of the Delivery Drone model that the control station
     * sub-project gets. The sub-project, e.g., a supplier, needs no access to the parent project:
     * it uses the handover context as its black box brownfield context, the handover stakeholders as
     * its stakeholders, and derives its system requirements from the handover requirements. The parent
     * project specializes the elements of the handover context and the handover stakeholders, and
     * derives the handover requirements from its own requirements.
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

    #systemContext part def ControlStationContext {
        doc
        /* The handover context of the control station: the parent element as the system of interest and the
         * external entities of the parent element that are handed over as actors, with their interfaces.
         * The parent project derives it from its white box product context: the neighbors of the control
         * station are the actors, and its connections and the delegations of parent system ports to it are the
         * actor/system interfaces. Only what the sub-project needs is handed over, e.g., the drones as seen
         * from the control station, not their internal structure. */
        #system part controlStation : ControlStation :>> soi {
            doc /* The control station as a black box. */
        }
        #externalSystem part drones : Drone [1..*] :> actors {
            doc /* The delivery drones of the fleet: the neighbors of the control station in the parent white box. */
            port :>> radioPort :> actorPorts;
        }
        #user part operator : Operator :> actors {
            doc /* The operator, an actor of the parent system whose interface the parent delegates to the control station. */
            port :>> controlPort :> actorPorts;
        }
        interface radioInterface :> asis connect drones.radioPort to controlStation.radioPort {
            doc /* The radio link between the drones and the control station. */
        }
        interface operatorInterface :> asis connect operator.controlPort to controlStation.operatorPort {
            doc /* The command and monitoring interface between the operator and the control station. */
        }
    }

    part def ControlStation {
        doc
        /* The control station as a black box: its ports and attributes are fixed by the product architecture of the
         * parent project, whose control station building block specializes this definition. */
        port radioPort {
            doc /* Radio link to the fleet. */
        }
        port operatorPort {
            doc /* Command and monitoring interface to the operator. */
            in item order : DeliveryDroneDomainLibrary::Items::DeliveryOrder;
        }
        attribute chargerAssignmentTime :> ISQ::duration {
            doc /* Time from the low-battery signal of a drone to the assignment of a charger drone. */
        }
    }
    part def Drone {
        doc
        /* A delivery drone as seen from the control station. The drones of the parent white box specialize it. */
        port radioPort {
            doc /* Radio link to the control station for commands and telemetry. */
        }
    }
    part def Operator {
        doc
        /* The operator as seen from the control station. */
        port controlPort {
            doc /* Commands and monitoring. */
            out item order : DeliveryDroneDomainLibrary::Items::DeliveryOrder;
        }
    }

    //------------------------- Handover Stakeholders
    #extendedStakeholder part def DroneOperator {
        doc
        /* The operator who supervises the drone fleet with the control station. The stakeholder definition
         * DroneOperator of the parent project specializes it. */
        attribute :>> categories = StakeholderCategoryKind::user;
    }

    //------------------------- Handover Requirements
    requirement def ControlStationRequirements :> ExtendedRequirement {
        doc
        /* The requirements that the parent project hands over to the control station sub-project. The parent
         * project derives them from its own requirements (requirementFlowDowns), and the sub-project derives
         * its system requirements from them. */
        subject controlStation : ControlStation;
        requirement chargerAssignment : ChargerAssignmentTime;
        requirement batteryTracking : BatteryLevelTracking;
    }
    #extendedRequirement requirement def ChargerAssignmentTime :> SYSMODRequirementsBoilerplates::MaxValue {
        doc
        /* The control station shall assign a charger drone to a drone with low battery within 10 s. */
        subject controlStation : ControlStation;
        stakeholder droneOperator : DroneOperator;
        attribute :>> obligation = ObligationKind::mandatory;
        attribute :>> stability = StabilityKind::unstable;
        attribute :>> motivation = "A low-battery drone can only be recharged in flight if a charger drone is assigned in time.";
        attribute :>> currentValue :> ISQ::duration = controlStation.chargerAssignmentTime;
        attribute :>> maxValue :> ISQ::duration = 10 [SI::s];
        attribute :>> tolerance :> ISQ::duration = 0 [SI::s];
    }
    #extendedRequirement requirement def BatteryLevelTracking {
        doc
        /* The control station shall track the battery level of every drone in flight. */
        subject controlStation : ControlStation;
        stakeholder droneOperator : DroneOperator;
        attribute :>> obligation = ObligationKind::mandatory;
        attribute :>> stability = StabilityKind::stable;
        attribute :>> motivation = "Charger drones can only be assigned in time if the battery levels of all drones are known.";
    }
}
