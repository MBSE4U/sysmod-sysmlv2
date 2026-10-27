package MicroStory_Brownfield {
    private import SYSMOD::*;

    part def DeliveryDroneSystem {
        doc /* The existing system as a black box. */
        port operatorPort;
        port payloadPort;
        port energyPort;
    }
    part def DeliveryDrone {
        doc /* Existing drone: purely electric, no exceptions. */
        part engines[4..8];
        part battery { doc /* Charged at the drone docks only. */ }
        part body;
    }
    part def DeliveryDroneSystemImpl :> DeliveryDroneSystem {
        doc /* The existing system as a white box. */
        part drones : DeliveryDrone [1..*];
        part controlStation;
        part droneDocks[1..*];
        connect drones to droneDocks;
        connect drones to controlStation;
    }

    #systemContext part def DeliveryDroneSystemContext {
        #system part deliveryDroneSystem : DeliveryDroneSystem :>> soi;
        #user part operator :> actors {
            port controlPort :>> actorPorts;
        }
        #user part customer :> actors {
            port packagePort :>> actorPorts;
        }
        #externalSystem part energySupply :> actors {
            port supplyPort :>> actorPorts;
        }
        interface operatorInterface :> asis
            connect operator.controlPort to deliveryDroneSystem.operatorPort;
        interface customerInterface :> asis
            connect customer.packagePort to deliveryDroneSystem.payloadPort;
        interface energyInterface :> asis
            connect energySupply.supplyPort to deliveryDroneSystem.energyPort;
    }
    #systemContext part def DeliveryDroneSystemContextImpl :> DeliveryDroneSystemContext {
        #system part deliveryDroneSystemImpl : DeliveryDroneSystemImpl :>> deliveryDroneSystem;
    }

    #project occurrence def 'Delivery Drone Project' {
        part deliveryDroneBrownfieldContext :>> brownfieldContext : DeliveryDroneSystemContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, soi;
        }
        part deliveryDroneBrownfieldContextImpl :>> brownfieldContextImpl : DeliveryDroneSystemContextImpl :> deliveryDroneBrownfieldContext {
            part deliveryDroneSystemImpl :>> deliveryDroneSystem, deliveryDroneSystemImpl, soiImpl;
        }
    }
}
