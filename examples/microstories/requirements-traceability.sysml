package MicroStory_Traceability {
    private import SYSMOD::*;

    part def DeliveryDroneSystem;
    #extendedStakeholder part def LogisticCompany;

    #extendedConcern concern def LowDeliveryCost {
        doc /* Cost per delivery lower than today's ground-based delivery. */
        subject brownfieldSystem : DeliveryDroneSystem;
        stakeholder logisticCompany : LogisticCompany;
        attribute :>> priority = LevelKind::middle;
    }
    #extendedRequirement requirement def MaxPayloadMass {
        doc /* The system shall transport payloads with a mass of up to
             * 5 kg (tolerance 0.1 kg). */
        subject deliveryDroneSystem : DeliveryDroneSystem;
        stakeholder logisticCompany : LogisticCompany;
        attribute :>> obligation = ObligationKind::mandatory;
        attribute :>> stability = StabilityKind::stable;
        attribute :>> motivation = "Typical last-mile parcels weigh less than 5 kg.";
    }
    requirement def DeliveryDroneSystemRequirements :> ExtendedRequirement {
        subject deliveryDroneSystem : DeliveryDroneSystem;
        requirement maxPayloadMass : MaxPayloadMass;
    }

    #project occurrence def <PRJ> 'Delivery Drone Project' {
        part logisticCompany : LogisticCompany :> projectStakeholders;

        concern :>> stakeholderNeeds {
            concern lowDeliveryCost : LowDeliveryCost {
                subject;
                stakeholder :>> logisticCompany = PRJ::logisticCompany;
            }
        }

        // Upward: the requirement names its stakeholder and frames the need.
        // Downward: the library's productSystem satisfies the whole
        // systemRequirementSpecification.
        requirement deliveryDroneSystemRequirementsSpecification
            :>> systemRequirementSpecification : DeliveryDroneSystemRequirements {
            subject :>> specificationSystem, deliveryDroneSystem;
            requirement :>> maxPayloadMass {
                subject;
                stakeholder :>> logisticCompany = logisticCompany;
                frame PRJ::stakeholderNeeds.lowDeliveryCost;
            }
        }
    }
}
