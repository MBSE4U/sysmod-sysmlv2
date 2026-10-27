package MicroStory_TheProject {
    private import SYSMOD::*;

    #project occurrence def 'Delivery Drone Project' {
        doc /* Charter: a logistics company wants faster and cheaper
             * last-mile deliveries to remote places. AmperDrones designs
             * and develops the delivery drone system. */

        attribute :>> purpose = "Develop an autonomous delivery drone system for remote last-mile deliveries that is faster and cheaper than the client's ground-based delivery.";

        part johnFinch :>> projectOwner {
            doc /* Head of drone engineering at AmperDrones, accountable
                 * for the Delivery Drone project. */
            attribute :>> name = "John Finch";
        }

        // Two views for the project cover: one standard and one AI-enhanced.
        view projectCoverView   : SYSMODViews::ProjectView   { expose this; }
        view projectCoverAIView : SYSMODViews::ProjectAIView { expose this; }
    }
}
