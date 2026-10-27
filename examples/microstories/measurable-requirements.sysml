package MicroStory_MeasurableRequirements {
    private import SYSMOD::*;

    part def DeliveryDrone {
        attribute payloadMass :> ISQ::mass;
    }

    #extendedRequirement requirement def MaxPayloadMass
        :> SYSMODRequirementsBoilerplates::MaxValue {
        doc /* The system shall transport payloads with a mass of up to
             * 5 kg (tolerance 0.1 kg). */
        subject deliveryDrone : DeliveryDrone;
        attribute :>> obligation = ObligationKind::mandatory;
        attribute :>> stability = StabilityKind::stable;
        attribute :>> motivation = "Typical last-mile parcels weigh less than 5 kg.";
        attribute :>> currentValue :> ISQ::mass = deliveryDrone.payloadMass;
        attribute :>> maxValue :> ISQ::mass = 5 [SI::kg];
        attribute :>> tolerance :> ISQ::mass = 0.1 [SI::kg];
    }
}
