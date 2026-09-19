package <DD_FUNCTIONAL_ARCHITECTURE> DeliveryDroneSystemFunctionalArchitecture {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Delivery Drone Functional Architecture
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

    #systemContext part def DeliveryDroneFunctionalContext :> DD_SPECIFICATION::DeliveryDroneSystemContext {
        doc
        /* The context of the functional architecture. It specializes the
         * black-box solution context only: the functional architecture contains
         * functional blocks and must not depend on the physical internal
         * structure of the system. */
        #System part :>> deliveryDroneSystem : DeliveryDroneFunctionalSystem;
    }
    part def DeliveryDroneFunctionalSystem :> DD_SPECIFICATION::DeliveryDroneSystem {
        doc
        /* The root of the functional architecture, for example, developed with
         * the FAS method. It redefines the black-box solution system and thereby
         * inherits the system ports, so the functions can be related to the
         * system's external interfaces. */

        bind operatorPort.order = deliveryManagement.deliveryPort.deliveryOrder;
        part deliveryManagement {
            port deliveryPort : Interfaces::DeliveryPort;
            port pickupPositionPort : ~Interfaces::PositionPort;
            port deliveryPositionPort : ~Interfaces::PositionPort;

            bind deliveryPort.deliveryOrder = planDelivery.order;
            bind pickupPositionPort.position = planDelivery.task.pickupLocation;
            bind deliveryPositionPort.position = planDelivery.task.deliverLocation;
            perform planDelivery;
        }

        interface :Interfaces::PositionInterface 
            connect deliveryManagement.positionPort to flightControl.positionPort;
        part flightControl {
            port positionPort : Interfaces::PositionPort;

            bind positionPort.position = flyToPosition.pos;
            perform flyToPosition;
            perform flyToHomeStation;
        }

        bind packagePort.pkg = packageManagement.packagePort.payload;
        part packageManagement {
            port packagePort : Interfaces::PackagePort;
            
            bind packagePort.payload = pickUpPackage.pkg;
            perform pickUpPackage;

            flow dropOffPackage.deliveredPkg to packagePort.payload;
            perform dropOffPackage;
        }

        part batteryManagement {
            perform chargeInFlight;
            perform batteryLow;

            perform detectLowBattery;
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

        part droneManagement {
            port sensorPort : SensorPort;
            port taskPort : TaskPort;
            port droneStatusPort : ~DroneStatusPort;

            flow sensorPort.sensorData to reportDroneStatus.sensorData;
            flow taskPort.taskData to reportDroneStatus.taskData;
            flow reportDroneStatus.droneStatus to droneStatusPort.droneStatus;
            perform reportDroneStatus;

            perform pollDrones;
        }

        part fleetManagement {
            port fleetStatusPort : FleetStatusPort;
            port droneStatusPort : DroneStatusPort;

            flow fleetStatusPort.fleetStatus to deliverFleetStatus.fleetStatus;
            perform deliverFleetStatus;

            flow droneStatusPort.droneStatus to aggregateFleetStatus.droneStatus;
            flow aggregateFleetStatus.fleetStatus to fleetStatusPort.fleetStatus;
            perform aggregateFleetStatus;

        }
    }

    package Interfaces {
        interface def PositionInterface {
            end port source : ~PositionPort;
            end port target : PositionPort;
            flow source.position to target.position;
        }
        port def DeliveryPort {
            in item deliveryOrder : DeliveryOrder;
        }
        port def PositionPort {
            in item position : Position;
        }
        port def FleetStatusPort {
            inout item fleetStatus : FleetStatus;
        }
        port def DroneStatusPort {
            in item droneStatus : DroneStatus;
        }
        port def SensorPort {
            in item sensorData : SensorData;
        }
        port def TaskPort {
            in item taskData : TaskData;
        }
        port def PackagePort {
            inout item payload : Parcel;
        }
    }
}
