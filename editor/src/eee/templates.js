// Templates for new documents and snippets for the Insert menu.

export function emptyPackage(packageName) {
    return `package ${packageName} {
    private import MBSEMethodology::*;
    private import EEE::*;

}
`;
}

/** A package with an MBSE environment, an EEE check of it and a tool policy. */
export function environmentDocument(packageName) {
    return `package ${packageName} {
    private import MBSEMethodology::*;
    private import EEE::*;

    occurrence def ${packageName}Environment :> MBSEEnvironment {
        doc /* The MBSE environment: tools, roles, methodology and products. */

        // Tools: the columns of the EEE Tools Roles Methods Matrix
        part requirementsTool :> tools;
        part modelingTool :> tools;

        // Roles: the rows of the EEE Tools Roles Methods Matrix
        part requirementsEngineer : Role :> roles;
        part systemArchitect : Role :> roles;

        part engineeringMethodology :>> methodology {
            action textualRequirements : Method;
            action architectureModeling : Method;
        }

        item requirementsSpecification : Product;
    }

    #eeeCheck occurrence def ${packageName}Check {
        doc /* EEE Check of the MBSE environment. */
        occurrence env : ${packageName}Environment :>> environment;

        // EEE Step #1: process steps (cells) and their transitions
        #processStep action specifyRequirements {
            :>> role = env.requirementsEngineer;
            :>> tool = env.requirementsTool;
            :>> method = env.engineeringMethodology.textualRequirements;
            :>> targetArtifacts = env.requirementsSpecification;
        }
        #processStep action modelArchitecture {
            :>> role = env.systemArchitect;
            :>> tool = env.modelingTool;
            :>> method = env.engineeringMethodology.architectureModeling;
            :>> sourceArtifacts = env.requirementsSpecification;
        }

        // EEE Step #2: evaluate each transition as efficient or bottleneck
        #stepTransition connection specifyToModel connect specifyRequirements to modelArchitecture {
            :>> evaluation = TransitionEvaluation::unrated;
        }
    }

    #toolPolicy occurrence def ${packageName}ToolPolicy {
        occurrence env : ${packageName}Environment :>> environment;

        #toolPolicyRule occurrence modelingToolForArchitecture {
            :>> tool = env.modelingTool;
            :>> method = env.engineeringMethodology.architectureModeling;
            :>> status = PolicyStatus::recommended;
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
    part myMethodology :>> methodology {
        action myMethod : Method;
    }
    item myProduct : Product;
}`,
    },
    { label: "Role", text: "part myRole : Role :> roles;" },
    { label: "Tool", text: "part myTool :> tools;" },
    { label: "Method", text: "action myMethod : Method;" },
    { label: "Product", text: "item myProduct : Product;" },
    {
        label: "EEE check",
        text: `#eeeCheck occurrence def MyEeeCheck {
    occurrence env : MyEnvironment :>> environment;
    #processStep action myStep {
        :>> role = env.myRole;
        :>> tool = env.myTool;
    }
}`,
    },
    {
        label: "Process step",
        text: `#processStep action myStep {
    :>> role = env.myRole;
    :>> tool = env.myTool;
    :>> method = env.myMethodology.myMethod;
}`,
    },
    {
        label: "Process step definition",
        text: `:>> goal = "Why the step is done";
:>> sourceArtifacts = (env.productA, env.productB);
:>> viewpoints = ("Viewpoint 1", "Viewpoint 2");
:>> automationSteps = "Automatic import";
:>> targetArtifacts = env.productC;
:>> artifactConversions = "Export of productC";`,
    },
    {
        label: "Transition",
        text: `#stepTransition connection stepAToStepB connect stepA to stepB {
    :>> evaluation = TransitionEvaluation::unrated;
}`,
    },
    {
        label: "Bottleneck transition",
        text: `#stepTransition connection stepAToStepB connect stepA to stepB {
    :>> evaluation = TransitionEvaluation::bottleneck;
    :>> priority = 1;
}`,
    },
    {
        label: "Measure",
        text: `#measure occurrence myMeasure {
    doc /* What changes, and why it removes the bottleneck. */
    :>> addressedTransitions = stepAToStepB;
}`,
    },
    {
        label: "Tool policy",
        text: `#toolPolicy occurrence def MyToolPolicy {
    occurrence env : MyEnvironment :>> environment;
    #toolPolicyRule occurrence myRule {
        :>> tool = env.myTool;
        :>> method = env.myMethodology.myMethod;
        :>> status = PolicyStatus::recommended;
    }
}`,
    },
    {
        label: "Tool policy rule",
        text: `#toolPolicyRule occurrence myRule {
    :>> tool = env.myTool;
    :>> method = env.myMethodology.myMethod;
    :>> status = PolicyStatus::allowed;
}`,
    },
];
