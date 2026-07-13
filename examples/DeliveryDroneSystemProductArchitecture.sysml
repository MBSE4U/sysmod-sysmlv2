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

    #systemContext part def DeliveryDroneProductContext :> DD_SPECIFICATION::DeliveryDroneSystemContextImpl {
        doc
        /* The context of the product architecture. */
        #System part :>> deliveryDroneSystemImpl : DeliveryDroneProductSystem;
    }   
    part def DeliveryDroneProductSystem :> DD_SPECIFICATION::DeliveryDroneSystemImpl {
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
    verification def MaxPayloadTest {
        subject testedSystem : DeliveryDroneProductSystem;
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
