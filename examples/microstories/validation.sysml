package MicroStory_Validation {
    private import SYSMOD::*;

    part def DeliveryDroneSystem {
        attribute costPerTrip;
    }
    #extendedStakeholder part def LogisticCompany;

    #extendedConcern concern def LowDeliveryCost {
        doc /* Cost per delivery lower than today's ground-based delivery. */
        subject brownfieldSystem : DeliveryDroneSystem;
        stakeholder logisticCompany : LogisticCompany;
        attribute :>> priority = LevelKind::middle;
    }

    verification def IslandPilotValidation {
        doc /* Four weeks of real deliveries to the island with the client. */
        subject pilotSystem : DeliveryDroneSystem;
        concern lowCost : LowDeliveryCost {
            subject :>> brownfieldSystem = pilotSystem;
        }
        objective {
            verify lowCost;
        }
        action runPilotDeliveries;
        action compareCostWithVans;
        first start then runPilotDeliveries;
        first runPilotDeliveries then compareCostWithVans;
        first compareCostWithVans then done;
    }

    #project occurrence def 'Delivery Drone Project' {
        // SYSMOD adds nothing for V&V: verificationCases holds
        // verification and validation cases alike.
        verification islandPilot : IslandPilotValidation :> verificationCases {
            // one subject: the library's productSystem is the pilot system
            subject :>> productSystem, pilotSystem;
        }
    }
}
