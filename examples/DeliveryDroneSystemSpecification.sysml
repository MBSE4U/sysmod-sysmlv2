package <DD_SPECIFICATION> DeliveryDroneSystemSpecification {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Specification: Requirements and Use Cases
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
    private import DeliveryDroneDomainLibrary::**;

    #systemContext part def DeliveryDroneSystemContext :> DD_SYSTEMIDEA::DeliveryDroneSystemIdeaContext {
        doc
        /* The black-box specification context. It fixes the system boundary for
         * the requirements analysis and owns the system use cases. */
        #System part deliveryDroneSystem :>> deliveryDroneSystem : DeliveryDroneSystem;
        use case deliverPackage : UseCases::DeliverPackage {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
        use case chargeDrone : UseCases::ChargeDrone {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
        use case reportFleetStatus : UseCases::ReportFleetStatus {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
        use case handleEmergencyLanding : UseCases::HandleEmergencyLanding {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
    }
    #systemContext part def DeliveryDroneSystemContextImpl :> DeliveryDroneSystemContext, DD_SYSTEMIDEA::DeliveryDroneSystemIdeaContextImpl {
        doc
        /* The white-box specification context: adds the internal structure of
         * the specification system. */
        #System part deliveryDroneSystemImpl :>> deliveryDroneSystemImpl : DeliveryDroneSystemImpl;
    }
    part def DeliveryDroneSystem :> DD_SYSTEMIDEA::DeliveryDroneSystem {
        doc
        /* The specification system as a black box; the subject of the system
         * requirements and the use cases. */

        action planDelivery {
            doc /* Assigns a parcel and its destination to a drone as a delivery task. */
            in item order : DeliveryOrder = operatorPort.order;
            out item task : DeliveryTask;
        }
        action flyToPosition : FlyToPosition;
        action pickUpPackage {
            doc /* Loads the assigned parcel onto the drone at the depot. */
            in item pkg : Parcel = packagePort.pkg;
        }
        action chargeInFlight {
            doc /* Recharges the drone's battery in flight when it runs low en route. */
        }
        action dropOffPackage {
            doc /* Delivers the parcel to the recipient at the landing zone. */
            out item deliveredPkg : Parcel = packagePort.pkg;
        }
        action flyToHomeStation {
            doc /* Returns the empty drone to the home station after delivery. */
        }
        action batteryLow {
            accept LowBatterySignal;
        }
        action detectLowBattery {
            doc /* Detects that a drone's battery has fallen below the threshold for its remaining route. */
            in item battLevel : BatteryLevel;
            out item lowBattSignal : LowBatterySignal;
        }
        action assignChargerDrone {
            doc /* Assigns a nearby charger drone to meet the low-battery drone in flight. */
            in item lowBattSignal : LowBatterySignal;
            in item pos : Position;
            out item chargerAssign : ChargerAssignment;
        }
        action rendezvousInFlight {
            doc /* Brings the charger drone and the low-battery drone together at a shared position. */
            in item chargerAssign : ChargerAssignment;
            in item pos : Position;
            out item chargePos : ChargingPosition;
        }
        action transferEnergy {
            doc /* Transfers energy from the charger drone to the low-battery drone's battery. */
        }
        action resumeRoute {
            doc /* Lets the recharged drone continue its interrupted route. */
        }
        action requestStatus {
            doc /* Initiates the operator's request for a fleet-wide status overview. */
            out item req : StatusRequest;
        }
        action pollDrones {
            doc /* Polls every active drone in the fleet for its current status. */
            in item req : StatusRequest;
            out item droneStatus : DroneStatus;
        }
        action reportDroneStatus {
            doc /* Reports a single drone's position, battery level, and task status. */
            in item sensorData : SensorData;
            in item taskData : TaskData;
            out item droneStatus : DroneStatus;
        }
        action aggregateFleetStatus {
            doc /* Aggregates every drone's status into one fleet-wide view. */
            in item droneStatus : DroneStatus;
            out item fleetStatus : FleetStatus;
        }
        action deliverFleetStatus {
            doc /* Delivers the aggregated fleet status to the operator. */
            in item fleetStatus : FleetStatus;
        }
    }
    part def DeliveryDroneSystemImpl :> DeliveryDroneSystem, DD_SYSTEMIDEA::DeliveryDroneSystemIdeaImpl {
        doc
        /* The specification system as a white box. */
        part drones :>> drones : DeliveryDrone;
    }
    part def DeliveryDrone :> DD_SYSTEMIDEA::DeliveryDrone {
        doc
        /* The delivery drone at the specification level. */
        attribute payloadMass : ScalarValues::Real;
    }

    package UseCases {
        #systemUseCase use case def DeliverPackage {
            subject droneSystem : DeliveryDroneSystem;
            objective {
                doc /* The operator dispatches a drone with a package. The drone flies to the landing zone, recharges in the air if the battery runs low, drops the package off, and returns. */
            }
            attribute :>> ucMotivation = "The recipient needs the package as soon as possible, and the logistics company wants to offer faster, cheaper delivery to remote places than ground transport can.";
            attribute :>> ucTrigger = "The operator dispatches a drone with a package for a landing zone.";
            attribute :>> ucResult = "The package is delivered to the landing zone and the drone returns safely.";
            constraint :>> precondition {
                doc /* A drone is available and assigned to a delivery order with a known pickup and destination location. */
            }
            constraint :>> postcondition {
                doc /* The package has been dropped off at the landing zone and the drone has returned to its home station. */
            }

            in item order : DeliveryOrder;
            in item pkgIn : Parcel;
            out item pkgOut : Parcel;

            binding bind order = planDelivery.order;
            binding bind pkgIn = pickUpPackage.pkg;
            binding bind pkgOut = dropOffPackage.deliveredPkg;

            first start then planDelivery;
            first planDelivery then flyToPickup;
            first flyToPickup then pickUpPackage;
            first pickUpPackage then flyToDestination;
            first m1 then dropOffPackage;
            first batteryLow then chargeInFlight;
            first flyToDestination then m1;
            first chargeInFlight then m1;
            first dropOffPackage then flyToHomeStation;
            first flyToHomeStation then done;

            flow from planDelivery.task.pickupLocation to flyToPickup.pos;
            flow from planDelivery.task.deliverLocation to flyToDestination.pos;
            
            merge m1;
            action planDelivery :> droneSystem.planDelivery;
            action flyToPickup :> droneSystem.flyToPosition;
            action pickUpPackage :> droneSystem.pickUpPackage;
            action flyToDestination :> droneSystem.flyToPosition;
            action dropOffPackage :> droneSystem.dropOffPackage;
            action batteryLow :> droneSystem.batteryLow;
            action chargeInFlight :> droneSystem.chargeInFlight;
            action flyToHomeStation :> droneSystem.flyToHomeStation;            
        }
        #systemUseCase use case def ChargeDrone {
            subject droneSystem : DeliveryDroneSystem;
            objective {
                doc 
                /* A drone running low on battery meets a charger drone in flight and
                 * receives enough energy to safely complete its remaining route,
                 * without returning to a ground dock. */
            }
            attribute :>> ucMotivation = "The operator wants deliveries to reach remote destinations without being limited by a single battery charge, avoiding a costly detour back to a ground dock.";
            attribute :>> ucTrigger = "A drone\'s battery falls below the threshold needed to complete its remaining route.";
            attribute :>> ucResult = "The low-battery drone receives enough energy in flight to safely complete its delivery.";
            constraint :>> precondition {
                doc /* A drone's battery has fallen below the threshold needed to complete its remaining route, and a charger drone is available to rendezvous in flight. */
            }
            constraint :>> postcondition {
                doc /* The low-battery drone has received enough energy in flight and has resumed its route. */
            }

            first start then droneSystem.detectLowBattery;
            first droneSystem.detectLowBattery then droneSystem.assignChargerDrone;
            first droneSystem.assignChargerDrone then droneSystem.rendezvousInFlight;
            first droneSystem.rendezvousInFlight then droneSystem.transferEnergy;
            first droneSystem.transferEnergy then droneSystem.resumeRoute;
            first droneSystem.resumeRoute then done;

            flow from droneSystem.assignChargerDrone.chargerAssign to droneSystem.rendezvousInFlight.chargerAssign;
        }
        #systemUseCase use case def ReportFleetStatus {
            subject droneSystem : DeliveryDroneSystem;
            objective {
                doc 
                /* The operator checks in on the entire fleet at once, without
                 * contacting any single drone directly. */
            }
            attribute :>> ucMotivation = "The operator is accountable for the whole fleet\'s safety and schedule, and needs to supervise many drones at once without contacting each one individually.";
            attribute :>> ucTrigger = "The operator requests a status overview of the fleet.";
            attribute :>> ucResult = "The operator receives the current position, battery level, and task status of every active drone.";
            constraint :>> precondition {
                doc /* The operator has an active connection to the fleet management system and requests a status overview. */
            }
            constraint :>> postcondition {
                doc /* The operator has received the current position, battery level, and task status of every active drone. */
            }

            first start then droneSystem.requestStatus;
            first droneSystem.requestStatus then droneSystem.pollDrones;
            first droneSystem.pollDrones then droneSystem.reportDroneStatus;
            first droneSystem.reportDroneStatus then droneSystem.aggregateFleetStatus;
            first droneSystem.aggregateFleetStatus then droneSystem.deliverFleetStatus;
            first droneSystem.deliverFleetStatus then done;
        }
        #systemUseCase use case def HandleEmergencyLanding {
            subject droneSystem : DeliveryDroneSystem;
            objective {
                doc 
                /* Something goes wrong mid-flight (e.g., a critical battery, rotor,
                 * or communication fault) and the drone must put itself down safely,
                 * package delivered or not. */
            }
            attribute :>> ucMotivation = "The operator and the company want to protect the drone, the package, and anyone nearby from harm, prioritizing safety over completing the delivery.";
            attribute :>> ucTrigger = "The drone detects a critical fault mid-flight (e.g., battery failure, rotor fault, or loss of communication).";
            attribute :>> ucResult = "The drone lands as safely as possible at the nearest suitable location, whether or not its delivery was completed.";
            constraint :>> precondition {
                doc /* The drone detects a critical fault while in flight (e.g., battery failure, rotor fault, or loss of communication). */
            }
            constraint :>> postcondition {
                doc /* The drone has landed at the safest available location and the operator has been notified of the outcome. */
            }
            first start then detectFault;
            first detectFault then identifyLandingSite;
            first identifyLandingSite then alertOperator;
            first alertOperator then performEmergencyLanding;
            first performEmergencyLanding then notifyOutcome;
            first notifyOutcome then done;
            action detectFault {
                doc /* Detects a critical fault in the drone during flight. */
                in item faultData : FaultData;
                out item faultSignal : FaultSignal;
            }
            action identifyLandingSite {
                doc /* Identifies the nearest suitable site for an emergency landing. */
                in item faultSignal : FaultSignal;
                in item pos : Position;
                in item envData : EnvData;
            }
            action alertOperator {
                doc /* Alerts the operator that the drone is performing an emergency landing. */
                in item faultSignal : FaultSignal;
                out item notice : EmergencyNotice;
            }
            action performEmergencyLanding {
                doc /* Lands the drone at the identified site as safely as possible. */
            }
            action notifyOutcome {
                doc /* Notifies the operator of the outcome of the emergency landing. */
                in item outcome : LandingOutcome;
                out item incidentReport : IncidentReport;
            }
        }
    }

    package Requirements {
        requirement def DeliveryDroneSystemRequirements {
            doc
            /* Root of the delivery drone system requirements. */
            requirement maxPayloadMass : MaxPayloadMass;
            requirement airCharging : AirCharging;
        }
        #extendedRequirement requirement def MaxPayloadMass :> RequirementBoilderplates::MaxValue {
            doc
            /* The system shall transport payloads with a mass of up to 5 kg. */
            subject deliveryDrone : DD_SPECIFICATION::DeliveryDrone;
            stakeholder logisticCompany : DD_STAKEHOLDERS::LogisticCompany;
            attribute :>> obligation = ObligationKind::mandatory;
            attribute :>> stability = StabilityKind::stable;
            attribute :>> motivation = "Typical last-mile parcels weigh less than 5 kg.";
            attribute :>> currentValue = deliveryDrone.payloadMass;
            attribute :>> maxValue = 5;
            frame concern :DD_STAKEHOLDERNEEDS::LowDeliveryCost;
        }
        #extendedRequirement requirement def AirCharging {
            doc
            /* A drone shall be able to recharge its battery during flight. */
            subject deliveryDroneSystem : DD_SPECIFICATION::DeliveryDroneSystem;
            stakeholder logisticCompany : DD_STAKEHOLDERS::LogisticCompany;
            attribute :>> obligation = ObligationKind::mandatory;
            attribute :>> stability = StabilityKind::unstable;
            attribute :>> motivation = "Extends the delivery range to remote places without ground charging infrastructure.";
            frame concern :DD_STAKEHOLDERNEEDS::ReliableDelivery;
        }
    }
}
