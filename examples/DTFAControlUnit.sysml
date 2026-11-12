package DTFAExampleControlUnit {
    doc
    /* Example of a Digital Thread Flow Analysis (DTFA): the engineering of an embedded control unit.
     * The company MBSE environment defines the tool landscape, the methods and the tool policy.
     * The MBSE environment of the control unit team specializes it: the roles and products of the team, and the
     * methods as the team performs them today (who, with which tool, which products in and out).
     * The flow analysis of the team environment rates the transitions between the tools and plans measures.
     * The tool names are generic placeholders for the tools of a real tool landscape.
     */
    private import MBSEMethodology::*;
    private import DTFA::*;

    // ---- Company MBSE environment: tool landscape, methods and tool policy ----
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

        // Tool policy: rated facilitates connections
        connection modelingForArchitecture : ToolPolicyRule connect modelingTool to companyMethodology.sysmodArchitecture {
            :>> status = PolicyStatus::recommended;
        }
        connection modelingForInterfaces : ToolPolicyRule connect modelingTool to companyMethodology.interfaceDefinition {
            :>> status = PolicyStatus::recommended;
        }
        connection spreadsheetForInterfaces : ToolPolicyRule connect spreadsheet to companyMethodology.interfaceDefinition {
            doc /* Interface lists in spreadsheets drift from the architecture model. */
            :>> status = PolicyStatus::forbidden;
        }
        connection requirementsToolForRequirements : ToolPolicyRule connect requirementsTool to companyMethodology.textualRequirements {
            :>> status = PolicyStatus::recommended;
        }
        connection wordProcessorForRequirements : ToolPolicyRule connect wordProcessor to companyMethodology.textualRequirements {
            :>> status = PolicyStatus::allowed;
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

        // Products: the data of the digital thread
        item stakeholderNotes : Product;
        item requirementsSpecification : Product;
        item architectureModel : Product;
        item interfaceList : Product;
        item sourceCode : Product;
        item testSpecification : Product;

        // The methods as the team performs them today: the process steps (cells of the matrix)
        part :>> companyMethodology {
            action :>> stakeholderInterviews {
                :>> primaryPerformer = requirementsEngineer;
                :>> facilitationTools = wordProcessor;
                :>> outputs = stakeholderNotes;
            }
            action :>> textualRequirements {
                :>> primaryPerformer = requirementsEngineer;
                :>> facilitationTools = requirementsTool;
                :>> inputs = stakeholderNotes;
                :>> outputs = requirementsSpecification;
            }
            action :>> sysmodArchitecture {
                @stepDefinition : StepDefinition {
                    :>> goal = "Define a system architecture that satisfies the requirements";
                    :>> viewpoints = ("Requirements traced to architecture elements", "Functional architecture");
                    :>> automationSteps = "Architecture document generated from the model";
                }
                :>> primaryPerformer = systemArchitect;
                :>> facilitationTools = modelingTool;
                :>> inputs = requirementsSpecification;
                :>> outputs = architectureModel;
            }
            action :>> interfaceDefinition {
                @stepDefinition : StepDefinition {
                    :>> goal = "Define the signals between the software components";
                    :>> viewpoints = "Signal list per software component";
                }
                :>> primaryPerformer = systemArchitect;
                :>> facilitationTools = spreadsheet;
                :>> inputs = architectureModel;
                :>> outputs = interfaceList;
            }
            action :>> codeReview {
                :>> primaryPerformer = softwareDeveloper;
                :>> facilitationTools = ide;
                :>> inputs = (interfaceList, requirementsSpecification);
                :>> outputs = sourceCode;
            }
            action :>> requirementsBasedTesting {
                :>> primaryPerformer = testEngineer;
                :>> facilitationTools = testTool;
                :>> inputs = requirementsSpecification;
                :>> outputs = testSpecification;
            }
        }

        // ---- The Digital Thread Flow Analysis of the team environment ----
        analysis flowAnalysis : DigitalThreadFlowAnalysis :> analyses {
            doc /* Flow analysis of the system and software engineering of the control unit team. */

            // DTFA Step #2: rated tool transitions
            connection notesToRequirements : ToolTransition connect wordProcessor to requirementsTool {
                :>> rating = TransitionRating::efficient;
            }
            connection requirementsToModel : ToolTransition connect requirementsTool to modelingTool {
                :>> rating = TransitionRating::bottleneck;
                :>> priority = 1;
                :>> explanation = "The requirements are copied manually from the requirements tool into the model.";
                :>> conversions = "Requirements copied manually from the requirements tool into the model";
            }
            connection modelToSpreadsheet : ToolTransition connect modelingTool to spreadsheet {
                :>> rating = TransitionRating::bottleneck;
                :>> priority = 2;
                :>> explanation = "The ports are exported to a spreadsheet, which then drifts from the architecture model.";
                :>> conversions = "Ports exported from the model to the spreadsheet";
            }
            connection spreadsheetToCode : ToolTransition connect spreadsheet to ide {
                :>> rating = TransitionRating::bottleneck;
                :>> priority = 3;
                :>> conversions = "Signal list exported as CSV for code generation";
            }

            // DTFA Step #4: measures
            occurrence linkRequirements : Measure {
                doc /* Link the model elements to the requirements in the requirements tool instead of copying them. */
                :>> addressedTransitions = requirementsToModel;
            }
            occurrence modelInterfaces : Measure {
                doc /* Define the interfaces in the modeling tool; a view of the model offers the signal list. */
                :>> addressedTransitions = (modelToSpreadsheet, spreadsheetToCode);
            }
        }
    }
}
