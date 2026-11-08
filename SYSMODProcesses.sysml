library package SYSMODProcesses {
    doc
    /* 
     * Definition of SYSMOD v5 Processes and Methods
     *
     * Version v5.1.8
     *
     * SYSMOD as an MBSE methodology based on the concepts of the library package MBSEMethodology (MBSEMethodology.sysml):
     * - SYSMOD is the methodology (MBSEMethodology::Methodology) with the roles projectManager and systemArchitect
     *   (ISO15288Processes::Stakeholders) and the process defaultProcess. The project manager is responsible for the
     *   process, and the system architect supports it.
     * - SYSMODEnvironment is the MBSE environment (MBSEMethodology::MBSEEnvironment) of a project that uses SYSMOD as its
     *   methodology and connects the roles of the environment to it.
     *
     * SYSMODDefaultProcess is the default SYSMOD workflow and is performed by every project as Project::defaultProcess.
     * It consists of one action definition per SYSMOD step (MBSEMethodology::Method). Each step reads artifacts of the
     * project and produces the project artifacts it is responsible for (flows to and bindings with the project features).
     * The input parameters of the process, e.g., the project description and the architecture descriptions, are the
     * information a human or an AI assistant provides; they are bound to the inputs of the steps.
     * The successions define the default order; all steps after SetupProject are optional ([0..1]), for example,
     * ModelBrownfieldSystem in a greenfield project or the functional and logical architectures.
     * The metadata StepStatus records the status and progress of each step.
     *
     * Each step refines one or more ISO/IEC/IEEE 15288 processes from the library package ISO15288Processes
     * (ISO15288Processes.sysml; #refinement dependencies at the end of this package).
     * A project can tailor the process by redefining Project::defaultProcess with a specialization of SYSMODDefaultProcess.
     *
     * Step names follow the pattern verb + product. The verb states how formal the content of the step's output is,
     * from informal to fully formal:
     *
     * | Level | Verb     | Result                                                                                         | Test question                                                              | Steps |
     * |-------|----------|------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|-------|
     * | 1     | describe | Text in natural language without a prescribed structure, e.g., an elevator pitch               | Is a paragraph of prose enough?                                            | DescribeProblemStatement, DescribeSystemIdea |
     * | 2     | identify | Named elements with a short text, optionally traced or classified                              | Is it about what exists, not how it is structured?                         | IdentifyStakeholders, IdentifyStakeholderNeeds, identifyUseCases |
     * | 3     | define   | Elements with fixed attributes and clear boundaries                                            | Must ambiguity be ruled out, without needing structure yet?                | (none yet) |
     * | 4     | model    | Structure: contexts, parts, connections, allocations, and refinements                          | Does the result connect to other model elements as structure?              | ModelBrownfieldSystem, modelSpecificationContext, ModelSolutionArchitecture, modelFunctionalArchitecture, modelLogicalArchitecture, modelProductArchitecture, ModelSubProjects |
     * | 5     | specify  | Verifiable or executable content: measurable requirements, constraints, and verification cases | Can a tool or test evaluate the result?                                    | SpecifySystem, specifySystemRequirements, specifyVerificationCases, SpecifyVerificationContext, SpecifyTradeStudy |
     *
     * SetupProject, IntegrateSubProjects, and PerformVerification are outside the scale: SetupProject organizes the project rather
     * than producing a product, IntegrateSubProjects combines the products of the sub-projects into the architecture of the parent
     * project, and PerformVerification executes the specified verification cases and reports their results.
     * A step that contains nested steps takes the verb of its most formal nested step.
     * Verbs outside this scale name activities, not step outputs: set up (project organization), integrate (combine the products of sub-projects), perform (execute specified
     * content, e.g., the verification cases), elicit (gather information from stakeholders), elaborate (refine an existing
     * output without changing its level), derive, analyze, verify, and validate.
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
    private import ModelingMetadata::refinement;

    occurrence def SYSMODEnvironment :> MBSEMethodology::MBSEEnvironment {
        part projectManager : ISO15288Processes::Stakeholders::ProjectManager :> roles;
        part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> roles;
        part sysmod : SYSMODMethodology :>> methodology {
            part :>> projectManager :> SYSMODEnvironment::projectManager;
            part :>> systemArchitect :> SYSMODEnvironment::systemArchitect;
        }

        connection :> roleConnection connect projectManager to sysmod;
        connection :> roleConnection connect systemArchitect to sysmod;
    }

    part def SYSMODMethodology :> MBSEMethodology::Methodology {
        part projectManager : ISO15288Processes::Stakeholders::ProjectManager :> roles;
        part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> roles;
        connection :> responsibleFor connect projectManager to defaultProcess;
        connection :> supports connect systemArchitect to defaultProcess;
        action defaultProcess : SYSMODDefaultProcess :> processes {
            ref part :>> projectManager :> SYSMODMethodology::projectManager;
            ref part :>> systemArchitect :> SYSMODMethodology::systemArchitect;
        }
    }

    action def SYSMODDefaultProcess :> MBSEMethodology::Process {
        doc
        /*
            * The default SYSMOD process: setupProject, modelBrownfieldSystem, describeProblemStatement, identifyStakeholders,
            * identifyStakeholderNeeds, describeSystemIdea, specifySystem, modelSolutionArchitecture (with the nested steps
            * modelFunctionalArchitecture, modelLogicalArchitecture, and modelProductArchitecture), modelSubProjects, integrateSubProjects,
            * specifyVerificationContext, and performVerification, in this order. Between modelSubProjects and integrateSubProjects, each
            * sub-project performs its own process. specifyTradeStudy has no succession: it is performed for any architecture decision
            * with alternatives.
            * Verification is split into two parts: specifySystem specifies the verification cases against the black box specification system
            * (nested step specifyVerificationCases) before any solution architecture is modeled and returns the verification context with them,
            * and specifyVerificationContext completes the verification context with the test systems and the system of interest, which can be
            * any system, e.g., the product system, a prototype, or a simulation model. Verification engineers thus take part from the specification on.
            * The project that performs the process is referenced by project. The project manager is the primary performer,
            * and the system architect is an additional performer. Outputs of the steps flow into the corresponding project features,
            * and the inputs of the steps are bound to the project features created by earlier steps.
            * The input parameters are the information a human or an AI assistant provides to start the process, e.g., the descriptions of
            * the architectures; they flow into the inputs of the steps. */
        ref occurrence project :>> this : Project;

        ref part projectManager : ISO15288Processes::Stakeholders::ProjectManager :>> primaryPerformer;
        ref part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> additionalPerformers;

        in item projectDescription : ProjectDescription :> inputs {
            doc
            /* The project description is a brief overview of the project. */
        }
        in item brownfieldArchitectureDescription : ArchitectureDescription :> inputs{
            doc
            /* The brownfield architecture is a description of the existing system. */
        }
        in item problemStatementDescription : ProblemStatementDescription :> inputs {
            doc
            /* The problem statement description is a brief description of the problem the system of interest is intended to solve. */
        }
        in item systemIdeaArchitectureDescription : ArchitectureDescription :> inputs {
            doc
            /* The system idea architecture is a description of the proposed system. */
        }
        in item functionalArchitectureDescription : ArchitectureDescription :> inputs {
            doc
            /* The functional architecture is a description of the functions and functional blocks of the solution system. */
        }
        in item logicalArchitectureDescription : ArchitectureDescription :> inputs {
            doc
            /* The logical architecture is a description of the technology-independent building blocks of the solution system. */
        }
        in item productArchitectureDescription : ArchitectureDescription :> inputs {
            doc
            /* The product architecture is a description of the concrete, physical or deployable building blocks of the solution system. */
        }
        out part brownfieldContext : SystemContext :> outputs {
            doc
            /* The brownfield context is a description of the context of the existing system. */
        }
        out part brownfieldContextImpl : SystemContext :> outputs {
            doc
            /* The brownfield context implementation is a description of the implementation of the context of the existing system. */
        }

        first start then setupProject;
        first [0..1]setupProject then [0..1]modelBrownfieldSystem;
        first [0..1]modelBrownfieldSystem then [0..1]describeProblemStatement;
        first [0..1]describeProblemStatement then [0..1]identifyStakeholders;
        first [0..1]identifyStakeholders then [0..1]identifyStakeholderNeeds;
        first [0..1]identifyStakeholderNeeds then [0..1]describeSystemIdea;
        first [0..1]describeSystemIdea then [0..1]specifySystem;
        first [0..1]specifySystem then [0..1]modelSolutionArchitecture;
        first [0..1]modelSolutionArchitecture then [0..1]modelSubProjects;
        first [0..1]modelSubProjects then [0..1]integrateSubProjects;
        first [0..1]integrateSubProjects then [0..1]specifyVerificationContext;
        first [0..1]specifyVerificationContext then [0..1]performVerification;
        first [0..1]performVerification then done;

        // Flows for information coming from the outside or created by steps for project features
        flow from modelBrownfieldSystem.brownfieldContext to project.brownfieldContext;
        flow from modelBrownfieldSystem.brownfieldContextImpl to project.brownfieldContextImpl;
        flow from describeProblemStatement.problemStatement to project.problemStatement;
        flow from identifyStakeholders.projectStakeholders to project.projectStakeholders;
        flow from identifyStakeholderNeeds.stakeholderNeeds to project.stakeholderNeeds;
        flow from describeSystemIdea.systemIdeaContext to project.systemIdeaContext;
        flow from describeSystemIdea.systemIdeaContextImpl to project.systemIdeaContextImpl;
        flow from describeSystemIdea.systemObjectives to project.systemObjectives;
        flow from specifySystem.specificationContext to project.specificationContext;
        flow from specifySystem.specificationContextImpl to project.specificationContextImpl;
        flow from specifySystem.systemRequirementSpecification to project.systemRequirementSpecification;
        flow from specifySystem.verificationContext to project.verificationContext;
        flow from modelSolutionArchitecture.functionalContext to project.functionalContext;
        flow from modelSolutionArchitecture.functionalContextImpl to project.functionalContextImpl;
        flow from modelSolutionArchitecture.logicalContext to project.logicalContext;
        flow from modelSolutionArchitecture.logicalContextImpl to project.logicalContextImpl;
        flow from modelSolutionArchitecture.functional2logical to project.functional2logical;
        flow from modelSolutionArchitecture.functionalImpl2logicalImpl to project.functionalImpl2logicalImpl;
        flow from modelSolutionArchitecture.productContext to project.productContext;
        flow from modelSolutionArchitecture.productContextImpl to project.productContextImpl;
        flow from modelSolutionArchitecture.logical2product to project.logical2product;
        flow from modelSolutionArchitecture.logicalImpl2productImpl to project.logicalImpl2productImpl;
        flow from modelSubProjects.subProjects to project.subProjects;
        flow from modelSubProjects.requirementFlowDowns to project.requirementFlowDowns;
        flow from integrateSubProjects.productContextImpl to project.productContextImpl;
        flow from specifyVerificationContext.verificationContext to project.verificationContext;
        flow from specifyTradeStudy.tradeStudies to project.tradeStudies;
        flow from performVerification.verificationReports to project.verificationContext.verificationReports;        

        // Bindings to process parameters and project features: inputs to process steps which are already available in the project
        bind setupProject.projectDescription = projectDescription;
        bind project.projectOwner = describeProblemStatement.projectOwner;
        bind describeProblemStatement.problemStatementDescription = problemStatementDescription;
        bind modelBrownfieldSystem.brownfieldArchitectureDescription = brownfieldArchitectureDescription;
        bind project.brownfieldContextImpl = describeProblemStatement.brownfieldContextImpl;
        bind project.problemStatement = identifyStakeholders.problemStatement;
        bind project.problemStatement = identifyStakeholderNeeds.problemStatement;
        bind project.projectStakeholders = identifyStakeholderNeeds.projectStakeholders;
        bind project.problemStatement = describeSystemIdea.problemStatement;
        bind project.stakeholderNeeds = describeSystemIdea.stakeholderNeeds;
        bind project.systemIdeaContextImpl = specifySystem.systemIdeaContextImpl;
        bind project.stakeholderNeeds = specifySystem.stakeholderNeeds;
        bind project.systemObjectives = specifySystem.systemObjectives;
        bind describeSystemIdea.systemIdeaArchitectureDescription = systemIdeaArchitectureDescription;            
        bind modelSolutionArchitecture.functionalArchitectureDescription = functionalArchitectureDescription;
        bind modelSolutionArchitecture.logicalArchitectureDescription = logicalArchitectureDescription;
        bind modelSolutionArchitecture.productArchitectureDescription = productArchitectureDescription;
        bind project.specificationContext = modelSolutionArchitecture.specificationContext;
        bind project.specificationContextImpl = modelSolutionArchitecture.specificationContextImpl;
        bind project.systemRequirementSpecification = modelSolutionArchitecture.systemRequirementSpecification;    
        bind project.productContextImpl = modelSubProjects.productContextImpl;
        bind project.systemRequirementSpecification = modelSubProjects.systemRequirementSpecification;
        bind project.subProjects = integrateSubProjects.subProjects;
        bind project.productContextImpl = integrateSubProjects.productContextImpl;
        bind project.systemObjectives = specifyTradeStudy.systemObjectives;
        bind project.systemRequirementSpecification = specifyTradeStudy.systemRequirementSpecification;
        bind project.systemRequirementSpecification = specifyVerificationContext.systemRequirementSpecification;
        bind project.verificationContext = specifyVerificationContext.verificationContext;
        bind project.verificationContext = performVerification.verificationContext;

        connection :> responsibleFor connect projectManager to setupProject;
        action setupProject : SetupProject :> submethods { @StepStatus; }
        connection :> responsibleFor connect systemArchitect to modelBrownfieldSystem;
        action modelBrownfieldSystem : ModelBrownfieldSystem :> submethods { @StepStatus; }
        action describeProblemStatement : DescribeProblemStatement :> submethods { @StepStatus; }
        action identifyStakeholders : IdentifyStakeholders :> submethods { @StepStatus; }
        action identifyStakeholderNeeds : IdentifyStakeholderNeeds :> submethods { @StepStatus; }
        action describeSystemIdea : DescribeSystemIdea :> submethods { @StepStatus; }
        action specifySystem : SpecifySystem :> submethods { @StepStatus; } 
        action modelSolutionArchitecture : ModelSolutionArchitecture :> submethods { @StepStatus; }
        connection :> responsibleFor connect systemArchitect to modelSubProjects;
        action modelSubProjects : ModelSubProjects :> submethods { @StepStatus; }
        connection :> responsibleFor connect systemArchitect to integrateSubProjects;
        action integrateSubProjects : IntegrateSubProjects :> submethods { @StepStatus; }
        action specifyVerificationContext : SpecifyVerificationContext :> submethods { @StepStatus; }
        action performVerification : PerformVerification :> submethods { @StepStatus; }

        // No succession: performed for any architecture decision with alternatives.
        connection :> responsibleFor connect systemArchitect to specifyTradeStudy;
        action specifyTradeStudy : SpecifyTradeStudy [0..*] :> submethods { @StepStatus; }
    }

    action def SetupProject :> MBSEMethodology::Method {
        doc
        /* Sets up a new SYSMOD project: assigns the name of the project owner and the purpose of the project. Refines the ISO 15288 Project Planning process. */
        ref occurrence project :>> this : Project;

        ref part primaryPerformer :>> primaryPerformer;

        in item projectDescription : ProjectDescription :> inputs {
            doc
            /* The project description contains the basic information about the project, including the project owner and the project purpose. */
        }

        assign project.projectOwner.name := projectDescription.projectOwnerName;
        assign project.purpose := projectDescription.projectPurpose;
        assign project.scope := projectDescription.projectScope;
    }

    action def ModelBrownfieldSystem :> MBSEMethodology::Method {
        doc
        /* Models the existing (brownfield) system and its actors as black box context (brownfieldContext) and white box context (brownfieldContextImpl), based on a given description of the existing architecture. Optional for greenfield projects. Refines the ISO 15288 Business or Mission Analysis process. */
        in item brownfieldArchitectureDescription : ArchitectureDescription :> inputs;
        out part brownfieldContext : SystemContext :> outputs;
        out part brownfieldContextImpl : SystemContext :> outputs;
    }

    action def DescribeProblemStatement {
        doc
        /* Describes the problem statement: a solution-free elevator pitch of the problem, with the brownfield system as subject and the project owner as stakeholder. Refines the ISO 15288 Business or Mission Analysis process. */
        in part projectOwner : ExtendedStakeholder;
        in item problemStatementDescription : ProblemStatementDescription {
            doc
            /* The problem statement is a brief description of the problem the system of interest is intended to solve. */
        }
        in part brownfieldContextImpl : SystemContext;
        out concern problemStatement : ExtendedConcern;
    }

    action def IdentifyStakeholders {
        doc
        /* Identifies the stakeholders of the project based on the problem statement and assesses their risk, effort, and categories. Refines the ISO 15288 Business or Mission Analysis process (identification of the major stakeholders) and the Stakeholder Needs and Requirements Definition process. */
        in concern problemStatement : ExtendedConcern;
        out part projectStakeholders[*] : ExtendedStakeholder {
            doc /* The stakeholders of the project are individuals and organizations that have an interest in the system. The list includes the project owner retrieved from the problemStatement.*/
        }
    }

    action def IdentifyStakeholderNeeds {
        doc
        /* Identifies the needs of the stakeholders at intent level, framed by the problem statement and traced to the stakeholders they come from. Refines the ISO 15288 Stakeholder Needs and Requirements Definition process. */
        in concern problemStatement : ExtendedConcern;
        in part projectStakeholders[1..*] : ExtendedStakeholder;
        out concern stakeholderNeeds : ExtendedConcern;
    }

    action def DescribeSystemIdea {
        doc
        /* Describes the system idea: a conceptual, elevator-pitch-style outline of the new or changed system that answers the problem statement and the stakeholder needs, as black box (systemIdeaContext) and white box (systemIdeaContextImpl) context, and its measurable goals, the system objectives. Refines the ISO 15288 Business or Mission Analysis process. */
        in item systemIdeaArchitectureDescription : ArchitectureDescription;
        in concern problemStatement : ExtendedConcern;
        in concern stakeholderNeeds : ExtendedConcern;
        out part systemIdeaContext : SystemContext;
        out part systemIdeaContextImpl : SystemContext;
        out concern systemObjectives : ExtendedConcern;
    }

    action def SpecifySystem {
        doc
        /* Specifies the system based on the system idea, the system objectives, and the stakeholder needs: the specification contexts, the system use cases, the system requirements, and the verification cases that verify them against the black box specification system. Refines the ISO 15288 System Requirements Definition process and the preparation of the ISO 15288 Verification process. */
        in part systemIdeaContextImpl : SystemContext;
        in concern stakeholderNeeds : ExtendedConcern;
        in concern systemObjectives : ExtendedConcern;
        out part specificationContext : SystemContext;
        out part specificationContextImpl : SystemContext;
        out requirement systemRequirementSpecification : ExtendedRequirement;
        out part verificationContext : SystemContext;

        action modelSpecificationContext {
            doc
            /* Models the black box and white box specification contexts by refining the system idea contexts: the actors at the system boundary in the black box context, and the subparts or attributes of the system used by use cases and requirements in the white box context. */
            in part systemIdeaContextImpl : SystemContext = SpecifySystem::systemIdeaContextImpl;
            out part specificationContext : SystemContext = SpecifySystem::specificationContext;
            out part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
        }
        action identifyUseCases {
            doc
            /* Identifies the system use cases of the specification context that describe how the actors interact with the system. */
            in part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
            in concern stakeholderNeeds : ExtendedConcern = SpecifySystem::stakeholderNeeds;
            out use case systemUseCases[*] : SystemUseCase = SpecifySystem::specificationContext.useCases;
        }
        action specifySystemRequirements {
            doc
            /* Specifies the verifiable, solution-neutral system requirements that frame the stakeholder needs. */
            in part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
            in concern stakeholderNeeds : ExtendedConcern = SpecifySystem::stakeholderNeeds;
            in concern systemObjectives : ExtendedConcern = SpecifySystem::systemObjectives;
            out requirement systemRequirementSpecification : ExtendedRequirement = SpecifySystem::systemRequirementSpecification;
        }
        action specifyVerificationCases {
            doc
            /* Specifies the verification cases of the system requirements against the black box specification system, alongside specifySystemRequirements and before any solution architecture exists: a verification case definition per verification case with the objective (verify) and the verdict (e.g., VerificationCases::PassIf), and a verification case usage in the verification context of the project, typed by the definition and subsetting verificationCases. The step returns the updated verification context. The VerificationEngineer is a stakeholder of this step and specifies the verification cases together with the RequirementsEngineer (concern VerificationCoverage), so that both discuss the verification in SysML rather than in a separate test language. The test systems and the system of interest of the verification context follow in SpecifyVerificationContext. */
            in part specificationContext : SystemContext = SpecifySystem::specificationContext;
            in requirement systemRequirementSpecification : ExtendedRequirement = SpecifySystem::systemRequirementSpecification;
            out part verificationContext : SystemContext = SpecifySystem::verificationContext;
        }
    }

    action def ModelSolutionArchitecture {
        doc
        /* Models the solution architecture based on the specification contexts and the system requirements, in the nested steps modelFunctionalArchitecture (optional), modelLogicalArchitecture (optional), and modelProductArchitecture (optional), in this order. Each nested step creates the black box and the white box context of its architecture; the logical and product steps also create the allocations from the preceding architecture. Refines the ISO 15288 System Architecture Definition process. */
        in requirement systemRequirementSpecification : ExtendedRequirement;
        in part specificationContextImpl : SystemContext;                
        in part specificationContext[0..1] : SystemContext;                
        in item functionalArchitectureDescription[0..1] : ArchitectureDescription;
        in item logicalArchitectureDescription[0..1] : ArchitectureDescription;
        in item productArchitectureDescription[0..1] : ArchitectureDescription;

        out part functionalContext[0..1] : SystemContext;
        out part functionalContextImpl[0..1] : SystemContext;
        out part logicalContext[0..1] : SystemContext;
        out part logicalContextImpl[0..1] : SystemContext;
        out abstract allocation functional2logical[0..1];
        out abstract allocation functionalImpl2logicalImpl[0..1];
        out part productContext[0..1] : SystemContext;
        out part productContextImpl[0..1] : SystemContext;
        out abstract allocation logical2product[0..1];
        out abstract allocation logicalImpl2productImpl[0..1];

        action modelFunctionalArchitecture {
            @StepStatus;
            doc
            /* Models the optional functional architecture based on the black box specification context: the black box functional context and the white box functional context with the functional blocks, and the #refinement dependencies from the functional elements to the system requirements they refine. Refines the ISO 15288 System Architecture Definition process. */
            in item functionalArchitectureDescription : ArchitectureDescription = ModelSolutionArchitecture::functionalArchitectureDescription;
            in requirement systemRequirementSpecification : ExtendedRequirement = ModelSolutionArchitecture::systemRequirementSpecification;
            in part specificationContext : SystemContext = ModelSolutionArchitecture::specificationContext;
            out part functionalContext : SystemContext = ModelSolutionArchitecture::functionalContext;
            out part functionalContextImpl : SystemContext = ModelSolutionArchitecture::functionalContextImpl;
        }

        first [0..1]modelFunctionalArchitecture then [0..1]modelLogicalArchitecture;
        flow from modelFunctionalArchitecture.functionalContext to modelLogicalArchitecture.functionalContext;
        flow from modelFunctionalArchitecture.functionalContextImpl to modelLogicalArchitecture.functionalContextImpl;
        flow from modelFunctionalArchitecture.functionalContextImpl to modelProductArchitecture.functionalContextImpl;

        action modelLogicalArchitecture {
            @StepStatus;
            doc
            /* Models the optional logical architecture based on the white box specification context and, if present, the white box functional context: the black box logical context and the white box logical context with the technology-independent building blocks, the #refinement dependencies from the logical elements to the system requirements they refine, and, if a functional architecture is present, the allocations functional2logical and functionalImpl2logicalImpl from the functional to the logical architecture. Refines the ISO 15288 System Architecture Definition process. */
            in item logicalArchitectureDescription : ArchitectureDescription = ModelSolutionArchitecture::logicalArchitectureDescription;
            in part specificationContextImpl : SystemContext = ModelSolutionArchitecture::specificationContextImpl;
            in requirement systemRequirementSpecification : ExtendedRequirement = ModelSolutionArchitecture::systemRequirementSpecification;
            in part functionalContext[0..1] : SystemContext;
            in part functionalContextImpl[0..1] : SystemContext;
            out part logicalContext : SystemContext = ModelSolutionArchitecture::logicalContext;
            out part logicalContextImpl : SystemContext = ModelSolutionArchitecture::logicalContextImpl;
            out abstract allocation functional2logical[0..1];
            out abstract allocation functionalImpl2logicalImpl[0..1];
        }
        bind functional2logical = modelLogicalArchitecture.functional2logical;
        bind functionalImpl2logicalImpl = modelLogicalArchitecture.functionalImpl2logicalImpl;

        first [0..1]modelLogicalArchitecture then [0..1]modelProductArchitecture;
        flow from modelLogicalArchitecture.logicalContext to modelProductArchitecture.logicalContext;
        flow from modelLogicalArchitecture.logicalContextImpl to modelProductArchitecture.logicalContextImpl;

        action modelProductArchitecture {
            @StepStatus;
            doc
            /* Models the optional product architecture based on the white box specification context and, if present, the white box functional and logical contexts: the black box product context and the white box product context with the concrete, physical or deployable building blocks, and, if a logical architecture is present, the allocations logical2product and logicalImpl2productImpl from the logical to the product architecture. Refines the ISO 15288 System Architecture Definition process. */
            in item productArchitectureDescription : ArchitectureDescription = ModelSolutionArchitecture::productArchitectureDescription;
            in part specificationContextImpl : SystemContext = ModelSolutionArchitecture::specificationContextImpl;
            in requirement systemRequirementSpecification : ExtendedRequirement = ModelSolutionArchitecture::systemRequirementSpecification;
            in part functionalContextImpl[0..1] : SystemContext;
            in part logicalContext[0..1] : SystemContext;
            in part logicalContextImpl[0..1] : SystemContext;
            out part productContext : SystemContext = ModelSolutionArchitecture::productContext;
            out part productContextImpl : SystemContext = ModelSolutionArchitecture::productContextImpl;
            out abstract allocation logical2product[0..1];
            out abstract allocation logicalImpl2productImpl[0..1];
        }
        bind logical2product = modelProductArchitecture.logical2product;
        bind logicalImpl2productImpl = modelProductArchitecture.logicalImpl2productImpl;
    }

    action def ModelSubProjects :> MBSEMethodology::Method {
        doc
        /* Models a sub-project for each building block of the white box product context that is developed separately, e.g., by another team or a supplier, and the sub-project contract: the sub-project usage subsets subProjects; a separate handover package carries the contract: the handover context (the building block as the system of interest, its external entities that are handed over as actors, and its connections and delegations as the actor/system interfaces), whose system of interest definition types the building block, whose other elements the parent white box specializes, and which the sub-project uses as its black box brownfield context, so that the sub-project, e.g., a supplier, needs no access to the parent project; the handover package also contains the stakeholders and the handover requirements of the sub-project, which the parent derives from its requirements that constrain the building block via its requirementFlowDowns; the sub-project derives its system requirements from the handover requirements. Optional; each sub-project then performs its own process. Refines the ISO 15288 System Architecture Definition process. */
        in part productContextImpl : SystemContext :> inputs;
        // Only parameters that can also be a Product (an item) subset inputs or outputs. Requirements, concerns, and analyses
        // cannot: they are performances, and Performance is disjoint from Object. Connections cannot either: a connection
        // usage may only be typed by connection definitions.
        in requirement systemRequirementSpecification : ExtendedRequirement;
        out occurrence subProjects [1..*] : Project :> outputs;
        out abstract connection requirementFlowDowns [*] : DerivationConnections::Derivation;
    }

    action def IntegrateSubProjects :> MBSEMethodology::Method {
        doc
        /* Integrates the products of the sub-projects into the white box product context: the parent project binds each building block in its productContextImpl to the white box product system of the sub-project that developed it; if a sub-project delivers only a black box, e.g., a supplier, the building block keeps the type of the handover context. The integrated product system can be the system of interest of the verification context. Optional; performed when the product architectures of the sub-projects are available. Refines the ISO 15288 Integration process. */
        in occurrence subProjects [1..*] : Project :> inputs;
        inout part productContextImpl : SystemContext :> inputs, outputs;
    }

    action def SpecifyVerificationContext {
        doc
        /* Specifies the verification context returned by SpecifySystem: adds the test systems, e.g., test benches or a wind tunnel, as additional actors, and the system of interest, which can be any system, e.g., the product system, a prototype, or a simulation model. Refines the ISO 15288 Verification and Validation processes. */
        in requirement systemRequirementSpecification : ExtendedRequirement;
        inout part verificationContext : SystemContext;
    }

    action def PerformVerification {
        doc
        /* Performs the verification: executes the verification cases of the verification context on its system of interest and documents the results in verification reports (VerificationReport, content aligned with ISO/IEC/IEEE 15289), which become part of the verification context. Refines the ISO 15288 Verification process. */
        in part verificationContext : SystemContext;
        out item verificationReports[*] : VerificationReport;
    }

    action def SpecifyTradeStudy :> MBSEMethodology::Method {
        doc
        /* Specifies a SYSMOD trade study for an architecture decision, e.g., between candidate system ideas or candidate product architectures: models the alternatives as variants of the respective context of the project, which becomes a variation usage (e.g., productContextImpl), assesses each alternative against the system objectives (criteria weighted by their priority), selects the alternative with the maximum evaluation, and records the decision on the selected variant with Rationale metadata whose explanation is the trade study. Mandatory system requirements, if already defined, exclude ineligible alternatives. Optional and without succession: performed whenever a step faces an architecture decision with alternatives. Refines the ISO 15288 Decision Management and System Analysis processes. */
        // The concern, the requirement, and the analysis do not subset inputs or outputs (see ModelSubProjects).
        in concern systemObjectives : ExtendedConcern;
        in requirement systemRequirementSpecification [0..1] : ExtendedRequirement;
        inout part decisionContext : SystemContext :> inputs, outputs {
            doc /* The project context of the architecture decision, e.g., productContextImpl. The step makes it a variation usage whose variants are the alternatives. */
        }
        out analysis tradeStudies [1..*] : SYSMODTradeStudy;
    }

    //
    // Input artifacts for the methodology steps
    //
    item def ProjectDescription :> MBSEMethodology::Product {
        :>> modelElements = (projectOwnerName as KerML::Element, projectPurpose as KerML::Element);
        attribute projectPurpose : ScalarValues::String {
            doc
            /* The project purpose is a brief description of the purpose of the project. */
        }
        attribute projectScope : ScalarValues::String {
            doc
            /* The scope of the project is a brief description of the boundaries and extent of the project. In particular, it describes what is not part of the project but could be consideres by stakeholders. */
        }
        attribute projectOwnerName : ScalarValues::String {
            doc
            /* The project owner is the stakeholder who is in charge of the project. */
        }

        // Views
        view projectPurposeView :> productViews {
            expose projectPurpose;
            render SYSMODViews::asText;
        }
        view projectScopeView :> productViews {
            expose projectScope;
            render SYSMODViews::asText;
        }
        view projectCoverView :> productViews {
            view purpose :> projectPurposeView;
            view owner :> projectOwnerView;
            view scope :> projectScopeView;
        }
        view projectOwnerView :> productViews {
            expose projectOwnerName;
            render SYSMODViews::asText;
        }
    }

    item def ProblemStatementDescription :> MBSEMethodology::Product {
        doc
        /* A brief description of the problem the system of interest is intended to solve. Can be a text, sketch, or document, for example. */
    }
    item def ArchitectureDescription :> MBSEMethodology::Product {
        doc
        /* An informal description of a system architecture, given by a human or an AI assistant as input to a process step, for example, a text, sketch, or document of the existing system. */
    }

    //
    // Refinement of the ISO 15288 processes by the SYSMOD processes
    //
    #refinement dependency SetupProject to ISO15288Processes::ProjectPlanning;
    #refinement dependency ModelBrownfieldSystem to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency DescribeProblemStatement to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency IdentifyStakeholders to ISO15288Processes::StakeholderNeedsAndRequirementsDefinition;
    #refinement dependency IdentifyStakeholders to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency IdentifyStakeholderNeeds to ISO15288Processes::StakeholderNeedsAndRequirementsDefinition;
    #refinement dependency DescribeSystemIdea to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency SpecifySystem to ISO15288Processes::SystemRequirementsDefinition;
    #refinement dependency SpecifySystem to ISO15288Processes::Verification;
    #refinement dependency ModelSolutionArchitecture to ISO15288Processes::SystemArchitectureDefinition;
    #refinement dependency ModelSubProjects to ISO15288Processes::SystemArchitectureDefinition;
    #refinement dependency IntegrateSubProjects to ISO15288Processes::Integration;
    #refinement dependency SpecifyVerificationContext to ISO15288Processes::Verification;
    #refinement dependency SpecifyVerificationContext to ISO15288Processes::Validation;
    #refinement dependency PerformVerification to ISO15288Processes::Verification;
    #refinement dependency SpecifyTradeStudy to ISO15288Processes::DecisionManagement;
    #refinement dependency SpecifyTradeStudy to ISO15288Processes::SystemAnalysis;

    //
    // Additional Elements
    //    
    enum def StepStatusKind { open; inProgress; done; skipped; }
    attribute def Percentage :> ScalarValues::Real {
        assert constraint { that >= 0.0 and that <= 1.0 }
    }
    metadata def StepStatus {
        attribute status : StepStatusKind default StepStatusKind::open;
        attribute percentage : Percentage default = 0.0 as Percentage;
        :> annotatedElement : SysML::ActionUsage;
    }        
}