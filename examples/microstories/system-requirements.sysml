package MicroStory_SystemRequirements {
    private import SYSMOD::*;

    part def DeliveryDroneSystem;

    #extendedRequirement requirement def AirCharging {
        doc /* A drone shall be able to recharge its battery during flight. */
        subject deliveryDroneSystem : DeliveryDroneSystem;
        attribute :>> obligation = ObligationKind::mandatory;
        attribute :>> stability = StabilityKind::unstable;
        attribute :>> motivation = "Reach remote places without ground charging infrastructure.";
    }
    requirement def DeliveryDroneSystemRequirements :> ExtendedRequirement {
        doc /* Root of the delivery drone system requirements. */
        subject deliveryDroneSystem : DeliveryDroneSystem;
        requirement airCharging : AirCharging;
    }

    #project occurrence def 'Delivery Drone Project' {
        // Inherited from SYSMOD::Project: systemRequirementSpecification
        // frames the stakeholderNeeds.
        requirement deliveryDroneSystemRequirementsSpecification
            :>> systemRequirementSpecification : DeliveryDroneSystemRequirements {
            // one subject: the library's specificationSystemImpl (white box) is the drone system
            subject :>> specificationSystemImpl, deliveryDroneSystem;
        }
    }
}
