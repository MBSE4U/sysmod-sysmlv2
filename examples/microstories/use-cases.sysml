package MicroStory_UseCases {
    private import SYSMOD::*;

    part def DeliveryDroneSystem;
    part def Operator;
    part def Customer;

    #systemUseCase use case def DeliverPackage {
        subject droneSystem : DeliveryDroneSystem;
        actor operator : Operator;
        actor customer : Customer;
        objective {
            doc /* The package is delivered to the landing zone and the
                 * drone returns safely. */
        }
        attribute :>> ucTrigger = "The operator dispatches a drone with a package.";
        attribute :>> ucResult = "The package is at the landing zone and the drone is back home.";
        constraint :>> precondition {
            doc /* A drone is assigned to an order with known pickup and
                 * destination. */
        }
        constraint :>> postcondition {
            doc /* The package is at the landing zone; the drone is home. */
        }
    }
    #systemUseCase use case def ReportFleetStatus {
        subject droneSystem : DeliveryDroneSystem;
        actor operator : Operator;
        attribute :>> ucTrigger = "The operator requests the fleet status.";
        attribute :>> ucResult = "The operator sees the status of every drone at once.";
    }

    #systemContext part def DeliveryDroneSpecificationContext {
        #system part deliveryDroneSystem : DeliveryDroneSystem :>> soi;
        #user part operator : Operator :> actors;
        #user part customer : Customer :> actors;
        use case deliverPackage : DeliverPackage {
            subject :>> droneSystem :> deliveryDroneSystem;
            actor :>> operator = DeliveryDroneSpecificationContext::operator;
            actor :>> customer = DeliveryDroneSpecificationContext::customer;
        }
        use case reportFleetStatus : ReportFleetStatus {
            subject :>> droneSystem :> deliveryDroneSystem;
            actor :>> operator = DeliveryDroneSpecificationContext::operator;
        }
    }
}
