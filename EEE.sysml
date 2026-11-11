library package EEE {
    doc
    /* Definition of the EEE Modeling Library for the EEE Check (Engineering Efficiency Empowerment)
     *
     * The EEE Check by oose and Willert analyzes the engineering situation of an organization, finds its
     * bottlenecks and removes them by small, targeted changes instead of a transformation of processes,
     * methods and tools (https://eee-check.de/). This library makes the artifacts of the EEE method
     * modelable in SysML v2:
     *
     *   EEE Step #1  Analysis            EEE Tools Roles Methods Matrix: roles (rows) × tools (columns),
     *                                    process steps in the cells, transitions between the process steps
     *   EEE Step #2  Evaluation          each transition is efficient or a bottleneck; bottlenecks get a priority
     *   EEE Step #3  Bottleneck analysis EEE Process Step Definition Diagram: goal, source artifacts, viewpoints,
     *                                    automation steps, target artifacts and artifact conversions of a step
     *   EEE Step #4  Optimization        measures that optimize the process steps
     *   Company level                    EEE Company Tool Policy Matrix: recommended, allowed and forbidden
     *                                    tool/method combinations
     *
     * EEE extends the MBSE methodology concepts of the library package MBSEMethodology (MBSEMethodology.sysml).
     * The anchor point is the MBSE environment
     * (MBSEMethodology::MBSEEnvironment) with its tools, roles and methodology:
     * - An EEE check analyzes an MBSE environment. The roles of the environment (MBSEMethodology::Role) are the rows
     *   of the matrix, its tools (MBSEMethodology::Tool) the columns.
     * - A process step is a methodology behavior (MBSEMethodology::MethodologyBehavior) as it is performed today: its role
     *   is its primary performer, its tool one of its facilitation tools, and its source and target artifacts
     *   (MBSEMethodology::Product) are inputs and outputs. It applies a method (MBSEMethodology::Method), e.g., a method
     *   of the methodology of the environment.
     * - A tool policy rates the combinations of the tools and methods of an MBSE environment, typically the environment
     *   of the company that the environments of the teams specialize.
     *
     * Overview of the language elements:
     * - EeeCheck (#eeeCheck): the EEE analysis of an MBSE environment
     * - ProcessStep (#processStep): a step of the engineering process, performed by a role with a tool, applying a method,
     *   with its process step definition
     * - StepTransition (#stepTransition): the transition from one process step to the next one; a change of the tool is
     *   a method/tool break, a change of the role is a human interface
     * - TransitionEvaluation: unrated, efficient or bottleneck
     * - Measure (#measure): an optimization of a process step
     * - ToolPolicy (#toolPolicy), ToolPolicyRule (#toolPolicyRule), PolicyStatus: the company tool policy
     *
     * Version v5.1.9
     *
     * The EEE method was developed by Tim Weilkiens (oose) and Andreas Willert (Willert Software Tools).
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
    // EEE Check: anchored at an MBSE environment
    //
    occurrence def EeeCheck {
        doc
        /* An EEE Check is the analysis of an MBSE environment, typically done in a two-day workshop.
         * The roles and tools of the environment are the rows and columns of the EEE Tools Roles Methods Matrix.
         * The check owns the process steps as they are performed today and the transitions between them, as nested
         * elements with the keywords #processStep and #stepTransition.
         * Apply it with the keyword #eeeCheck, e.g.:
         *   #eeeCheck occurrence def TeamCheck {
         *       occurrence env : TeamEnvironment :>> environment;
         *       #processStep action modelArchitecture { :>> role = env.systemArchitect; :>> tool = env.modelingTool; }
         *   }
         */
        ref occurrence environment : MBSEEnvironment [1] {
            doc /* The analyzed MBSE environment. Redefine it with a usage of the environment, and refer to its roles,
                 * tools, methods and products through it, e.g., env.systemArchitect. */
        }
    }
    abstract occurrence eeeChecks : EeeCheck [*] {
        doc /* Base usage of all EEE checks. It is the base type of the keyword #eeeCheck. */
    }

    //
    // EEE Step #1: Tools Roles Methods Matrix
    //
    action def ProcessStep :> MethodologyBehavior {
        doc
        /* A Process Step of the engineering process as it is performed today in the MBSE environment.
         * A role performs it with a tool, applying a method: it is a cell entry of the EEE Tools Roles Methods Matrix.
         * As a methodology behavior, its role is its primary performer, its tool is a facilitation tool, and its source
         * and target artifacts are its inputs and outputs.
         * The features goal, sourceArtifacts, viewpoints, automationSteps, targetArtifacts and artifactConversions
         * are the swimlanes of the EEE Process Step Definition Diagram (EEE Step #3).
         * Apply it with the keyword #processStep.
         */
        ref part role : Role [0..1] :> primaryPerformer {
            doc /* The role that performs the process step: the row of the step in the matrix. */
        }
        ref part tool : Tool [0..1] :> facilitationTools {
            doc /* The tool that is used in the process step: the column of the step in the matrix. */
        }
        ref action method : Method [0..1] {
            doc /* The method that is applied in the process step. */
        }

        attribute goal : String [0..1] {
            doc /* The goal of the process step: why is it done? */
        }
        ref item sourceArtifacts : Product [*] :> inputs {
            doc /* The artifacts (data) that the process step needs. */
        }
        attribute viewpoints : String [*] {
            doc /* The viewpoints on the data that the process step needs. A viewpoint may limit the choice of the tool. */
        }
        attribute automationSteps : String [*] {
            doc /* The automated steps of the process step, e.g., an automatic import or export. */
        }
        ref item targetArtifacts : Product [*] :> outputs {
            doc /* The artifacts (data) that the process step produces. */
        }
        attribute artifactConversions : String [*] {
            doc /* The conversions of artifacts (data) that the process step needs, e.g., an import or an export. */
        }
        // The measures that optimize the process step (EEE Step #4) are nested occurrences with the keyword #measure.
    }
    abstract action processSteps : ProcessStep [*] {
        doc /* Base usage of all process steps. It is the base type of the keyword #processStep. */
    }

    //
    // EEE Step #2: Evaluation of the transitions
    //
    enum def TransitionEvaluation {
        doc /* The evaluation of a transition between process steps in EEE Step #2. */
        enum unrated { doc /* The transition is not evaluated yet. */ }
        enum efficient { doc /* The transition works efficiently. */ }
        enum bottleneck { doc /* The transition is a bottleneck: a loss of efficiency that EEE Steps #3 and #4 address. */ }
    }

    connection def StepTransition {
        doc
        /* A Step Transition connects a process step with the process step that follows it.
         * In the EEE Tools Roles Methods Matrix, a change of the column (tool) is a method/tool break,
         * and a change of the row (role) is a human interface. Both are potential losses of efficiency.
         * EEE Step #2 evaluates each transition as efficient or bottleneck and prioritizes the bottlenecks.
         * Apply it with the keyword #stepTransition, e.g.:
         *   #stepTransition connection specifyToModel connect specifyRequirements to modelArchitecture {
         *       :>> evaluation = TransitionEvaluation::bottleneck;
         *       :>> priority = 1;
         *   }
         */
        end action source : ProcessStep {
            doc /* The process step that hands over. */
        }
        end action target : ProcessStep {
            doc /* The process step that takes over. */
        }
        attribute evaluation : TransitionEvaluation default TransitionEvaluation::unrated {
            doc /* The evaluation of the transition (EEE Step #2). */
        }
        attribute priority : Positive [0..1] {
            doc /* The priority of a bottleneck: 1 is the highest priority. */
        }
        derived attribute isToolBreak : Boolean = source.tool != target.tool {
            doc /* The transition changes the tool: a method/tool break (column transition). */
        }
        derived attribute isHumanInterface : Boolean = source.role != target.role {
            doc /* The transition changes the role: a human interface (row transition). */
        }
    }
    abstract connection stepTransitions : StepTransition [*] {
        doc /* Base usage of all step transitions. It is the base type of the keyword #stepTransition. */
    }

    //
    // EEE Step #4: Optimization of the process steps
    //
    occurrence def Measure {
        doc
        /* A Measure optimizes a process step (EEE Step #4), e.g., another method that reaches the goal of the step
         * without a tool change, another tool that offers a needed viewpoint, an automatic import or export, or links
         * instead of an import and export. Describe it in its doc comment.
         * Apply it with the keyword #measure inside a process step.
         */
        ref addressedTransitions : StepTransition [*] {
            doc /* The bottleneck transitions that the measure addresses. */
        }
    }
    abstract occurrence measures : Measure [*] {
        doc /* Base usage of all measures. It is the base type of the keyword #measure. */
    }

    //
    // Company level: EEE Company Tool Policy Matrix
    //
    enum def PolicyStatus {
        doc /* The status of a tool/method combination in the company tool policy. */
        enum recommended { doc /* A proven combination that the company recommends. */ }
        enum allowed { doc /* An alternative that is allowed. */ }
        enum forbidden { doc /* A combination that has not proven practicable and is not allowed. */ }
    }

    occurrence def ToolPolicy {
        doc
        /* The Tool Policy of a company: the EEE Company Tool Policy Matrix of methods (rows) and tools (columns)
         * of an MBSE environment, typically the environment of the company that the environments of the teams specialize.
         * It recommends proven tool/method combinations, allows alternatives and forbids combinations
         * that have not proven practicable. It prevents an uncontrolled growth of tools and methods.
         * The results of EEE checks feed it. Its rules are nested occurrences with the keyword #toolPolicyRule.
         * Apply it with the keyword #toolPolicy.
         */
        ref occurrence environment : MBSEEnvironment [1] {
            doc /* The MBSE environment whose tools and methods the policy rates. Redefine it with a usage of the environment. */
        }
    }
    abstract occurrence toolPolicies : ToolPolicy [*] {
        doc /* Base usage of all tool policies. It is the base type of the keyword #toolPolicy. */
    }

    occurrence def ToolPolicyRule {
        doc
        /* A Tool Policy Rule rates the combination of a tool and a method: recommended, allowed or forbidden.
         * Apply it with the keyword #toolPolicyRule.
         */
        ref part tool : Tool [1] { doc /* The tool of the combination. */ }
        ref action method : Method [1] { doc /* The method of the combination. */ }
        attribute status : PolicyStatus { doc /* The status of the combination. */ }
    }
    abstract occurrence toolPolicyRules : ToolPolicyRule [*] {
        doc /* Base usage of all tool policy rules. It is the base type of the keyword #toolPolicyRule. */
    }

    //
    // Semantic Metadata for user-defined keywords
    //
    metadata def <eeeCheck> EeeCheckMetadata :> Metaobjects::SemanticMetadata {
        doc /* Keyword #eeeCheck: marks an occurrence (definition) as an EEE check. */
        :>> baseType = eeeChecks meta SysML::Type;
    }
    metadata def <processStep> ProcessStepMetadata :> Metaobjects::SemanticMetadata {
        doc /* Keyword #processStep: marks an action as a process step. */
        :>> baseType = processSteps meta SysML::Type;
    }
    metadata def <stepTransition> StepTransitionMetadata :> Metaobjects::SemanticMetadata {
        doc /* Keyword #stepTransition: marks a connection as a transition between process steps. */
        :>> baseType = stepTransitions meta SysML::Type;
    }
    metadata def <measure> MeasureMetadata :> Metaobjects::SemanticMetadata {
        doc /* Keyword #measure: marks an occurrence as a measure that optimizes a process step. */
        :>> baseType = measures meta SysML::Type;
    }
    metadata def <toolPolicy> ToolPolicyMetadata :> Metaobjects::SemanticMetadata {
        doc /* Keyword #toolPolicy: marks an occurrence (definition) as a company tool policy. */
        :>> baseType = toolPolicies meta SysML::Type;
    }
    metadata def <toolPolicyRule> ToolPolicyRuleMetadata :> Metaobjects::SemanticMetadata {
        doc /* Keyword #toolPolicyRule: marks an occurrence as a rule of a tool policy. */
        :>> baseType = toolPolicyRules meta SysML::Type;
    }
} // library package <EEE> EngineeringEfficiencyEmpowerment
