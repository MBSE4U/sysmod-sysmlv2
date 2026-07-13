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
        part energyManagement {
        }
        part payloadHandling {
        }
        part 'flight & positioning' {

            action flyToPosition :> flyToPosition;
        }
        part 'planning & diagnosis' {
        }
        part 'monitoring & reporting' {
        }
        part alerting {
        }
    }
}
