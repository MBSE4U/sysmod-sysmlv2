package MicroStory_SystemIdea {
    private import SYSMOD::*;

    // Brownfield, reduced to what the idea builds on
    part def DeliveryDrone {
        doc /* Existing electric drone of the current platform. */
        part battery;
    }
    part def DeliveryDroneSystemImpl {
        part drones : DeliveryDrone [1..*];
    }
    #systemContext part def BrownfieldContextImpl {
        #system part deliveryDroneSystemImpl : DeliveryDroneSystemImpl :>> soi;
    }

    // The system idea
    part def AirChargingDrone :> DeliveryDrone {
        doc /* Drone of the system idea with optional air charging. */
        part airCharger[0..1] {
            doc /* Turns this drone into a flying charger. */
        }
        part airChargerAdapter {
            doc /* Receives energy from a charger drone in flight. */
        }
        connect airChargerAdapter to battery;
    }
    part def DeliveryDroneSystemIdeaImpl :> DeliveryDroneSystemImpl {
        doc /* Drones recharge each other in flight. A drone low on battery
             * no longer returns to a dock; a charger drone meets it. */
        part :>> drones : AirChargingDrone;
    }
    #systemContext part def SystemIdeaContextImpl :> BrownfieldContextImpl {
        #system part :>> deliveryDroneSystemImpl : DeliveryDroneSystemIdeaImpl;
    }

    #project occurrence def <PRJ> 'Delivery Drone Project' {
        concern :>> problemStatement {
            doc /* How can we deliver small packages to remote places faster
                 * and at lower cost than today's ground-based delivery? */
        }
        part deliveryDroneSystemIdeaContextImpl :>> systemIdeaContextImpl : SystemIdeaContextImpl {
            part deliveryDroneSystemImpl :>> deliveryDroneSystemImpl, soiImpl {
                satisfy PRJ::problemStatement;
            }
        }
    }
}
