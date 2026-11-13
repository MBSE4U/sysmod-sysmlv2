library package MBSEMethodology {
    doc
    /*
     * Definition of MBSE Methodology Concepts
     *
     * Version v5.1.9 (proposal: capabilities)
     *
     * The metamodel of an MBSE environment: the methodology with its processes and methods, the roles that
     * perform them, the tools that facilitate them, the products they need and produce, and the capabilities
     * they provide and require. The terms methodology, process, method and tool follow J. Estefan, T. Weilkiens:
     * MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
     * Other libraries build on it, e.g., ISO15288Processes (products and processes), SYSMOD (the SYSMOD steps
     * are methods) and DTFA (the Digital Thread Flow Analysis of an MBSE environment).
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
        doc /* The environment in which an organization, e.g., a company or a team, performs MBSE: its tools, its roles,
             * and the methodology that relates them. An environment can specialize another one, e.g., a team environment
             * specializes the company environment and redefines the methods as the team performs them.
             */
        part tools[*] : Tool {
            doc /* The tools available in the environment. */
        }
        part roles[*] : Role {
            doc /* The roles in the environment. */
        }
        part methodology : Methodology {
            doc /* The methodology applied in the environment. Its tools and roles are those of the environment. */
            part :>> tools :> MBSEEnvironment::tools;
            part :>> roles :> MBSEEnvironment::roles;
        }
        occurrence rootProduct : Product {
            doc /* The top-level product developed in the environment, e.g., a SYSMOD project. */
        }
        analysis analyses[*] {
            doc /* Analyses of the MBSE environment, e.g., a Digital Thread Flow Analysis (library package DTFA). */
        }

        connection toolConnections [*] connect tools to methodology {
            doc /* Connects a tool of the environment to the methodology that uses it. */
        }
        connection roleConnection [*] connect roles to methodology {
            doc /* Connects a role of the environment to the methodology in which it acts. */
        }
    }

    // ------------------------------------------------------------
    // Things
    // ------------------------------------------------------------
    item def Product {
        doc /* A work product that methodology behaviors need (inputs) and produce (outputs), e.g., a requirements
             * specification or an architecture description. A role owns it, and an authoritative tool holds its master data.
             */
        ref part owner : Role {
            doc /* The role that is responsible for the product (ProductOwnershipConnection). */
        }
        ref part authorativeTool : Tool {
            doc /* The tool that holds the authoritative (master) data of the product (AuthorativeToolConnection). */
        }
        ref part additionalTools[*] : Tool {
            doc /* Further tools that hold or present data of the product, e.g., copies or derived representations. */
        }
        view productViews[*] {
            doc /* The views that present the product, e.g., the views of a SYSMOD project. */
        }
        ref modelElements[*] : KerML::Element {
            doc /* The model elements that make up the product. */
        }
    }
    occurrence def Capability {
        doc /* The ability to achieve a desired effect under specified conditions, independent of how it is achieved.
             * A capability is provided by methodology behaviors (processes, methods), tools and roles, and it is
             * required by methodology behaviors. Capabilities are refined by specialization.
             */
        ref occurrence requiredCapabilities[*] : Capability {
            doc /* The capabilities this capability depends on. */
        }
    }
    part def Tool {
        doc /* An instrument that, applied to a method, can enhance the efficiency of the task.
             * Source: J. Estefan, T. Weilkiens: MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
             */

        ref occurrence providedCapabilities[*] : Capability {
            doc /* The capabilities the tool provides. */
        }
        ref action facilitatesMethodologyBehaviors[1..*] : MethodologyBehavior {
            doc /* The processes and methods the tool facilitates (FacilitatesConnection). */
        }
        ref item ownedProducts[*] : Product {
            doc /* The products for which the tool is the authoritative tool (AuthorativeToolConnection). */
        }
        ref item additionalProducts[*] : Product {
            doc /* The products of which the tool holds or presents data without being their authoritative tool. */
        }
    }
    part def Role {
        doc /* A set of responsibilities and competencies that a person or a group takes on in the methodology,
             * e.g., system architect or requirements engineer. A role performs methodology behaviors and owns products.
             */
        ref occurrence providedCapabilities[*] : Capability {
            doc /* The capabilities the role provides, e.g., competencies. */
        }
        ref item responsibleForProducts[*] : Product {
            doc /* The products the role owns (ProductOwnershipConnection). */
        }
        ref action responsibleForMethodologyBehaviors[*] : MethodologyBehavior {
            doc /* The processes and methods the role is the primary performer of (ResponsibleForConnection). */
        }
        ref action supportsMethodologyBehaviors[*] : MethodologyBehavior {
            doc /* The processes and methods the role supports as an additional performer (SupportsConnection). */
        }
    }
    part def Methodology {
        doc /* A collection of related processes, methods and tools applied to a class of problems that all have something in common.
             * Source: J. Estefan, T. Weilkiens: MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
             */

        part tools[*] : Tool :> processes.allFacilitationTools {
            doc /* The tools of the methodology, including all tools that facilitate its processes. */
        }
        part roles[*] : Role :> processes.allPrimaryPerformers, processes.allAdditionalPerformers {
            doc /* The roles of the methodology, including all primary and additional performers of its processes. */
        }
        item products[*] : Product :> processes.allOutputs {
            doc /* The products of the methodology, including all outputs of its processes. */
        }
        action processes[*] : Process {
            doc /* The processes of the methodology. */
        }
        ref occurrence capabilities[*] : Capability {
            doc /* The capabilities the methodology shall provide: its objectives. */
        }

        connection responsibleFor[*] : ResponsibleForConnection
            connect roles to processes {
            doc /* A role is responsible for a process: its primary performer. */
        }
        connection supports[*] : SupportsConnection
            connect roles to processes {
            doc /* A role supports a process as an additional performer. */
        }
        connection productOwnership[*] : ProductOwnershipConnection
            connect roles to products {
            doc /* A role owns a product. */
        }
        connection facilitates[*] : FacilitatesConnection
            connect tools to processes {
            doc /* A tool facilitates a process. */
        }
    }

    // ------------------------------------------------------------
    // Behavior
    // ------------------------------------------------------------
    abstract action def MethodologyBehavior {
        doc /* The common base of processes and methods: a behavior with inputs and outputs (products), a primary
             * performer, additional performers and facilitation tools (roles and tools), and provided and required
             * capabilities. A methodology behavior is composed of subbehaviors; the "all" features collect the
             * respective features of the behavior and its direct subbehaviors.
             */
        item allInputs  : Product[0..*] = SequenceFunctions::union(inputs, subbehavior.allInputs) {
            doc /* The inputs of the behavior and of its subbehaviors. */
        }
        item allOutputs : Product[1..*] = SequenceFunctions::union(outputs, subbehavior.allOutputs) {
            doc /* The outputs of the behavior and of its subbehaviors. */
        }
        ref part allPrimaryPerformers[1..*] : Role = SequenceFunctions::union(primaryPerformer, subbehavior.primaryPerformer) {
            doc /* The primary performers of the behavior and of its direct subbehaviors. */
        }
        ref part allAdditionalPerformers[*] : Role = SequenceFunctions::union(additionalPerformers, subbehavior.additionalPerformers) {
            doc /* The additional performers of the behavior and of its direct subbehaviors. */
        }
        ref part allFacilitationTools[*] : Tool = SequenceFunctions::union(facilitationTools, subbehavior.facilitationTools) {
            doc /* The facilitation tools of the behavior and of its direct subbehaviors. */
        }

        item inputs  : Product[0..*] {
            doc /* The products the behavior requires. */
        }
        item outputs : Product[1..*] {
            doc /* The products the behavior produces. A methodology behavior produces at least one product. */
        }
        ref occurrence providedCapabilities[*] : Capability {
            doc /* "provides": performing the behavior contributes to the capability. */
        }
        ref occurrence requiredCapabilities[*] : Capability {
            doc /* "requires": the behavior can only be performed with the capability. */
        }
        ref occurrence allProvidedCapabilities[*] : Capability = SequenceFunctions::union(providedCapabilities, subbehavior.allProvidedCapabilities) {
            doc /* The capabilities provided by the behavior and by its subbehaviors. */
        }
        ref occurrence allRequiredCapabilities[*] : Capability = SequenceFunctions::union(requiredCapabilities, subbehavior.allRequiredCapabilities) {
            doc /* The capabilities required by the behavior and by its subbehaviors. */
        }
        ref part primaryPerformer : Role {
            doc /* The role that is responsible for the behavior. */
        }
        ref part additionalPerformers[*] : Role {
            doc /* The roles that support the behavior. */
        }
        ref part facilitationTools[*] : Tool {
            doc /* The tools that facilitate the behavior. */
        }

        action subbehavior[0..*] : MethodologyBehavior :>> subactions {
            doc /* The processes and methods the behavior is composed of. */
        }
    }
    action def Method :> MethodologyBehavior {
        doc /* The techniques to perform a task.
             * Source: J. Estefan, T. Weilkiens: MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
             */
        action submethods : Method[0..*] :>> subbehavior {
            doc /* The methods the method is composed of. A method has no subprocesses. */
        }

        connection responsibleFor[*] : ResponsibleForConnection
            connect primaryPerformer to submethods {
            doc /* The primary performer of the method is responsible for its submethods. */
        }
        connection supports[*] : SupportsConnection
            connect additionalPerformers to submethods {
            doc /* The additional performers of the method support its submethods. */
        }
        connection productOwnership[*] : ProductOwnershipConnection
            connect primaryPerformer to submethods.allOutputs {
            doc /* The primary performer of the method owns the outputs of its submethods. */
        }
        connection facilitates[*] : FacilitatesConnection
            connect facilitationTools to submethods {
            doc /* The facilitation tools of the method facilitate its submethods. */
        }

    }
    action def Process :> MethodologyBehavior {
        doc /* A logical sequence of tasks performed to achieve a particular objective.
             * Source: J. Estefan, T. Weilkiens: MBSE Methodologies. Handbook of Model-Based Systems Engineering. Springer.
             */
        abstract action processBehavior : MethodologyBehavior[0..*] :>> subbehavior {
            doc /* The subprocesses and submethods of the process. */
        }
        action subprocesses : Process[0..*] :> processBehavior {
            doc /* The processes the process is composed of. */
        }
        action submethods : Method[0..*] :> processBehavior {
            doc /* The methods that perform the tasks of the process. */
        }

        connection responsibleFor[*] : ResponsibleForConnection
            connect primaryPerformer to processBehavior {
            doc /* The primary performer of the process is responsible for its subprocesses and submethods. */
        }
        connection supports[*] : SupportsConnection
            connect additionalPerformers to processBehavior {
            doc /* The additional performers of the process support its subprocesses and submethods. */
        }
        connection productOwnership[*] : ProductOwnershipConnection
            connect primaryPerformer to processBehavior.allOutputs {
            doc /* The primary performer of the process owns the outputs of its subprocesses and submethods. */
        }
        connection facilitates[*] : FacilitatesConnection
            connect facilitationTools to processBehavior {
            doc /* The facilitation tools of the process facilitate its subprocesses and submethods. */
        }
    }

    // ------------------------------------------------------------
    // Connections
    // ------------------------------------------------------------
    connection def ResponsibleForConnection {
        doc /* A role is responsible for a methodology behavior: it is its primary performer. */
        end part primaryPerformer : Role crosses methododologyBehavior.primaryPerformer {
            doc /* The responsible role. */
        }
        end action methododologyBehavior : MethodologyBehavior crosses primaryPerformer.responsibleForMethodologyBehaviors {
            doc /* The process or method the role is responsible for. */
        }
    }
    connection def ProductOwnershipConnection {
        doc /* A role owns a product: it is responsible for its content. */
        end part owner : Role crosses product.owner {
            doc /* The owning role. */
        }
        end item product : Product crosses owner.responsibleForProducts {
            doc /* The owned product. */
        }
    }
    connection def SupportsConnection {
        doc /* A role supports a methodology behavior: it is an additional performer. */
        end part additionalPerformer : Role crosses additionalMethodologyBehavior.additionalPerformers {
            doc /* The supporting role. */
        }
        end action additionalMethodologyBehavior : MethodologyBehavior crosses additionalPerformer.supportsMethodologyBehaviors {
            doc /* The supported process or method. */
        }
    }
    connection def FacilitatesConnection {
        doc /* A tool facilitates a methodology behavior. */
        end part facilitationTool : Tool crosses facilitatedMethodologyBehavior.facilitationTools {
            doc /* The facilitating tool. */
        }
        end action facilitatedMethodologyBehavior : MethodologyBehavior crosses facilitationTool.facilitatesMethodologyBehaviors {
            doc /* The facilitated process or method. */
        }
    }
    connection def AuthorativeToolConnection {
        doc /* A tool is the authoritative tool of a product: it holds the master data of the product. */
        end part authorativeTool : Tool crosses ownedProduct.authorativeTool {
            doc /* The authoritative tool. */
        }
        end item ownedProduct : Product crosses authorativeTool.ownedProducts {
            doc /* The product whose master data the tool holds. */
        }
    }
}
