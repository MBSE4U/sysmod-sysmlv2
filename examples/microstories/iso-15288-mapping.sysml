package MicroStory_ISO15288Mapping {
    private import SYSMOD::*;
    private import ISO15288Processes::Stakeholders::*;

    // The thread, defined in the SYSMOD library:
    //   process     ISO15288Processes::SystemArchitectureDefinition
    //   stakeholder SystemArchitect
    //   concern     ISO15288Processes::Concerns::ProblemSolutionIntegration
    //   viewpoint   SYSMODViews::Viewpoints::ArchitectureViewpoint (frames the concern)
    //   view        SYSMODViews::ProductArchitectureView (satisfies the viewpoint)
    //   step        CreateProductArchitecture creates the viewed productContextImpl
    //               and refines ISO15288Processes::SystemArchitectureDefinition. The loop is closed.

    // The brownfield: what the Logistic Company already runs.
    part def DeliveryDroneSystemImpl {
        part drones[1..*];
        part controlStation;
        part droneDocks[1..*];
    }
    // The twist: the product system specializes the brownfield system.
    // Control station and docks are inherited, not redrawn.
    part def DeliveryDroneProductSystem :> DeliveryDroneSystemImpl {
        part airChargingAdapter;
    }

    #systemContext part def DeliveryDroneBrownfieldContextImpl {
        #system part deliveryDroneSystemImpl : DeliveryDroneSystemImpl :>> soi;
    }
    #systemContext part def DeliveryDroneProductContextImpl :> DeliveryDroneBrownfieldContextImpl {
        #system part deliveryDroneProductSystem : DeliveryDroneProductSystem :>> deliveryDroneSystemImpl;
    }

    #project occurrence def 'Delivery Drone Project' {
        part johnFinch : ProductManager :>> projectOwner {
            attribute :>> name = "John Finch";
        }
        part logisticCompany : Acquirer :> projectStakeholders {
            attribute :>> name = "Logistic Company";
        }

        // SYSMOD::Project chains the white box contexts:
        // productContextImpl :> specificationContextImpl :> systemIdeaContextImpl :> brownfieldContextImpl
        part :>> brownfieldContextImpl : DeliveryDroneBrownfieldContextImpl;
        part :>> productContextImpl : DeliveryDroneProductContextImpl;

        // The view for the System Architecture Definition process,
        // and the view of the system it builds on.
        view productArchitectureView : SYSMODViews::ProductArchitectureView {
            expose productContextImpl;
        }
        view brownfieldArchitectureView : SYSMODViews::BrownfieldArchitectureView {
            expose brownfieldContextImpl;
        }
    }
}
