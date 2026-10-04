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

        item homePosition : Position {
            doc /* The position of the home base of the drone. */
        }

        action acceptBatteryLow {
            doc /* Accepts the low-battery signal that interrupts the drone's flight to its destination. */
            out item lowBattSignal : LowBatterySignal = acceptLowBattery.lowBattSignal {
                doc /* The accepted signal indicating that the drone's battery is too low for its remaining route. */
            }
            action acceptLowBattery accept lowBattSignal : LowBatterySignal;
        }
        action aggregateFleetStatus {
            doc /* Aggregates every drone's status into one fleet-wide view. */
            in item droneStatus : DroneStatus {
                doc /* The status reported by each active drone. */
            }
            out item fleetStatus : FleetStatus {
                doc /* The combined status of all active drones. */
            }
        }
        action alertOperator {
            doc /* Alerts the operator that the drone is performing an emergency landing. */
            in item faultSignal : FaultSignal {
                doc /* The signal indicating the critical fault that causes the emergency landing. */
            }
            out item notice : EmergencyNotice {
                doc /* The emergency notice sent to the operator. */
            }
        }
        action assignChargerDrone {
            doc /* Assigns a nearby charger drone to meet the low-battery drone in flight. */
            in item lowBattSignal : LowBatterySignal {
                doc /* The signal indicating which drone needs to be recharged. */
            }
            in item pos : Position {
                doc /* The current position of the low-battery drone. */
            }
            out item chargerAssign : ChargerAssignment {
                doc /* The assignment pairing the low-battery drone with a charger drone. */
            }
        }
        action chargeInFlight {
            doc /* Recharges the drone's battery in flight when it runs low en route. */
            in item energy : Energy {
                doc /* The energy received from the charger drone. */
            }
        }
        action deliverFleetStatus {
            doc /* Delivers the aggregated fleet status to the operator. */
            in item fleetStatus : FleetStatus {
                doc /* The aggregated status of all active drones. */
            }
        }
        action detectFault {
            doc /* Detects a critical fault in the drone during flight. */
            in item faultData : FaultData {
                doc /* The onboard data indicating a malfunction. */
            }
            out item faultSignal : FaultSignal {
                doc /* The signal indicating that a critical fault was detected. */
            }
        }
        action detectLowBattery {
            doc /* Detects that a drone's battery has fallen below the threshold for its remaining route and sends a low-battery signal. */
            in port sender {
                doc /* The port via which the low-battery signal is sent. */
            }
            item lowBattSignal : LowBatterySignal;
            send lowBattSignal via sender;
        }
        action dropOffPackage {
            doc /* Delivers the parcel to the recipient at the landing zone. */
            out item deliveredPkg : Parcel = payloadPort.pkgOut {
                doc /* The parcel handed over to the recipient via the payload port. */
            }
        }
        action flyToPosition : FlyToPosition {
            doc /* Flies the drone to a given target position. */
        }
        action identifyLandingSite {
            doc /* Identifies the nearest suitable site for an emergency landing. */
            in item faultSignal : FaultSignal {
                doc /* The signal indicating the critical fault that requires an emergency landing. */
            }
            in item pos : Position {
                doc /* The destination position for the emergency landing. */
            }
            in item envData : EnvData {
                doc /* Environmental data, such as terrain and obstacles, used to assess candidate landing sites. */
            }
        }
        action notifyOutcome {
            doc /* Notifies the operator of the outcome of the emergency landing. */
            in item outcome : LandingOutcome {
                doc /* The result of the emergency landing, including whether the parcel was delivered. */
            }
            out item incidentReport : IncidentReport {
                doc /* The report of the emergency landing sent to the operator. */
            }
        }
        action performEmergencyLanding {
            doc /* Lands the drone at the identified site as safely as possible. */
        }
        action pickUpPackage {
            doc /* Loads the assigned parcel onto the drone at the depot. */
            in item pkg : Parcel = payloadPort.pkgIn {
                doc /* The parcel received via the package port. */
            }
        }
        action planDelivery {
            doc /* Turns a delivery order into a delivery task for a drone, including the pickup and delivery locations. */
            in item order : DeliveryOrder = operatorPort.order {
                doc /* The delivery order received from the operator. */
            }
            out item task : DeliveryTask {
                doc /* The delivery task assigned to a drone. */
            }
        }
        action pollDrones {
            doc /* Polls every active drone in the fleet for its current status. */
            in item req : StatusRequest {
                doc /* The operator's request for the fleet status. */
            }
            out item droneStatus : DroneStatus {
                doc /* The status returned by each polled drone. */
            }
        }
        action rendezvousInFlight {
            doc /* Brings the charger drone and the low-battery drone together at a shared position. */
            in item chargerAssign : ChargerAssignment {
                doc /* The assignment pairing the low-battery drone with the charger drone. */
            }
            in item pos : Position {
                doc /* The current position of the drone. */
            }
            out item chargePos : ChargingPosition {
                doc /* The in-flight position where both drones meet to transfer energy. */
            }
        }
        action reportDroneStatus {
            doc /* Reports a single drone's position, battery level, and task status. */
            in item sensorData : SensorData {
                doc /* The onboard sensor readings, such as position and battery level. */
            }
            in item taskData : TaskData {
                doc /* Information about the drone's currently assigned task. */
            }
            out item droneStatus : DroneStatus {
                doc /* The resulting status of the drone. */
            }
        }
        action requestStatus {
            doc /* Initiates the operator's request for a fleet-wide status overview. */
            out item req : StatusRequest {
                doc /* The request for the fleet status. */
            }
        }
        action resumeRoute {
            doc /* Lets the recharged drone continue its interrupted route. */
        }
        action transferEnergy {
            doc /* Transfers energy from the charger drone to the low-battery drone's battery. */
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
        attribute payloadMass :> ISQ::mass {
            doc /* The mass of the parcel currently carried by the drone. */
        }
    }

    package UseCases {
        #systemUseCase use case def DeliverPackage {
            subject droneSystem : DeliveryDroneSystem {
                perform action ucPlanDelivery ::> planDelivery;
                perform action ucPickUpPackage ::> pickUpPackage;
                perform action ucAcceptBatteryLow ::> acceptBatteryLow;
                perform action ucChargeInFlight ::> chargeInFlight;
                perform action ucFlyToPosition ::> flyToPosition;
                perform action ucDropOffPackage ::> dropOffPackage;
            }
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
            in item energy : Energy;            

            binding bind order = droneSystem.ucPlanDelivery.order;
            binding bind pkgIn = droneSystem.ucPickUpPackage.pkg;
            binding bind pkgOut = droneSystem.ucDropOffPackage.deliveredPkg;
            binding bind energy = droneSystem.ucChargeInFlight.energy;

            action flyToPickup :> droneSystem.ucFlyToPosition;
            action flyToDelivery :> droneSystem.ucFlyToPosition;
            action flyToHome :> droneSystem.ucFlyToPosition {
                in item pos : Position = droneSystem.homePosition;
            }

            first start then droneSystem.ucPlanDelivery;
            first droneSystem.ucPlanDelivery then flyToPickup;
            flow from droneSystem.ucPlanDelivery.task.pickupLocation to flyToPickup.pos;
            flow from droneSystem.ucPlanDelivery.task.deliverLocation to flyToDelivery.pos;
            first flyToPickup then droneSystem.ucPickUpPackage;
            first droneSystem.ucPickUpPackage then m1;
            first m1 then flyToDelivery;
            first droneSystem.ucAcceptBatteryLow then droneSystem.ucChargeInFlight;
            first flyToDelivery then droneSystem.ucDropOffPackage;
            first droneSystem.ucChargeInFlight then m1;
            first droneSystem.ucDropOffPackage then flyToHome;
            first flyToHome then done;           
            
            merge m1;
        }
        #systemUseCase use case def ChargeDrone {
            subject droneSystem : DeliveryDroneSystem {
                perform action ucDetectLowBattery ::> detectLowBattery;
                perform action ucAssignChargerDrone ::> assignChargerDrone;
                perform action ucRendezvousInFlight ::> rendezvousInFlight;
                perform action ucTransferEnergy ::> transferEnergy;
                perform action ucResumeRoute ::> resumeRoute;
            }
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

            first start then droneSystem.ucDetectLowBattery;
            first droneSystem.ucDetectLowBattery then droneSystem.ucAssignChargerDrone;
            first droneSystem.ucAssignChargerDrone then droneSystem.ucRendezvousInFlight;
            first droneSystem.ucRendezvousInFlight then droneSystem.ucTransferEnergy;
            first droneSystem.ucTransferEnergy then droneSystem.ucResumeRoute;
            first droneSystem.ucResumeRoute then done;

            flow from droneSystem.ucAssignChargerDrone.chargerAssign to droneSystem.ucRendezvousInFlight.chargerAssign;
        }
        #systemUseCase use case def ReportFleetStatus {
            subject droneSystem : DeliveryDroneSystem {
                perform action ucRequestStatus ::> requestStatus;
                perform action ucPollDrones ::> pollDrones;
                perform action ucReportDroneStatus ::> reportDroneStatus;
                perform action ucAggregateFleetStatus ::> aggregateFleetStatus;
                perform action ucDeliverFleetStatus ::> deliverFleetStatus;
            }
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

            first start then droneSystem.ucRequestStatus;
            first droneSystem.ucRequestStatus then droneSystem.ucPollDrones;
            first droneSystem.ucPollDrones then droneSystem.ucReportDroneStatus;
            first droneSystem.ucReportDroneStatus then droneSystem.ucAggregateFleetStatus;
            first droneSystem.ucAggregateFleetStatus then droneSystem.ucDeliverFleetStatus;
            first droneSystem.ucDeliverFleetStatus then done;
        }
        #systemUseCase use case def HandleEmergencyLanding {
            subject droneSystem : DeliveryDroneSystem {
                perform action ucDetectFault ::> detectFault;
                perform action ucIdentifyLandingSite ::> identifyLandingSite;
                perform action ucAlertOperator ::> alertOperator;
                perform action ucPerformEmergencyLanding ::> performEmergencyLanding;
                perform action ucNotifyOutcome ::> notifyOutcome;
            }
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
            first start then droneSystem.ucDetectFault;
            first droneSystem.ucDetectFault then droneSystem.ucIdentifyLandingSite;
            first droneSystem.ucIdentifyLandingSite then droneSystem.ucAlertOperator;
            first droneSystem.ucAlertOperator then droneSystem.ucPerformEmergencyLanding;
            first droneSystem.ucPerformEmergencyLanding then droneSystem.ucNotifyOutcome;
            first droneSystem.ucNotifyOutcome then done;
        }
    }

    package Requirements {
        requirement def DeliveryDroneSystemRequirements {
            doc
            /* Root of the delivery drone system requirements. */
            subject deliveryDroneSystem : DD_SPECIFICATION::DeliveryDroneSystem;
            stakeholder projectOwner : ExtendedStakeholder;
            requirement maxPayloadMass : MaxPayloadMass;
            requirement airCharging : AirCharging;
        }
        #extendedRequirement requirement def MaxPayloadMass :> SYSMODRequirementsBoilerplates::MaxValue {
            doc
            /* The system shall transport payloads with a mass of up to 5 kg (tolerance 0.1 kg). */
            subject deliveryDrone : DD_SPECIFICATION::DeliveryDrone;
            stakeholder logisticCompany : DD_STAKEHOLDERS::LogisticCompany;
            attribute :>> obligation = ObligationKind::mandatory;
            attribute :>> stability = StabilityKind::stable;
            attribute :>> motivation = "Typical last-mile parcels weigh less than 5 kg.";
            attribute :>> currentValue :> ISQ::mass = deliveryDrone.payloadMass;
            attribute :>> maxValue :> ISQ::mass = 5 [SI::kg];
            attribute :>> tolerance :> ISQ::mass = 0.1 [SI::kg];
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
