package MicroStory_UseCaseFlow {
    private import SYSMOD::*;

    part def DeliveryDroneSystem {
        attribute batteryLow : ScalarValues::Boolean;
        action planDelivery;
        action flyToPosition;
        action pickUpPackage;
        action dropOffPackage;
        action chargeInFlight;
    }

    #systemUseCase use case def DeliverPackage {
        subject droneSystem : DeliveryDroneSystem {
            perform action ucPlanDelivery ::> planDelivery;
            perform action ucFlyToPosition ::> flyToPosition;
            perform action ucPickUpPackage ::> pickUpPackage;
            perform action ucChargeInFlight ::> chargeInFlight;
            perform action ucDropOffPackage ::> dropOffPackage;
        }

        // the local steps (flight legs, charge, drop off) are usages of the
        // actions the system owns once; all other steps use them directly
        action flyToPickup :> droneSystem.ucFlyToPosition;
        action flyToDelivery :> droneSystem.ucFlyToPosition;
        action flyHome :> droneSystem.ucFlyToPosition;
        action charge :> droneSystem.ucChargeInFlight;
        action dropOff :> droneSystem.ucDropOffPackage;

        first start then droneSystem.ucPlanDelivery;
        first droneSystem.ucPlanDelivery then flyToPickup;
        first flyToPickup then droneSystem.ucPickUpPackage;
        first droneSystem.ucPickUpPackage then resume;
        first resume then flyToDelivery;
        first flyToDelivery then batteryCheck;
        decide batteryCheck;
            if droneSystem.batteryLow then charge;
            if not droneSystem.batteryLow then dropOff;
        first charge then resume;
        first dropOff then flyHome;
        first flyHome then done;

        merge resume;
    }
}
