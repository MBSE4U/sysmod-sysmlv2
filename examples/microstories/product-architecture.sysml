package MicroStory_ProductArchitecture {
    private import SYSMOD::*;

    part def Drone {
        port radioPort {
            doc /* Telemetry including battery temperature, and commands. */
        }
        port chargingPort;
    }
    part def ControlStation {
        port radioPort;
    }
    part def DroneDock {
        port chargingPort;
    }
    part def DeliveryDroneProductSystem {
        part drones : Drone [1..*];
        part controlStation : ControlStation;
        part droneDocks : DroneDock [1..*];
        connect drones.radioPort to controlStation.radioPort;
        connect drones.chargingPort to droneDocks.chargingPort;
    }

    #systemContext part def DeliveryDroneProductContext {
        #system part deliveryDroneSystemImpl : DeliveryDroneProductSystem :>> soi;
    }

    #project occurrence def 'Delivery Drone Project' {
        part deliveryDroneProductContext :>> productContext : DeliveryDroneProductContext {
            // productSystem inherits from SYSMOD::Project:
            // satisfy systemRequirementSpecification
            part deliveryDroneProduct :>> deliveryDroneSystemImpl, productSystem;
        }
    }
}
