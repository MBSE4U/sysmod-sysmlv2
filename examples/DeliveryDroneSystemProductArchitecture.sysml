package <DD_PRODUCT> DeliveryDroneSystemProductArchitecture {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Delivery Drone Product Architecture,
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
        part :>> drones : DD_SPECIFICATION::DeliveryDrone {
            doc
            /* The delivery drone fleet, including charger-equipped drones. */
            port radioPort {
                doc
                /* Radio link to the control station for commands and telemetry. */
            }
            port chargingPort {
                doc
                /* Physical charging contact used while docked. */
            }
        }
        part :>> controlStation {
            doc
            /* The ground control station operating the fleet. */
            port radioPort {
                doc
                /* Radio link to the fleet. */
            }
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
    }
}
package <DD_VV> DeliveryDroneVerificationValidation {
    private import DD_PRODUCT::*;
    private import DD_SPECIFICATION::*;
    private import SYSMOD::*;

    #systemContext part def DeliveryDroneVerificationContext :> DeliveryDroneProductContextImpl {
        doc
        /* The verification context: the white box product context plus the
         * test systems that the verification cases need as additional actors. */
        #externalSystem part windTunnel :> actors {
            doc
            /* A wind tunnel that produces a constant wind speed to test the
             * flight of a drone under defined wind conditions. */
            attribute windSpeed :> ISQ::speed;
        }
    }
    verification def MaxPayloadTest {
        subject testedSystem : DeliveryDroneProductSystemImpl;
        requirement maxReq : Requirements::MaxPayloadMass {
            subject :>> deliveryDrone :> testedSystem.drones;
        }
        objective {
            verify maxReq;
        }
        action preparePayload;
        return verdict = VerificationCases::PassIf(maxReq.result);
    }
}
