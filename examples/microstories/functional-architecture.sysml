package MicroStory_FunctionalArchitecture {
    private import SYSMOD::*;

    port def PositionPort {
        in item position;
    }
    part def DeliveryDroneSystem {
        action planDelivery;
        action flyToPosition;
        action detectLowBattery;
        action chargeInFlight;
    }
    part def DeliveryDroneFunctionalSystem :> DeliveryDroneSystem {
        part deliveryManagement {
            port targetPositionPort : ~PositionPort;
            perform planDelivery;
        }
        part flightControl {
            port flyToPositionPort : PositionPort;
            perform flyToPosition;
        }
        part batteryManagement {
            perform detectLowBattery;
            perform chargeInFlight;
        }
        interface connect deliveryManagement.targetPositionPort
            to flightControl.flyToPositionPort;
    }

    #systemContext part def DeliveryDroneFunctionalContext {
        #system part deliveryDroneSystem : DeliveryDroneFunctionalSystem :>> soi;
    }

    #project occurrence def 'Delivery Drone Project' {
        part deliveryDroneFunctionalContext :>> functionalContext : DeliveryDroneFunctionalContext {
            part deliveryDroneSystem :>> deliveryDroneSystem, functionalSystem;
        }
    }
}
