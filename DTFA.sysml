library package DTFA {
    doc
    /* Definition of the Digital Thread Flow Analysis (DTFA)
     *
     * The Digital Thread Flow Analysis brings back the flow in the digital thread of an engineering organization.
     * It analyzes how the data flows between the tools of an MBSE environment while the roles perform the methods of
     * the methodology, rates the transitions between the tools, finds the bottlenecks and removes them by small,
     * targeted measures instead of a transformation of processes, methods and tools.
     *
     *   DTFA Step #1  Flow mapping         Tools Roles Methods Matrix: roles (rows) x tools (columns), the methods in the
     *                                      cells, and the hand-overs of products from method to method
     *   DTFA Step #2  Rating               each tool transition is efficient or a bottleneck; bottlenecks get a priority
     *   DTFA Step #3  Bottleneck analysis  step definition of the methods at a bottleneck: goal, source products,
     *                                      viewpoints, automation steps, target products; conversions of a transition
     *   DTFA Step #4  Measures             measures that remove the bottlenecks
     *   Company level                      tool policy: recommended, allowed and forbidden tool/method combinations
     *
     * The DTFA extends the MBSE methodology concepts of the library package MBSEMethodology and reuses them wherever
     * possible:
     * - The analysis is an analysis case owned by the analyzed MBSE environment (MBSEEnvironment::analyses).
     * - A process step is a method (MBSEMethodology::Method) of the methodology of the environment: its role is its
     *   primary performer, its tool is its facilitation tool, its source and target products are its inputs and
     *   outputs. A product flows from one method to the next one if it is an output of the first and an input of the
     *   second: a hand-over in the digital thread.
     * - A hand-over between two tools is a tool transition. The DTFA rates it (ToolTransition).
     * - A tool policy rule is a facilitates connection (MBSEMethodology::FacilitatesConnection) with a status
     *   (ToolPolicyRule).
     * The DTFA adds only what MBSEMethodology does not cover: the analysis, the rated tool transitions, the measures,
     * the step definition metadata and the status of a tool policy rule.
     *
     * Example:
     *   occurrence def TeamEnvironment :> CompanyEnvironment {
     *       part :>> companyMethodology {
     *           action :>> architectureModeling {
     *               :>> primaryPerformer = systemArchitect;
     *               :>> facilitationTools = modelingTool;
     *               :>> inputs = requirementsSpecification;
     *           }
     *       }
     *       analysis flowAnalysis : DigitalThreadFlowAnalysis :> analyses {
     *           connection requirementsToModel : ToolTransition connect requirementsTool to modelingTool {
     *               :>> rating = TransitionRating::bottleneck;
     *               :>> priority = 1;
     *           }
     *       }
     *   }
     *
     * The method is based on the EEE Check by Tim Weilkiens (oose) and Andreas Willert (Willert Software Tools).
     *
     * Version v5.1.9
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
    private import ScalarValues::*;
    private import MBSEMethodology::*;

    //
    // The analysis
    //
    analysis def DigitalThreadFlowAnalysis {
        doc
        /* A Digital Thread Flow Analysis analyzes the flow of the digital thread in an MBSE environment.
         * Declare it as an analysis of the environment, e.g.,
         *   analysis flowAnalysis : DigitalThreadFlowAnalysis :> analyses { ... }
         * The roles and tools of the environment are the rows and columns of the Tools Roles Methods Matrix, the
         * methods of its methodology with a primary performer or a facilitation tool are the process steps.
         * The analysis owns the rated tool transitions and the measures.
         */
        subject environment : MBSEEnvironment {
            doc /* The analyzed MBSE environment: the environment that owns the analysis. */
        }
    }

    //
    // DTFA Step #2: Rating of the tool transitions
    //
    enum def TransitionRating {
        doc /* The rating of a tool transition in DTFA Step #2. */
        enum unrated { doc /* The transition is not rated yet. */ }
        enum efficient { doc /* The data flows efficiently. */ }
        enum bottleneck { doc /* The flow is interrupted or slowed down: a bottleneck that DTFA Steps #3 and #4 address. */ }
    }

    connection def ToolTransition {
        doc
        /* A Tool Transition is a hand-over of data in the digital thread from one tool to the next one: a product
         * that a method produces with the source tool is needed by a method that uses the target tool.
         * A transition from a tool to itself rates the hand-overs between roles that use the same tool.
         * DTFA Step #2 rates the transition as efficient or bottleneck and prioritizes the bottlenecks.
         */
        end part source : Tool {
            doc /* The tool that hands over. */
        }
        end part target : Tool {
            doc /* The tool that takes over. */
        }
        ref item products : Product [*] {
            doc /* The products that are handed over. No products: all products that flow between the two tools. */
        }
        attribute rating : TransitionRating default TransitionRating::unrated {
            doc /* The rating of the transition (DTFA Step #2). */
        }
        attribute priority : Positive [0..1] {
            doc /* The priority of a bottleneck: 1 is the highest priority. */
        }
        attribute explanation : String [0..1] {
            doc /* The explanation of the rating, e.g., why the transition is a bottleneck. */
        }
        attribute conversions : String [*] {
            doc /* The conversions of the data at the transition, e.g., an export, an import or a manual copy. */
        }
    }

    //
    // DTFA Step #3: Step definition of a method
    //
    metadata def StepDefinition {
        doc
        /* The step definition of a method as it is performed in the analyzed environment (DTFA Step #3).
         * The source and target products of the step are the inputs and outputs of the method. Apply it to the method,
         * e.g., @stepDefinition : StepDefinition { :>> goal = "..."; }
         */
        attribute goal : String [0..1] {
            doc /* The goal of the step: why is it done? */
        }
        attribute viewpoints : String [*] {
            doc /* The viewpoints on the data that the step needs. A viewpoint may limit the choice of the tool. */
        }
        attribute automationSteps : String [*] {
            doc /* The automated parts of the step, e.g., an automatic import or export. */
        }
    }

    //
    // DTFA Step #4: Measures
    //
    occurrence def Measure {
        doc
        /* A Measure removes bottlenecks (DTFA Step #4), e.g., another method that reaches the goal of a step without
         * a tool change, another tool that offers a needed viewpoint, an automatic import or export, or links
         * instead of an import and export. Describe it in its doc comment. Declare it in the analysis.
         */
        ref addressedTransitions : ToolTransition [*] {
            doc /* The bottleneck transitions that the measure addresses. */
        }
    }

    //
    // Company level: tool policy
    //
    enum def PolicyStatus {
        doc /* The status of a tool/method combination in the tool policy. */
        enum recommended { doc /* A proven combination that the company recommends. */ }
        enum allowed { doc /* An alternative that is allowed. */ }
        enum forbidden { doc /* A combination that has not proven practicable and is not allowed. */ }
    }

    connection def ToolPolicyRule :> FacilitatesConnection {
        doc
        /* A Tool Policy Rule rates a tool for a method: recommended, allowed or forbidden.
         * The rules of an MBSE environment, typically the environment of the company that the environments of the
         * teams specialize, are its tool policy. It prevents an uncontrolled growth of tools and methods; the results
         * of the flow analyses feed it. Declare a rule in the environment, e.g.,
         *   connection modelingForArchitecture : ToolPolicyRule connect modelingTool to companyMethodology.architectureModeling {
         *       :>> status = PolicyStatus::recommended;
         *   }
         */
        attribute status : PolicyStatus {
            doc /* The status of the combination. */
        }
    }
} // library package DTFA (Digital Thread Flow Analysis)
