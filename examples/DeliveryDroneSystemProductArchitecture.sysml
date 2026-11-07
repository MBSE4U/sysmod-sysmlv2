package <DD_PRODUCT> DeliveryDroneSystemProductArchitecture {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Delivery Drone Product Architecture,
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

    #systemContext part def DeliveryDroneProductContext :> DD_SPECIFICATION::DeliveryDroneSystemContext {
        doc
        /* The black box context of the product architecture. */
        #system part :>> deliveryDroneSystem : DeliveryDroneProductSystem;

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
    #systemContext part def DeliveryDroneProductContextImpl :> DeliveryDroneProductContext, DD_SPECIFICATION::DeliveryDroneSystemContextImpl {
        doc
        /* The white box context of the product architecture: adds the
         * concrete, physical building blocks of the product system. */
        #system part :>> deliveryDroneSystemImpl : DeliveryDroneProductSystemImpl;
    }
    part def DeliveryDroneProductSystem :> DD_SPECIFICATION::DeliveryDroneSystem {
        doc
        /* The product system as a black box. It redefines the black box
         * specification system and inherits the system ports. */
    }
    part def DeliveryDroneProductSystemImpl :> DeliveryDroneProductSystem, DD_SPECIFICATION::DeliveryDroneSystemImpl {
        doc
        /* The product architecture: the concrete, physical building blocks of
         * the delivery drone system. */
        part :>> drones : DD_SPECIFICATION::DeliveryDrone, DDCS_HANDOVER::Drone {
            doc
            /* The delivery drone fleet, including charger-equipped drones. They specialize the drones of the
             * handover context of the control station sub-project. */
            port :>> radioPort {
                doc
                /* Radio link to the control station for commands and telemetry. */
            }
            port chargingPort {
                doc
                /* Physical charging contact used while docked. */
            }
        }
        part :>> controlStation : DDCS_HANDOVER::ControlStation {
            doc
            /* The ground control station operating the fleet. It is developed in the control station
             * sub-project, which refers to it as its parentElement (sub-project contract). */
        }
        part :>> droneDocks {
            doc
            /* Ground docks, now needed at the depot only. */
            port chargingPort {
                doc
                /* Physical charging contact for a docked drone. */
            }
        }
        connect drones.radioPort to controlStation.radioPort;
        connect drones.chargingPort to droneDocks.chargingPort;
        interface connect operatorPort to controlStation.operatorPort {
            doc
            /* Delegation of the operator interface of the system to the control station. */
        }
    }
    part def ControlStation :> DDCS_HANDOVER::ControlStation {
        doc
        /* The control station building block. It specializes the system of interest of the handover context of the
         * control station sub-project (DeliveryDroneControlStationHandover), which fixes its ports and attributes. */
    }

    //
    // Alternative product architecture, evaluated in the charging concept trade study of the project
    //
    #systemContext part def DedicatedChargerProductContextImpl :> DeliveryDroneProductContext, DD_SPECIFICATION::DeliveryDroneSystemContextImpl {
        doc
        /* Alternative product architecture (not selected): a separate fleet of dedicated charger drones
         * recharges the delivery drones in flight. */
        #system part :>> deliveryDroneSystemImpl : DedicatedChargerProductSystemImpl;
    }
    part def DedicatedChargerProductSystemImpl :> DeliveryDroneProductSystem, DD_SPECIFICATION::DeliveryDroneSystemImpl {
        doc
        /* The building blocks of the alternative: delivery drones without air charger and dedicated
         * charger drones with large batteries. */
        part :>> drones : DD_SPECIFICATION::DeliveryDrone, DDCS_HANDOVER::Drone {
            doc
            /* The delivery drones; they receive energy in flight but carry no air charger. */
            part :>> airCharger [0];
        }
        part chargerDrones [1..*] {
            doc
            /* Dedicated charger drones with large batteries that recharge the delivery drones in flight. */
        }
        part :>> controlStation : ControlStation;
    }
}
package <DD_VV> DeliveryDroneVerificationValidation {
    private import DD_PRODUCT::*;
    private import SYSMOD::*;

    #systemContext part def DeliveryDroneVerificationContext :> DeliveryDroneProductContextImpl {
        doc
        /* The verification context: the white box product context plus the
         * test systems that the verification cases need as additional actors.
         * The verification case definitions, e.g., MaxPayloadTest, are part of the
         * specification (DD_SPECIFICATION::Verification); the project binds them
         * to the product system in its verification context. */
        #externalSystem part windTunnel :> actors {
            doc
            /* A wind tunnel that produces a constant wind speed to test the
             * flight of a drone under defined wind conditions. */
            attribute windSpeed :> ISQ::speed;
        }
    }
}
