package <DD_STAKEHOLDERS> DeliveryDroneSystemStakeholders {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Stakeholders
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

    #extendedStakeholder part def LogisticCompany {
        doc
        /* The client: a logistics company that wants faster and cheaper last-mile
         * deliveries to remote places. Main source of the delivery performance
         * and cost requirements. */
        attribute :>> risk = LevelKind::high;
        attribute :>> effort = LevelKind::low;
        attribute :>> categories = StakeholderCategoryKind::requirementOwner;
    }
    #extendedStakeholder part def DroneOperator {
        doc
        /* The operator who supervises the drone fleet in daily operation. Source
         * of usability and fleet-monitoring requirements. */
        attribute :>> risk = LevelKind::medium;
        attribute :>> effort = LevelKind::low;
        attribute :>> categories = StakeholderCategoryKind::user;
    }
    #extendedStakeholder part def Recipient {
        doc
        /* The person who receives the delivered parcel at the landing zone.
         * Wants the package to arrive quickly and intact, but has no direct
         * interaction with the drone system. */
        attribute :>> risk = LevelKind::low;
        attribute :>> effort = LevelKind::low;
        attribute :>> categories = StakeholderCategoryKind::other;
    }
    #extendedStakeholder part def Regulator {
        doc
        /* The aviation authority that approves and oversees autonomous drone
         * operations, including airspace and safety rules. Main source of the
         * compliance and certification requirements. */
        attribute :>> risk = LevelKind::high;
        attribute :>> effort = LevelKind::medium;
        attribute :>> categories = StakeholderCategoryKind::requirementOwner;
    }
}

package <DD_STAKEHOLDERNEEDS> DeliveryDroneSystemStakeholderNeeds {
    doc
    /* 
     * SYSMOD Example Model: Delivery Drone
     *
     * Definition of the Stakeholder Needs
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
    private import DD_STAKEHOLDERS::*;

    #extendedConcern concern def ReliableDelivery {
        doc
        /* The logistics company needs deliveries to arrive reliably at remote
         * places, independent of road conditions and ground infrastructure. */
        attribute :>> priority = LevelKind::high;
    }
    #extendedConcern concern def SafeOperation {
        doc
        /* The drone operator needs the fleet to operate without harm to people
         * or property, in any flight zone, including during mid-air charging. */
        attribute :>> priority = LevelKind::critical;
    }
    #extendedConcern concern def LowDeliveryCost {
        doc
        /* The logistics company needs the cost per delivery to be lower than
         * today's ground-based last-mile delivery. */
        attribute :>> priority = LevelKind::medium;
    }
}
