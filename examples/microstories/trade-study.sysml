package MicroStory_TradeStudy {
    private import SYSMOD::*;

    // Two candidate product architectures for air charging. Both specialize the same
    // base context, so both inherit the brownfield and the specification system.
    #systemContext part def ChargingConceptContext {
        #system part deliveryDroneSystem :>> soi;
    }
    #systemContext part def ConvertibleDronesContext :> ChargingConceptContext {
        doc /* Every delivery drone can carry the optional air charger and serve as charger drone. */
        #system part :>> deliveryDroneSystem {
            part drones[1..*] { part airCharger[0..1]; }
        }
    }
    #systemContext part def DedicatedChargerContext :> ChargingConceptContext {
        doc /* A separate fleet of charger drones with large batteries. */
        #system part :>> deliveryDroneSystem {
            part drones[1..*];
            part chargerDrones[1..*];
        }
    }

    #project occurrence def 'Delivery Drone Project' {
        // The criteria are the system objectives; their priorities are the weights.
        concern :>> systemObjectives {
            concern fastRemoteDelivery : ExtendedConcern { attribute :>> priority = LevelKind::critical; }
            concern lowCostPerDelivery : ExtendedConcern { attribute :>> priority = LevelKind::high; }
            concern onTimeDelivery : ExtendedConcern { attribute :>> priority = LevelKind::high; }
        }

        // The decision lives in the model: the product context is a variation,
        // the alternatives are its variants, the rationale names the trade study.
        variation part chargingConcept :>> productContextImpl {
            @ModelingMetadata::Rationale {
                text = "Convertible drones: highest evaluation in chargingConceptStudy, no separate charger fleet to buy and maintain.";
            }
            variant part convertibleDrones : ConvertibleDronesContext;
            variant part dedicatedChargers : DedicatedChargerContext;
        }
        // An analysis cannot reference variants directly, so the project refers to them.
        ref part optionA : ConvertibleDronesContext = chargingConcept::convertibleDrones;
        ref part optionB : DedicatedChargerContext = chargingConcept::dedicatedChargers;

        // Evaluation = sum of priority * score: A = 1.0*0.9 + 0.75*0.8 + 0.75*0.8 = 2.1,
        // B = 1.0*0.8 + 0.75*0.5 + 0.75*0.9 = 1.85. A is selected.
        analysis chargingConceptStudy : SYSMODTradeStudy :> tradeStudies {
            subject :>> alternatives = (optionA, optionB);
            ref concern :>> criteria = (systemObjectives.fastRemoteDelivery,
                systemObjectives.lowCostPerDelivery, systemObjectives.onTimeDelivery);
            attribute aFast :> assessments { ref part :>> alternative = optionA; ref concern :>> criterion = systemObjectives.fastRemoteDelivery; attribute :>> score = 0.9; }
            attribute aCost :> assessments { ref part :>> alternative = optionA; ref concern :>> criterion = systemObjectives.lowCostPerDelivery; attribute :>> score = 0.8; }
            attribute aOnTime :> assessments { ref part :>> alternative = optionA; ref concern :>> criterion = systemObjectives.onTimeDelivery; attribute :>> score = 0.8; }
            attribute bFast :> assessments { ref part :>> alternative = optionB; ref concern :>> criterion = systemObjectives.fastRemoteDelivery; attribute :>> score = 0.8; }
            attribute bCost :> assessments { ref part :>> alternative = optionB; ref concern :>> criterion = systemObjectives.lowCostPerDelivery; attribute :>> score = 0.5; }
            attribute bOnTime :> assessments { ref part :>> alternative = optionB; ref concern :>> criterion = systemObjectives.onTimeDelivery; attribute :>> score = 0.9; }
        }

        view tradeStudyView : SYSMODViews::TradeStudyView { expose chargingConceptStudy; }
    }
}
