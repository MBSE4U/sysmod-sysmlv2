package MicroStory_ProblemStatement {
    private import SYSMOD::*;
    private import SYSMODViews::Stakeholders::*;

    #project occurrence def 'Delivery Drone Project' {
        // John is the project owner and plays the ISO 15288 role
        // responsible for Business or Mission Analysis.
        part johnFinch : ProductManager :>> projectOwner {
            attribute :>> name = "John Finch";
        }
        // The client has the problem and must agree with it.
        part logisticCompany : Acquirer :> projectStakeholders {
            attribute :>> name = "Logistic Company";
        }

        // Inherited from SYSMOD::Project: an ExtendedConcern with
        // priority critical and the brownfield system as subject.
        concern :>> problemStatement {
            doc /* How can we deliver small packages to remote places faster
                 * and at lower cost than today's ground-based delivery?
                 * Today's drones must return to a ground dock to recharge,
                 * which limits range and makes remote deliveries slow. */
            subject;
            stakeholder :>> projectOwner = johnFinch;
        }

        // Two views of the same statement. SYSMODViews defines them;
        // the project declares them and exposes its problem statement.
        view problemStatementView : SYSMODViews::ProblemStatementView { expose problemStatement; }
        view problemStatementAIView : SYSMODViews::ProblemStatementAIView { expose problemStatement; }
        // Both satisfy the ProblemSolutionViewpoint, which frames the concerns
        // ProblemSolutionPitch and MissionGoalsAndMeasures of the
        // ProductManager and the Acquirer.
    }
}
