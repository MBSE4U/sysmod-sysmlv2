package MicroStory_SpecificationSystem {
    private import SYSMOD::*;

    part def DeliveryDroneSystem {
        doc /* The specification system as a black box: the subject of all
             * use cases and system requirements. */
        port operatorPort;
        port payloadPort;
        action planDelivery;
        action flyToPosition;
        action pickUpPackage;
        action dropOffPackage;
        action chargeInFlight;
    }

    #systemContext part def DeliveryDroneSpecificationContext {
        #system part deliveryDroneSystem : DeliveryDroneSystem :>> soi;
        #user part operator :> actors {
            port controlPort :>> actorPorts;
        }
        #user part customer :> actors {
            port packagePort :>> actorPorts;
        }
        #externalSystem part landingZone :> actors {
            doc /* Outside the boundary: owned by the client. */
        }
        #environmentalEffect part environment :> actors {
            doc /* Wind, rain and temperature acting on the system. */
        }
        interface operatorInterface :> asis
            connect operator.controlPort to deliveryDroneSystem.operatorPort;
        interface customerInterface :> asis
            connect customer.packagePort to deliveryDroneSystem.payloadPort;
    }

    #project occurrence def 'Delivery Drone Project' {
        part deliveryDroneSpecificationContext :>> specificationContext : DeliveryDroneSpecificationContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, soi;
        }
    }
}
