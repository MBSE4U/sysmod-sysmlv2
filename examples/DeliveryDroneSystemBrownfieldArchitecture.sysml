package <DD_BROWNFIELD> DeliveryDroneSystemBrownfieldArchitecture {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Delivery Drone Brownfield Architecture
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

    #systemContext part def DeliveryDroneSystemContext {
        doc
        /* The black-box brownfield context: the delivery drone system as it exists at
         * the start of the project, together with the actors that already interact
         * with it. It constrains the set of possible solutions. */
        #System part deliveryDroneSystem : DeliveryDroneSystem :>> soi {
            doc
            /* The existing delivery drone system as a black box. */
        }
        #User part operator :> actors {
            doc
            /* The human operator who monitors and commands the system. */
            port controlPort;
        }
        #ExternalSystem part landingZone :> actors {
            doc
            /* A marked landing zone where drones pick up and drop off packages. */
            port dronePort;
        }
        #EnvironmentalEffect part environment :> actors {
            doc
            /* Environmental conditions acting on the system, e.g., wind and rain. */
            port conditionsPort;
        }
        interface operatorInterface :> asis connect operator.controlPort to deliveryDroneSystem.operatorPort {
            doc
            /* Command and monitoring interface between the operator and the system. */
        }
        interface landingZoneInterface :> asis connect landingZone.dronePort to deliveryDroneSystem.landingZonePort {
            doc
            /* Physical pick-up and drop-off interface at the landing zone. */
        }
        interface environmentInterface :> asis connect environment.conditionsPort to deliveryDroneSystem.environmentPort {
            doc
            /* Exposure of the system to the environmental conditions. */
        }
    }
    #systemContext part def DeliveryDroneSystemContextImpl :> DeliveryDroneSystemContext {
        doc
        /* The white-box brownfield context: adds the internal structure of the
         * existing delivery drone system. */
        #System part deliveryDroneSystemImpl : DeliveryDroneSystemImpl :>> deliveryDroneSystem {
            doc
            /* The existing delivery drone system as a white box. */
        }
    }
    part def DeliveryDroneSystem {
        doc
        /* Black-box definition of the existing delivery drone system with its
         * external interfaces. */
        port operatorPort {
            in item order : DeliveryDroneDomainLibrary::Items::DeliveryOrder;
        }
        port packagePort {
            inout item pkg : DeliveryDroneDomainLibrary::Items::Parcel;
        }
        port landingZonePort;
        port environmentPort;
    }
    part def DeliveryDroneSystemImpl :> DeliveryDroneSystem {
        doc
        /* White-box definition of the existing delivery drone system: a fleet of
         * drones, a control station, and docks where the drones are charged. */
        part drones[1..*] : DeliveryDrone {
            doc
            /* The fleet of delivery drones. */
        }
        part controlStation {
            doc
            /* The ground station from which the operator supervises the fleet. */
        }
        part droneDocks[1..*] {
            doc
            /* Ground docks where drones park and recharge between flights. */
        }

        connect drones to droneDocks;
        connect drones to controlStation;
        connect droneDocks to controlStation;

        interface connect landingZonePort to drones.landingZonePort;
    }
    part def DeliveryDrone {
        doc
        /* An existing electric delivery drone of the current platform. */
        part engines[4..8] {
            doc
            /* Electric engines; the number depends on the drone variant. */
        }
        part battery {
            doc
            /* Rechargeable battery; today it is charged at the drone docks only. */
        }
        part body {
            doc
            /* Airframe carrying all other components. */
        }
        part payloadAttachment {
            doc
            /* Mount for the package to be delivered. */
        }
        part controlUnit {
            doc
            /* On-board computer for navigation and communication. */
        }

        connect engines to body;
        connect engines to battery;
        connect battery to body;
        connect payloadAttachment to body;
        connect battery to controlUnit;
        connect controlUnit to body;

        port landingZonePort;
    }
}
