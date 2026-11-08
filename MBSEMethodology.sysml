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
        ref part authorativeTool : Tool;
        ref part additionalTools[*] : Tool;
        view productViews[*];
        ref modelElements[*] : KerML::Element;
    }
    part def Tool {
        doc /* An instrument that, applied to a method, can enhance the efficiency of the task.
             * Source: J. Estefan, T. Weilkiens: MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
             */

        ref action facilitatesMethodologyBehaviors[1..*] : MethodologyBehavior;
        ref item ownedProducts[*] : Product;
        ref item additionalProducts[*] : Product;
    }
    part def Role {
        ref item responsibleForProducts[*] : Product;
        ref action responsibleForMethodologyBehaviors[*] : MethodologyBehavior;
        ref action supportsMethodologyBehaviors[*] : MethodologyBehavior;
    }
    part def Methodology {
        doc /* A collection of related processes, methods and tools applied to a class of problems that all have something in common.
             * Source: J. Estefan, T. Weilkiens: MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
             */

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
    abstract action def MethodologyBehavior {
        item allInputs  : Product[0..*] = SequenceFunctions::union(inputs, subbehavior.allInputs);
        item allOutputs : Product[1..*] = SequenceFunctions::union(outputs, subbehavior.allOutputs);
        ref part allPrimaryPerformers[1..*] : Role = SequenceFunctions::union(primaryPerformer, subbehavior.primaryPerformer);
        ref part allAdditionalPerformers[*] : Role = SequenceFunctions::union(additionalPerformers, subbehavior.additionalPerformers);
        ref part allFacilitationTools[*] : Tool = SequenceFunctions::union(facilitationTools, subbehavior.facilitationTools);
        
        item inputs  : Product[0..*];   // "requires"
        item outputs : Product[1..*];   // "produces"
        ref part primaryPerformer : Role;
        ref part additionalPerformers[*] : Role;
        ref part facilitationTools[*] : Tool;

        action subbehavior[0..*] : MethodologyBehavior :>> subactions;
    }
    action def Method :> MethodologyBehavior {
        doc /* The techniques to perform a task.
             * Source: J. Estefan, T. Weilkiens: MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
             */
        action submethods : Method[0..*] :>> subbehavior;

        connection responsibleFor[*] : ResponsibleForConnection 
            connect primaryPerformer to submethods;
        connection supports[*] : SupportsConnection 
            connect additionalPerformers to submethods;
        connection productOwnership[*] : ProductOwnershipConnection 
            connect primaryPerformer to submethods.allOutputs;
        connection facilitates[*] : FacilitatesConnection 
            connect facilitationTools to submethods;         

    }
    action def Process :> MethodologyBehavior {
        doc /* A logical sequence of tasks performed to achieve a particular objective. 
             * Source: J. Estefan, T. Weilkiens: MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
             */
        abstract action processBehavior : MethodologyBehavior[0..*] :>> subbehavior;
        action subprocesses : Process[0..*] :> processBehavior;
        action submethods : Method[0..*] :> processBehavior;

        connection responsibleFor[*] : ResponsibleForConnection 
            connect primaryPerformer to processBehavior;
        connection supports[*] : SupportsConnection 
            connect additionalPerformers to processBehavior;
        connection productOwnership[*] : ProductOwnershipConnection 
            connect primaryPerformer to processBehavior.allOutputs;
        connection facilitates[*] : FacilitatesConnection 
            connect facilitationTools to processBehavior;         
    }

    // ------------------------------------------------------------
    // Connections
    // ------------------------------------------------------------
    connection def ResponsibleForConnection {
        end part primaryPerformer : Role crosses methododologyBehavior.primaryPerformer;
        end action methododologyBehavior : MethodologyBehavior crosses primaryPerformer.responsibleForMethodologyBehaviors;
    }
    connection def ProductOwnershipConnection {
        end part owner : Role crosses product.owner;
        end item product : Product crosses owner.responsibleForProducts;
    }
    connection def SupportsConnection {
        end part additionalPerformer : Role crosses additionalMethodologyBehavior.additionalPerformers;
        end action additionalMethodologyBehavior : MethodologyBehavior crosses additionalPerformer.supportsMethodologyBehaviors;
    }
    connection def FacilitatesConnection {
        end part facilitationTool : Tool crosses facilitatedMethodologyBehavior.facilitationTools;
        end action facilitatedMethodologyBehavior : MethodologyBehavior crosses facilitationTool.facilitatesMethodologyBehaviors;
    }
    connection def AuthorativeToolConnection {
        end part authorativeTool : Tool crosses ownedProduct.authorativeTool;
        end item ownedProduct : Product crosses authorativeTool.ownedProducts;
    }
}