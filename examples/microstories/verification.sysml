package MicroStory_Verification {
    private import SYSMOD::*;

    part def Drone {
        attribute payloadMass :> ISQ::mass;
    }
    part def DeliveryDroneProductSystem {
        part drones : Drone [1..*];
    }

    #extendedRequirement requirement def MaxPayloadMass
        :> SYSMODRequirementsBoilerplates::MaxValue {
        doc /* The system shall transport payloads with a mass of up to
             * 5 kg (tolerance 0.1 kg). */
        subject deliveryDrone : Drone;
        attribute :>> obligation = ObligationKind::mandatory;
        attribute :>> currentValue :> ISQ::mass = deliveryDrone.payloadMass;
        attribute :>> maxValue :> ISQ::mass = 5 [SI::kg];
        attribute :>> tolerance :> ISQ::mass = 0.1 [SI::kg];
    }

    verification def MaxPayloadTest {
        subject testedSystem : DeliveryDroneProductSystem;
        requirement maxReq : MaxPayloadMass {
            subject :>> deliveryDrone :> testedSystem.drones;
        }
        objective {
            verify maxReq;
        }
        action preparePayload {
            doc /* Load a 5.0 kg test payload. */
        }
        action flyTestRoute;
        first start then preparePayload;
        first preparePayload then flyTestRoute;
        first flyTestRoute then done;
        return verdict = VerificationCases::PassIf(maxReq.result);
    }

    #project occurrence def 'Delivery Drone Project' {
        verification maxPayloadTest : MaxPayloadTest :> verificationCases {
            // one subject: the library's productSystem is the tested system
            subject :>> productSystem, testedSystem;
        }
    }
}
