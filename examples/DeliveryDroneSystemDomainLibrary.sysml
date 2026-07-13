library package <DDD> DeliveryDroneDomainLibrary {
    doc 
    /* SYSMOD Example Model: Delivery Drone Domain Library
     *
     * Definition of the Delivery Drone Domain Entities
     *
     * The focus is on demonstrating how to use SYSMOD, in particular how a
     * sub-project relates to its parent project. Therefore, the model is
     * oversimplified and does not cover the subject in either breadth or depth.
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
    package Items {
        item def Parcel {
            doc /* The physical package being transported by the drone. */
        }
        item def DeliveryOrder {
            doc /* The client's request specifying what to deliver and where. */
        }
        item def DeliveryTask {
            doc /* A concrete delivery assignment given to a specific drone. */
            item pickupLocation : Position;
            item deliverLocation : Position;
        }
        item def Position {
            doc /* A drone position.  */
        }
        item def LowBatterySignal {
            doc /* An indication that a drone's battery is too low to complete its route. */
        }
        item def BatteryLevel {
            doc /* The current charge level of a drone's battery. */
        }
        item def ChargerAssignment {
            doc /* The assignment pairing a low-battery drone with a specific charger drone. */
        }
        item def ChargingPosition {
            doc /* The shared in-flight position where two drones meet to transfer energy. */
        }
        item def StatusRequest {
            doc /* A request from the operator for the fleet's current status. */
        }
        item def DroneStatus {
            doc /* The position, battery level, and task status of a single drone. */
        }
        item def SensorData {
            doc /* Raw onboard sensor readings from a drone. */
        }
        item def TaskData {
            doc /* Information about a drone's currently assigned task. */
        }
        item def FleetStatus {
            doc /* The combined status of every active drone in the fleet. */
        }
        item def FaultData {
            doc /* Raw data indicating a malfunction detected on board a drone. */
        }
        item def FaultSignal {
            doc /* A signal indicating that a drone has a critical fault. */
        }
        item def EnvData {
            doc /* Environmental data, such as terrain and obstacles, near the drone. */
        }
        item def EmergencyNotice {
            doc /* A notification informing the operator of an in-progress emergency. */
        }
        item def LandingOutcome {
            doc /* The result of an emergency landing, including whether the parcel was delivered. */
        }
        item def IncidentReport {
            doc /* A record of the emergency landing and its outcome. */
        }
    }
    package Behavior {
        action def FlyToPosition { in item pos : Items::Position; }
    }
}
