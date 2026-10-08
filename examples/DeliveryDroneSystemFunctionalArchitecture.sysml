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
         * black-box specification context only: the functional architecture contains
         * functional blocks and must not depend on the physical internal
         * structure of the system. */
        #system part :>> deliveryDroneSystem : DeliveryDroneFunctionalSystem;

        use case :>> deliverPackage : DD_SPECIFICATION::UseCases::DeliverPackage {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
        use case :>> chargeDrone : DD_SPECIFICATION::UseCases::ChargeDrone {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
        use case :>> reportFleetStatus : DD_SPECIFICATION::UseCases::ReportFleetStatus {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
        use case :>> handleEmergencyLanding : DD_SPECIFICATION::UseCases::HandleEmergencyLanding {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
        use case :>> monitorDroneHealth : DD_SPECIFICATION::UseCases::MonitorDroneHealth {
            subject :>> droneSystem :> deliveryDroneSystem;
        }
    }
    part def DeliveryDroneFunctionalSystem :> DD_SPECIFICATION::DeliveryDroneSystem {
        doc
        /* The root of the functional architecture, for example, developed with
         * the FAS method. It redefines the black-box specification system and thereby
         * inherits the system ports, so the functions can be related to the
         * system's external interfaces. */

        bind operatorPort.order = deliveryManagement.deliveryPort.deliveryOrder;
        bind energyPort.energy = batteryManagement.energyPort.energy;

        part deliveryManagement {
            port deliveryPort : Interfaces::DeliveryPort;
            port pickupPositionPort : ~Interfaces::PositionPort;
            port deliveryPositionPort : ~Interfaces::PositionPort;

            bind deliveryPort.deliveryOrder = planDelivery.order;
            bind pickupPositionPort.position = planDelivery.task.pickupLocation;
            bind deliveryPositionPort.position = planDelivery.task.deliverLocation;
            perform planDelivery;
            perform createDeliveryOrder;
        }

        interface :Interfaces::PositionInterface 
            connect deliveryManagement.pickupPositionPort to flightControl.flyToPositionPort;
        interface :Interfaces::PositionInterface 
            connect deliveryManagement.deliveryPositionPort to flightControl.flyToPositionPort;

        part flightControl {
            port flyToPositionPort : Interfaces::PositionPort {
                out item _position = position;
            }
            port chargerDronePositionPort : Interfaces::PositionPort;
            port chargerPositionPort : Interfaces::PositionPort;
            port chargerPort : Interfaces::ChargerPort;

            flow flyToPositionPort._position to flyToPosition.pos;
            perform flyToPosition;
            bind chargerPort.chargerAssign = rendezvousInFlight.chargerAssign;
            bind chargerDronePositionPort.position = rendezvousInFlight.pos;
            bind chargerPositionPort.position = rendezvousInFlight.chargePos;
            perform rendezvousInFlight;
            perform resumeRoute;
        }

        bind payloadPort.pkgIn = packageManagement.payloadInPort.payload;
        bind payloadPort.pkgOut = packageManagement.payloadOutPort.payload;
        part packageManagement {
            port payloadInPort : Interfaces::PayloadPort;
            port payloadOutPort : ~Interfaces::PayloadPort;
            
            perform pickUpPackage;
            perform dropOffPackage;
        }

        part batteryManagement {
            port energyPort : Interfaces::EnergyPort;
            port lowBatteryPort : ~Interfaces::LowBatteryPort;

            bind energyPort.energy = chargeInFlight.energy;
            perform chargeInFlight;
            
            bind acceptBatteryLow.lowBattSignal = lowBatteryPort.lowBattSignal;
            perform acceptBatteryLow;
            perform detectLowBattery;
            perform transferEnergy;
        }
        
        part droneManagement {
            port sensorPort : Interfaces::SensorPort;
            port taskPort : Interfaces::TaskPort;
            port droneStatusPort : ~Interfaces::DroneStatusPort;

            bind sensorPort.sensorData = reportDroneStatus.sensorData;
            bind taskPort.taskData = reportDroneStatus.taskData;
            bind reportDroneStatus.droneStatus = droneStatusPort.droneStatus;
            perform reportDroneStatus;

            perform pollDrones;
        }

        part fleetManagement {
            port fleetStatusPort : Interfaces::FleetStatusPort;
            port droneStatusPort : Interfaces::DroneStatusPort;

            flow fleetStatusPort.fleetStatus to deliverFleetStatus.fleetStatus;
            perform deliverFleetStatus;

            bind droneStatusPort.droneStatus = aggregateFleetStatus.droneStatus;
            bind aggregateFleetStatus.fleetStatus = fleetStatusPort.fleetStatus;
            perform aggregateFleetStatus;            
            perform requestStatus;
            perform pollDrones;
        }
    }

    package Interfaces {
        interface def PositionInterface {
            end port source : ~PositionPort;
            end port target : PositionPort;
            flow source.position to target.position;
        }
        port def EnergyPort {
            in item energy : Energy;
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
        port def PayloadPort {
            in item payload : Parcel;
        }
        port def LowBatteryPort {
            in item lowBattSignal : LowBatterySignal;
        }
        port def ChargerPort {
            in item chargerAssign : ChargerAssignment;
        }
    }
}
