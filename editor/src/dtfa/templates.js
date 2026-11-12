// Templates for new documents and snippets for the Insert menu.

export function emptyPackage(packageName) {
    return `package ${packageName} {
    private import MBSEMethodology::*;
    private import DTFA::*;

}
`;
}

/** A package with an MBSE environment, its methods as process steps, a flow analysis and a tool policy rule. */
export function environmentDocument(packageName) {
    return `package ${packageName} {
    private import MBSEMethodology::*;
    private import DTFA::*;

    occurrence def ${packageName}Environment :> MBSEEnvironment {
        doc /* The MBSE environment: tools, roles, methodology and products. */

        // Tools: the columns of the Tools Roles Methods Matrix
        part requirementsTool :> tools;
        part modelingTool :> tools;

        // Roles: the rows of the Tools Roles Methods Matrix
        part requirementsEngineer : Role :> roles;
        part systemArchitect : Role :> roles;

        // Products: the data of the digital thread
        item requirementsSpecification : Product;
        item architectureModel : Product;

        // Methods: a method that a role performs with a tool is a process step (a cell of the matrix);
        // a product that one method produces and another one needs is handed over.
        part engineeringMethodology :>> methodology {
            action textualRequirements : Method {
                :>> primaryPerformer = requirementsEngineer;
                :>> facilitationTools = requirementsTool;
                :>> outputs = requirementsSpecification;
            }
            action architectureModeling : Method {
                :>> primaryPerformer = systemArchitect;
                :>> facilitationTools = modelingTool;
                :>> inputs = requirementsSpecification;
                :>> outputs = architectureModel;
            }
        }

        // Tool policy: rated facilitates connections
        connection modelingToolForArchitecture : ToolPolicyRule connect modelingTool to engineeringMethodology.architectureModeling {
            :>> status = PolicyStatus::recommended;
        }

        // Digital Thread Flow Analysis
        analysis flowAnalysis : DigitalThreadFlowAnalysis :> analyses {
            // DTFA Step #2: rate the transitions between the tools
            connection requirementsToModel : ToolTransition connect requirementsTool to modelingTool {
                :>> rating = TransitionRating::unrated;
            }
        }
    }
}
`;
}

export const SNIPPETS = [
    {
        label: "MBSE environment",
        text: `occurrence def MyEnvironment :> MBSEEnvironment {
    part myTool :> tools;
    part myRole : Role :> roles;
    item myProduct : Product;
    part myMethodology :>> methodology {
        action myMethod : Method {
            :>> primaryPerformer = myRole;
            :>> facilitationTools = myTool;
            :>> outputs = myProduct;
        }
    }
    analysis flowAnalysis : DigitalThreadFlowAnalysis :> analyses;
}`,
    },
    { label: "Role", text: "part myRole : Role :> roles;" },
    { label: "Tool", text: "part myTool :> tools;" },
    { label: "Method", text: "action myMethod : Method;" },
    { label: "Product", text: "item myProduct : Product;" },
    {
        label: "Process step (method as performed)",
        text: `action :>> myMethod {
    :>> primaryPerformer = myRole;
    :>> facilitationTools = myTool;
    :>> inputs = productA;
    :>> outputs = productB;
}`,
    },
    {
        label: "Step definition",
        text: `@stepDefinition : StepDefinition {
    :>> goal = "Why the step is done";
    :>> viewpoints = ("Viewpoint 1", "Viewpoint 2");
    :>> automationSteps = "Automatic import";
}`,
    },
    {
        label: "Flow analysis",
        text: `analysis flowAnalysis : DigitalThreadFlowAnalysis :> analyses {
    connection toolAToToolB : ToolTransition connect toolA to toolB {
        :>> rating = TransitionRating::unrated;
    }
}`,
    },
    {
        label: "Bottleneck tool transition",
        text: `connection toolAToToolB : ToolTransition connect toolA to toolB {
    :>> rating = TransitionRating::bottleneck;
    :>> priority = 1;
    :>> explanation = "Why the transition is a bottleneck";
    :>> conversions = "Manual copy";
}`,
    },
    {
        label: "Measure",
        text: `occurrence myMeasure : Measure {
    doc /* What changes, and why it removes the bottleneck. */
    :>> addressedTransitions = toolAToToolB;
}`,
    },
    {
        label: "Tool policy rule",
        text: `connection myRule : ToolPolicyRule connect myTool to myMethodology.myMethod {
    :>> status = PolicyStatus::recommended;
}`,
    },
];
