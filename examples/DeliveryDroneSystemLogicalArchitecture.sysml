package <DD_LOGICAL> DeliveryDroneSystemLogicalArchitecture {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Delivery Drone Logical Architecture,
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

    #systemContext part def DeliveryDroneLogicalContext :> DD_SPECIFICATION::DeliveryDroneSystemContext {
        doc
        /* The context of the logical architecture. */
        #System part :>> deliveryDroneSystem : DeliveryDroneLogicalSystem;
    }
    part def DeliveryDroneLogicalSystem :> DD_SPECIFICATION::DeliveryDroneSystem {
        doc
        /* The logical architecture: technology-independent building blocks that
         * realize the functional architecture. */
        part flightControl {
            doc
            /* Keeps each drone on its route, including the air charging rendezvous. */
        }
        part fleetCoordination {
            doc
            /* Assigns deliveries and pairs charger drones with low-battery drones. */
        }
        part energyManagement {
            doc
            /* Monitors batteries and decides when a drone needs an air charge. */
        }
    }
}
