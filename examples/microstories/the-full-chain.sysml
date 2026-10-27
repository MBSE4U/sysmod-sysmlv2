package MicroStory_TheFullChain {
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
        subject deliveryDroneSystem : DeliveryDroneSystem;
        requirement airCharging : AirCharging;
    }

    #project occurrence def <PRJ> 'Delivery Drone Project' {
        part johnFinch :>> projectOwner {
            attribute :>> name = "John Finch";
        }
        part logisticCompany :> projectStakeholders {
            attribute :>> name = "Logistic Company";
        }
        concern :>> problemStatement {
            doc /* How can we deliver small packages to remote places faster
                 * and at lower cost than today's ground-based delivery? */
            subject;
            stakeholder :>> projectOwner = johnFinch;
        }
        concern :>> stakeholderNeeds {
            concern reliableDelivery : ExtendedConcern {
                doc /* Deliveries arrive even when roads are closed. */
                subject;
                stakeholder client = PRJ::logisticCompany;
                attribute :>> priority = LevelKind::high;
            }
        }
        requirement deliveryDroneSystemRequirementsSpecification
            :>> systemRequirementSpecification : DeliveryDroneSystemRequirements {
            subject :>> specificationSystem, deliveryDroneSystem;
        }
        verification airChargingTest :> verificationCases {
            objective {
                verify deliveryDroneSystemRequirementsSpecification.airCharging;
            }
        }

        // Inherited from SYSMOD::Project, the links of the chain:
        //   stakeholderNeeds frames problemStatement
        //   systemRequirementSpecification frames stakeholderNeeds
        //   the system idea satisfies problemStatement
        //   productSystem satisfies systemRequirementSpecification
        //   functional2logical and logical2product allocations
    }
}
