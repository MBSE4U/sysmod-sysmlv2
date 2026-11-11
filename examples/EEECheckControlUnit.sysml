package EEEExampleControlUnit {
    doc
    /* Example of an EEE Check: the engineering of an embedded control unit.
     * The company MBSE environment defines the tool landscape and the methods; the tool policy rates them.
     * The MBSE environment of the control unit team specializes it with the roles and products of the team,
     * and the EEE check analyzes the team environment.
     * The tool names are generic placeholders for the tools of a real tool landscape.
     */
    private import MBSEMethodology::*;
    private import EEE::*;

    // ---- Company MBSE environment: tool landscape and methods ----
    occurrence def CompanyEnvironment :> MBSEEnvironment {
        doc /* The MBSE environment of the company, shared by the engineering teams. */

        // Tools: the columns of the Tools Roles Methods Matrix
        part wordProcessor :> tools { doc /* Office word processor. */ }
        part requirementsTool :> tools { doc /* Requirements management tool. */ }
        part modelingTool :> tools { doc /* SysML v2 modeling tool. */ }
        part spreadsheet :> tools { doc /* Office spreadsheet. */ }
        part ide :> tools { doc /* Software development environment. */ }
        part testTool :> tools { doc /* Test management tool. */ }

        part companyMethodology :>> methodology {
            // Methods of the company methodology
            action stakeholderInterviews : Method;
            action textualRequirements : Method;
            action sysmodArchitecture : Method { doc /* Architecture modeling with SYSMOD. */ }
            action interfaceDefinition : Method;
            action codeReview : Method;
            action requirementsBasedTesting : Method;
        }
    }

    // ---- MBSE environment of the control unit team ----
    occurrence def ControlUnitTeamEnvironment :> CompanyEnvironment {
        doc /* The MBSE environment of the control unit team. */

        // Roles: the rows of the Tools Roles Methods Matrix
        part requirementsEngineer : Role :> roles { doc /* Elicits and specifies the requirements. */ }
        part systemArchitect : Role :> roles { doc /* Defines the system architecture and the interfaces. */ }
        part softwareDeveloper : Role :> roles { doc /* Implements the software of the control unit. */ }
        part testEngineer : Role :> roles { doc /* Specifies and runs the system tests. */ }

        // Products: the artifacts of the process steps
        item stakeholderNotes : Product;
        item requirementsSpecification : Product;
        item architectureModel : Product;
        item interfaceList : Product;
        item sourceCode : Product;
        item testSpecification : Product;
    }

    #eeeCheck occurrence def ControlUnitEngineering {
        doc /* EEE Check of the system and software engineering of the control unit team. */

        occurrence env : ControlUnitTeamEnvironment :>> environment;

        // ---- Process steps: the cells of the Tools Roles Methods Matrix ----
        #processStep action elicitNeeds {
            :>> role = env.requirementsEngineer;
            :>> tool = env.wordProcessor;
            :>> method = env.companyMethodology.stakeholderInterviews;
            :>> targetArtifacts = env.stakeholderNotes;
        }
        #processStep action specifyRequirements {
            :>> role = env.requirementsEngineer;
            :>> tool = env.requirementsTool;
            :>> method = env.companyMethodology.textualRequirements;
            :>> sourceArtifacts = env.stakeholderNotes;
            :>> targetArtifacts = env.requirementsSpecification;
        }
        #processStep action modelArchitecture {
            :>> role = env.systemArchitect;
            :>> tool = env.modelingTool;
            :>> method = env.companyMethodology.sysmodArchitecture;
            :>> goal = "Define a system architecture that satisfies the requirements";
            :>> sourceArtifacts = env.requirementsSpecification;
            :>> viewpoints = ("Requirements traced to architecture elements", "Functional architecture");
            :>> automationSteps = "Architecture document generated from the model";
            :>> targetArtifacts = env.architectureModel;
            :>> artifactConversions = "Requirements copied manually from the requirements tool into the model";

            #measure occurrence linkRequirements {
                doc /* Link the model elements to the requirements in the requirements tool instead of copying them. */
                :>> addressedTransitions = specifyToModel;
            }
        }
        #processStep action defineInterfaces {
            :>> role = env.systemArchitect;
            :>> tool = env.spreadsheet;
            :>> method = env.companyMethodology.interfaceDefinition;
            :>> goal = "Define the signals between the software components";
            :>> sourceArtifacts = env.architectureModel;
            :>> viewpoints = "Signal list per software component";
            :>> targetArtifacts = env.interfaceList;
            :>> artifactConversions = ("Ports exported from the model to the spreadsheet", "Signal list exported as CSV for code generation");

            #measure occurrence modelInterfaces {
                doc /* Define the interfaces in the modeling tool; a view of the model offers the signal list. */
                :>> addressedTransitions = (modelToInterfaces, interfacesToCode);
            }
        }
        #processStep action implementSoftware {
            :>> role = env.softwareDeveloper;
            :>> tool = env.ide;
            :>> method = env.companyMethodology.codeReview;
            :>> sourceArtifacts = (env.interfaceList, env.requirementsSpecification);
            :>> targetArtifacts = env.sourceCode;
        }
        #processStep action specifyTests {
            :>> role = env.testEngineer;
            :>> tool = env.testTool;
            :>> method = env.companyMethodology.requirementsBasedTesting;
            :>> sourceArtifacts = env.requirementsSpecification;
            :>> targetArtifacts = env.testSpecification;
        }

        // ---- Transitions, evaluated in EEE Step #2 ----
        #stepTransition connection needsToRequirements connect elicitNeeds to specifyRequirements {
            :>> evaluation = TransitionEvaluation::efficient;
        }
        #stepTransition connection specifyToModel connect specifyRequirements to modelArchitecture {
            :>> evaluation = TransitionEvaluation::bottleneck;
            :>> priority = 1;
        }
        #stepTransition connection modelToInterfaces connect modelArchitecture to defineInterfaces {
            :>> evaluation = TransitionEvaluation::bottleneck;
            :>> priority = 2;
        }
        #stepTransition connection interfacesToCode connect defineInterfaces to implementSoftware {
            :>> evaluation = TransitionEvaluation::bottleneck;
            :>> priority = 3;
        }
        #stepTransition connection requirementsToTests connect specifyRequirements to specifyTests;
    }

    #toolPolicy occurrence def CompanyToolPolicy {
        doc /* Company tool policy, fed by the EEE checks of the engineering teams. */

        occurrence env : CompanyEnvironment :>> environment;

        #toolPolicyRule occurrence modelingForArchitecture {
            :>> tool = env.modelingTool;
            :>> method = env.companyMethodology.sysmodArchitecture;
            :>> status = PolicyStatus::recommended;
        }
        #toolPolicyRule occurrence modelingForInterfaces {
            :>> tool = env.modelingTool;
            :>> method = env.companyMethodology.interfaceDefinition;
            :>> status = PolicyStatus::recommended;
        }
        #toolPolicyRule occurrence spreadsheetForInterfaces {
            doc /* Interface lists in spreadsheets drift from the architecture model. */
            :>> tool = env.spreadsheet;
            :>> method = env.companyMethodology.interfaceDefinition;
            :>> status = PolicyStatus::forbidden;
        }
        #toolPolicyRule occurrence requirementsToolForRequirements {
            :>> tool = env.requirementsTool;
            :>> method = env.companyMethodology.textualRequirements;
            :>> status = PolicyStatus::recommended;
        }
        #toolPolicyRule occurrence wordProcessorForRequirements {
            :>> tool = env.wordProcessor;
            :>> method = env.companyMethodology.textualRequirements;
            :>> status = PolicyStatus::allowed;
        }
    }
}
