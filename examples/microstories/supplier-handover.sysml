package MicroStory_SupplierHandover {
    private import SYSMOD::*;
    private import RequirementDerivation::*;

    // The handover package: the only package both projects share.
    // The supplier needs no access to the drone model.
    package ControlStationHandover {
        private import SYSMOD::*;

        // 1. Boundary: the control station as a black box and its neighbors as actors.
        part def ControlStation {
            port radioPort;
            port operatorPort;
        }
        part def Drone { port radioPort; }
        part def Operator { port controlPort; }
        #systemContext part def ControlStationContext :> SystemContext {
            #system part controlStation : ControlStation :>> soi;
            #externalSystem part drones : Drone [1..*] :> actors {
                port :>> radioPort :> actorPorts;
            }
            #user part operator : Operator :> actors {
                port :>> controlPort :> actorPorts;
            }
            interface radioInterface :> asis connect drones.radioPort to controlStation.radioPort;
            interface operatorInterface :> asis connect operator.controlPort to controlStation.operatorPort;
        }

        // 2. Flow-down: the handed-over stakeholder and requirements.
        #extendedStakeholder part def DroneOperator {
            attribute :>> categories = StakeholderCategoryKind::user;
        }
        requirement def ControlStationRequirements :> ExtendedRequirement {
            subject controlStation : ControlStation;
            requirement chargerAssignment : ChargerAssignmentTime;
        }
        #extendedRequirement requirement def ChargerAssignmentTime {
            doc /* The control station shall assign a charger drone to a drone
                 * with low battery within 10 s. */
            subject controlStation : ControlStation;
            stakeholder droneOperator : DroneOperator;
            attribute :>> obligation = ObligationKind::mandatory;
            attribute :>> stability = StabilityKind::unstable;
            attribute :>> motivation = "A low-battery drone can only be recharged in flight if a charger drone is assigned in time.";
        }
    }

    // The supplier's own SYSMOD project starts from the handover package:
    // the handover context is its brownfield context.
    #project occurrence def 'Control Station Project' {
        part :>> brownfieldContext : ControlStationHandover::ControlStationContext;
        part droneOperator : ControlStationHandover::DroneOperator :> projectStakeholders;
        requirement :>> handoverRequirements : ControlStationHandover::ControlStationRequirements;
    }

    // The parent project hands the control station over.
    #project occurrence def 'Delivery Drone Project' {
        requirement :>> systemRequirementSpecification {
            requirement airCharging {
                doc /* A drone shall be able to recharge its battery during flight. */
            }
        }

        occurrence controlStationProject : 'Control Station Project' :> subProjects;
        #derivation connection airChargingFlowDown :> requirementFlowDowns {
            end #original ::> systemRequirementSpecification.airCharging;
            end #derive ::> controlStationProject.handoverRequirements.chargerAssignment;
        }

        // 3. Integration: the supplier delivers a black box, so the building block
        // keeps the type of the handover context; verification documents the delivery.
        part :>> productContextImpl {
            part :>> productSystemImpl {
                part controlStation : ControlStationHandover::ControlStation;
            }
        }

        view specificationTreeView : SYSMODViews::SpecificationTreeView { expose this; }
    }
}
