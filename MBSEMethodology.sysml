library package MBSEMethodology {
    doc
    /* 
     * Definition of MBSE Methodology Concepts
     *
     * Version v5.1.8
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

    // ------------------------------------------------------------
    // MBSE Environment
    // ------------------------------------------------------------
    occurrence def MBSEEnvironment {
        part tools[*] : Tool;
        part roles[*] : Role;
        part methodology : Methodology {
            part :>> tools :> MBSEEnvironment::tools;
            part :>> roles :> MBSEEnvironment::roles;
        }    
        occurrence rootProduct : Product;

        connection toolConnections [*] connect tools to methodology;
        connection roleConnection [*] connect roles to methodology;
    }

    // ------------------------------------------------------------
    // Things
    // ------------------------------------------------------------
    item def Product {
        ref part owner : Role;
        view productViews[*];
        ref modelElements[*] : KerML::Element;
    }
    part def Tool {
        ref action facilitatesMethods[1..*] : Method;
        item payloads[*];
    }
    part def Role {
        ref item responsibleForProducts[*] : Product;
        ref action responsibleForMethods[*] : Method;
        ref action supportsMethods[*] : Method;
    }
    part def Methodology {
        part tools[*] : Tool :> processes.allFacilitationTools;
        part roles[*] : Role :> processes.allPrimaryPerformers, processes.allAdditionalPerformers;
        item products[*] : Product :> processes.allOutputs;
        action processes[*] : Process;

        connection responsibleFor[*] : ResponsibleForConnection 
            connect roles to processes;
        connection supports[*] : SupportsConnection 
            connect roles to processes;
        connection productOwnership[*] : ProductOwnershipConnection 
            connect roles to products;
        connection facilitates[*] : FacilitatesConnection 
            connect tools to processes;
    }

    // ------------------------------------------------------------
    // Behavior
    // ------------------------------------------------------------
    action def Method {
        item allInputs  : Product[0..*] = SequenceFunctions::union(inputs, submethods.allInputs);
        item allOutputs : Product[1..*] = SequenceFunctions::union(outputs, submethods.allOutputs);
        ref part allPrimaryPerformers[1..*] : Role = SequenceFunctions::union(primaryPerformer, submethods.primaryPerformer);
        ref part allAdditionalPerformers[*] : Role = SequenceFunctions::union(additionalPerformers, submethods.additionalPerformers);
        ref part allFacilitationTools[*] : Tool = SequenceFunctions::union(facilitationTools, submethods.facilitationTools);
        
        item inputs  : Product[0..*];   // "requires"
        item outputs : Product[1..*];   // "produces"
        ref part primaryPerformer : Role;
        ref part additionalPerformers[*] : Role;
        ref part facilitationTools[*] : Tool;

        action submethods : Method[0..*] :>> subactions;

        connection responsibleFor[*] : ResponsibleForConnection 
            connect primaryPerformer to submethods;
        connection supports[*] : SupportsConnection 
            connect additionalPerformers to submethods;
        connection productOwnership[*] : ProductOwnershipConnection 
            connect primaryPerformer to submethods.allOutputs;
        connection facilitates[*] : FacilitatesConnection 
            connect facilitationTools to submethods;         
    }
    action def Process :> Method;

    // ------------------------------------------------------------
    // Connections
    // ------------------------------------------------------------
    connection def ResponsibleForConnection {
        end part primaryPerformer : Role crosses method.primaryPerformer;
        end action method : Method crosses primaryPerformer.responsibleForMethods;
    }
    connection def ProductOwnershipConnection {
        end part owner : Role crosses product.owner;
        end item product : Product crosses owner.responsibleForProducts;
    }
    connection def SupportsConnection {
        end part additionalPerformer : Role crosses additionalMethod.additionalPerformers;
        end action additionalMethod : Method crosses additionalPerformer.supportsMethods;
    }
    connection def FacilitatesConnection {
        end part facilitationTool : Tool crosses facilitatedMethod.facilitationTools;
        end action facilitatedMethod : Method crosses facilitationTool.facilitatesMethods;
    }
}