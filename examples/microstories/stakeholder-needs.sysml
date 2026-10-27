package MicroStory_StakeholderNeeds {
    private import SYSMOD::*;

    part def DeliveryDroneSystem;
    #extendedStakeholder part def LogisticCompany;
    #extendedStakeholder part def DroneOperator;

    #extendedConcern concern def ReliableDelivery {
        doc /* Deliveries arrive reliably at remote places, independent of
             * road conditions and ground infrastructure. */
        subject brownfieldSystem : DeliveryDroneSystem;
        stakeholder logisticCompany : LogisticCompany;
        attribute :>> priority = LevelKind::high;
    }
    #extendedConcern concern def SafeOperation {
        doc /* The fleet operates without harm to people or property,
             * including during mid-air charging. */
        subject brownfieldSystem : DeliveryDroneSystem;
        stakeholder droneOperator : DroneOperator;
        attribute :>> priority = LevelKind::critical;
    }

    #project occurrence def <PRJ> 'Delivery Drone Project' {
        part logisticCompany : LogisticCompany :> projectStakeholders;
        part droneOperator : DroneOperator :> projectStakeholders;

        // Inherited from SYSMOD::Project: stakeholderNeeds frames
        // the problemStatement.
        concern :>> stakeholderNeeds {
            concern reliableDelivery : ReliableDelivery {
                subject;
                stakeholder :>> logisticCompany = PRJ::logisticCompany;
            }
            concern safeOperation : SafeOperation {
                subject;
                stakeholder :>> droneOperator = PRJ::droneOperator;
            }
        }
    }
}
