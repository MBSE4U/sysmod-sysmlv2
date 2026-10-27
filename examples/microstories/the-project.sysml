package MicroStory_TheProject {
    private import SYSMOD::*;

    #project occurrence def 'Delivery Drone Project' {
        doc /* Charter: a logistics company wants faster and cheaper
             * last-mile deliveries to remote places. AmperDrones designs
             * and develops the delivery drone system. */

        // The inputs of the first SYSMOD step, SetupProject
        // (refines ISO 15288 Project Planning).
        action :>> defaultProcess {
            in attribute :>> projectOwnerName = "John Finch";
            in attribute :>> projectPurpose = "Develop an autonomous delivery drone system for remote last-mile deliveries that is faster and cheaper than the client's ground-based delivery.";
        }

        // What SetupProject assigns to the project:
        part johnFinch :>> projectOwner {
            doc /* Head of drone engineering at AmperDrones, accountable
                 * for the Delivery Drone project. */
            attribute :>> name = "John Finch";
        }
        attribute :>> purpose = "Develop an autonomous delivery drone system for remote last-mile deliveries that is faster and cheaper than the client's ground-based delivery.";

        // Inherited from SYSMOD::Project – the project's cover page:
        //   view projectCoverView   : SYSMODViews::ProjectView   { expose this; }
        //   view projectCoverAIView : SYSMODViews::ProjectAIView { expose this; }
        // Both satisfy the ProjectViewpoint, which frames the concerns
        // ProjectStatus (ProjectManager, PortfolioManager) and
        // ProblemSolutionIntegration (SystemArchitect).
    }
}
