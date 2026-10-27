package MicroStory_Stakeholders {
    private import SYSMOD::*;

    #extendedStakeholder part def LogisticCompany {
        doc /* The client: wants faster and cheaper last-mile delivery. */
        attribute :>> risk = LevelKind::high;
        attribute :>> effort = LevelKind::low;
        attribute :>> categories = StakeholderCategoryKind::requirementOwner;
    }
    #extendedStakeholder part def Regulator {
        doc /* The aviation authority: approves autonomous drone operations. */
        attribute :>> risk = LevelKind::high;
        attribute :>> effort = LevelKind::middle;
        attribute :>> categories = StakeholderCategoryKind::requirementOwner;
    }

    #project occurrence def 'Delivery Drone Project' {
        part logisticCompany : LogisticCompany :> projectStakeholders {
            attribute :>> name = "Logistic Company";
        }
        part regulator : Regulator :> projectStakeholders {
            attribute :>> name = "Aviation Authority";
        }
    }
}
