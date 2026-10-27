package MicroStory_LogicalArchitecture {
    private import SYSMOD::*;

    part def DeliveryDroneFunctionalSystem {
        part deliveryManagement;
        part flightControl;
        part batteryManagement;
    }
    part def DeliveryDroneLogicalSystem {
        part flightControlUnit {
            doc /* Keeps each drone on its route, including the air
                 * charging rendezvous. */
        }
        part fleetCoordination {
            doc /* Assigns deliveries and pairs charger drones with
                 * low-battery drones. */
        }
        part energyManagement {
            doc /* Monitors batteries and decides when a drone needs
                 * an air charge. */
        }
    }
    #systemContext part def DeliveryDroneFunctionalContext {
        #system part deliveryDroneSystem : DeliveryDroneFunctionalSystem :>> soi;
    }
    #systemContext part def DeliveryDroneLogicalContext {
        #system part deliveryDroneSystem : DeliveryDroneLogicalSystem :>> soi;
    }

    #project occurrence def 'Delivery Drone Project' {
        part functional :>> functionalContext : DeliveryDroneFunctionalContext;
        part logical :>> logicalContext : DeliveryDroneLogicalContext;

        // Inherited from SYSMOD::Project:
        // functional2logical allocates functionalContext to logicalContext.
        allocation :>> functional2logical allocate func ::> functional to logic ::> logical {
            // the ends func and logic name the two contexts; the nested
            // allocations refine the allocation of the whole architecture
            allocate func.deliveryDroneSystem.deliveryManagement
                to logic.deliveryDroneSystem.fleetCoordination;
            allocate func.deliveryDroneSystem.flightControl
                to logic.deliveryDroneSystem.flightControlUnit;
            allocate func.deliveryDroneSystem.batteryManagement
                to logic.deliveryDroneSystem.energyManagement;
        }
    }
}
