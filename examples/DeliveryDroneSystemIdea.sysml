package <DD_SYSTEMIDEA> DeliveryDroneSystemIdea {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Delivery Drone System Idea
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     *
     * Copyright 2026, MBSE4U, Tim Weilkiens
     */

    private import SYSMOD::*;

    #systemContext part def DeliveryDroneSystemIdeaContext :> DD_BROWNFIELD::DeliveryDroneSystemContext {
        doc
        /* The black box system idea context. The system boundary, actors, and
         * interfaces are unchanged with respect to the brownfield context; the
         * idea changes the inside of the system only. */
        #system part deliveryDroneSystem :>> DD_BROWNFIELD::DeliveryDroneSystemContext::deliveryDroneSystem : DeliveryDroneSystem;
    }
    #systemContext part def DeliveryDroneSystemIdeaContextImpl :> DeliveryDroneSystemIdeaContext, DD_BROWNFIELD::DeliveryDroneSystemContextImpl {
        doc
        /* The white box system idea context: adds the internal structure of the
         * system idea. */
        #system part deliveryDroneSystemImpl :>> DD_BROWNFIELD::DeliveryDroneSystemContextImpl::deliveryDroneSystemImpl, DeliveryDroneSystemIdeaContext::deliveryDroneSystem : DeliveryDroneSystemIdeaImpl;
    }
    part def DeliveryDroneSystem :> DD_BROWNFIELD::DeliveryDroneSystem {
        doc
        /* The system idea as a black box. Externally unchanged: same actors and
         * interfaces as the brownfield system. */
    }
    part def DeliveryDroneSystemIdeaImpl :> DeliveryDroneSystem, DD_BROWNFIELD::DeliveryDroneSystemImpl {
        doc
        /* The system idea: delivery drones that can recharge each other in the
         * air. A drone low on battery no longer needs to return to a drone dock;
         * a charger drone meets it en route. This extends the delivery range to
         * remote places without any ground charging infrastructure, faster and
         * cheaper than ground-based delivery. */
        part drones :>> drones : DeliveryDrone;
    }
    part def DeliveryDrone :> DD_BROWNFIELD::DeliveryDrone {
        doc
        /* The delivery drone of the system idea, extended by optional air
         * charging equipment. */
        part airCharger[0..1] {
            doc
            /* Optional equipment turning a drone into a flying charger for
             * other drones. */
        }
        part airChargerAdapter {
            doc
            /* Adapter that receives energy from a charger drone in flight. */
        }
        connect airCharger to airChargerAdapter;
        connect airChargerAdapter to battery;
    }

    //
    // System Objectives: the measurable goals of the system idea
    //
    #extendedConcern concern def FastRemoteDelivery {
        doc
        /* A delivery to a remote place takes at most half the time of today's
         * ground-based delivery. Addresses the stakeholder need ReliableDelivery
         * and the problem statement. */
        subject systemIdea : DeliveryDroneSystem;
        attribute maxDeliveryTimeRatio : ScalarValues::Real = 0.5 {
            doc /* Delivery time with the drone system divided by the delivery time
                   of today's ground-based delivery. */
        }
        attribute :>> priority = LevelKind::critical;
    }
    #extendedConcern concern def LowCostPerDelivery {
        doc
        /* The cost per delivery is at most 70 % of the cost of today's
         * ground-based delivery. Addresses the stakeholder need LowDeliveryCost. */
        subject systemIdea : DeliveryDroneSystem;
        attribute maxCostRatio : ScalarValues::Real = 0.7 {
            doc /* Cost per delivery with the drone system divided by the cost per
                   delivery of today's ground-based delivery. */
        }
        attribute :>> priority = LevelKind::high;
    }
    #extendedConcern concern def OnTimeDelivery {
        doc
        /* At least 98 % of the deliveries arrive within the promised time window.
         * Addresses the stakeholder need ReliableDelivery. */
        subject systemIdea : DeliveryDroneSystem;
        attribute minOnTimeRate : ScalarValues::Real = 0.98 {
            doc /* Share of deliveries that arrive within the promised time window. */
        }
        attribute :>> priority = LevelKind::high;
    }
}
