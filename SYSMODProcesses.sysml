library package SYSMODProcesses {
    doc
    /* 
     * Definition of SYSMOD v5 Processes and Methods
     *
     * Version v5.1.8
     *
     * SYSMOD as an MBSE methodology based on the concepts of the library package MBSEMethodology (MBSEMethodology.sysml):
     * - SYSMOD is the methodology (MBSEMethodology::Methodology) with the process defaultProcess and its roles: the
     *   stakeholders of ISO15288Processes::Stakeholders that are responsible for the ISO/IEC/IEEE 15288 processes refined
     *   by the SYSMOD steps (project manager, product manager, requirements engineer, system architect, design engineer,
     *   system analyst, integration engineer, verification engineer, validation engineer) and the sub role TestEngineer.
     *   The project manager is responsible for the process; the other roles support it, are responsible for or support
     *   its steps, and own the products of the steps (see SYSMODDefaultProcess).
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
     * | 3     | define   | Elements with fixed attributes and clear boundaries                                            | Must ambiguity be ruled out, without needing structure yet?                | DefineSystemObjectives |
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

    private import Products::*;

    occurrence def SYSMODEnvironment :> MBSEMethodology::MBSEEnvironment {
        doc
        /* The MBSE environment of a project that uses SYSMOD as its methodology. It provides the roles of the SYSMOD
         * methodology (see SYSMODMethodology) and connects them to it. A project environment specializes it and
         * adds its tools, further roles, and the project as the root product. */
        part projectManager : ISO15288Processes::Stakeholders::ProjectManager :> roles {
            doc /* The project manager of the environment, who is responsible for the SYSMOD process. */
        }
        part productManager : ISO15288Processes::Stakeholders::ProductManager :> roles {
            doc /* The product manager of the environment, typically played by the project owner. */
        }
        part requirementsEngineer : ISO15288Processes::Stakeholders::RequirementsEngineer :> roles {
            doc /* The requirements engineer of the environment. */
        }
        part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> roles {
            doc /* The system architect of the environment, who supports the SYSMOD process and is responsible for the architecture steps. */
        }
        part designEngineer : ISO15288Processes::Stakeholders::DesignEngineer :> roles {
            doc /* The design engineer of the environment. */
        }
        part systemAnalyst : ISO15288Processes::Stakeholders::SystemAnalyst :> roles {
            doc /* The system analyst of the environment. */
        }
        part integrationEngineer : ISO15288Processes::Stakeholders::IntegrationEngineer :> roles {
            doc /* The integration engineer of the environment. */
        }
        part verificationEngineer : ISO15288Processes::Stakeholders::VerificationEngineer :> roles {
            doc /* The verification engineer of the environment. */
        }
        part testEngineer : TestEngineer :> roles {
            doc /* The test engineer of the environment. */
        }
        part validationEngineer : ISO15288Processes::Stakeholders::ValidationEngineer :> roles {
            doc /* The validation engineer of the environment. */
        }
        part sysmod : SYSMODMethodology :>> methodology {
            doc /* SYSMOD as the methodology of the environment, performed by the roles of the environment. */
            part :>> projectManager :> SYSMODEnvironment::projectManager;
            part :>> productManager :> SYSMODEnvironment::productManager;
            part :>> requirementsEngineer :> SYSMODEnvironment::requirementsEngineer;
            part :>> systemArchitect :> SYSMODEnvironment::systemArchitect;
            part :>> designEngineer :> SYSMODEnvironment::designEngineer;
            part :>> systemAnalyst :> SYSMODEnvironment::systemAnalyst;
            part :>> integrationEngineer :> SYSMODEnvironment::integrationEngineer;
            part :>> verificationEngineer :> SYSMODEnvironment::verificationEngineer;
            part :>> testEngineer :> SYSMODEnvironment::testEngineer;
            part :>> validationEngineer :> SYSMODEnvironment::validationEngineer;
        }

        connection :> roleConnection connect projectManager to sysmod;
        connection :> roleConnection connect productManager to sysmod;
        connection :> roleConnection connect requirementsEngineer to sysmod;
        connection :> roleConnection connect systemArchitect to sysmod;
        connection :> roleConnection connect designEngineer to sysmod;
        connection :> roleConnection connect systemAnalyst to sysmod;
        connection :> roleConnection connect integrationEngineer to sysmod;
        connection :> roleConnection connect verificationEngineer to sysmod;
        connection :> roleConnection connect testEngineer to sysmod;
        connection :> roleConnection connect validationEngineer to sysmod;
    }

    part def SYSMODMethodology :> MBSEMethodology::Methodology {
        doc
        /* SYSMOD as an MBSE methodology: the process defaultProcess (SYSMODDefaultProcess) with its steps (methods) and products,
         * and its roles. The roles are the stakeholders of ISO15288Processes::Stakeholders, derived from the ISO/IEC/IEEE 15288
         * processes that the SYSMOD steps refine, and the SYSMOD sub role TestEngineer. The project manager is responsible
         * for the process; the other roles support it and are responsible for steps (see SYSMODDefaultProcess). */
        part projectManager : ISO15288Processes::Stakeholders::ProjectManager :> roles {
            doc /* The role that is responsible for the SYSMOD process. */
        }
        part productManager : ISO15288Processes::Stakeholders::ProductManager :> roles {
            doc /* The role that is responsible for the problem, the system idea, and the system objectives. */
        }
        part requirementsEngineer : ISO15288Processes::Stakeholders::RequirementsEngineer :> roles {
            doc /* The role that is responsible for the stakeholders, their needs, and the system specification. */
        }
        part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> roles {
            doc /* The role that is responsible for the architecture steps. */
        }
        part designEngineer : ISO15288Processes::Stakeholders::DesignEngineer :> roles {
            doc /* The role that supports the modeling of the product architecture. */
        }
        part systemAnalyst : ISO15288Processes::Stakeholders::SystemAnalyst :> roles {
            doc /* The role that supports the trade studies. */
        }
        part integrationEngineer : ISO15288Processes::Stakeholders::IntegrationEngineer :> roles {
            doc /* The role that supports the integration of the sub-projects. */
        }
        part verificationEngineer : ISO15288Processes::Stakeholders::VerificationEngineer :> roles {
            doc /* The role that is responsible for the verification cases and the verification context. */
        }
        part testEngineer : TestEngineer :> roles {
            doc /* The role that performs the verification. */
        }
        part validationEngineer : ISO15288Processes::Stakeholders::ValidationEngineer :> roles {
            doc /* The role that supports the system objectives and the verification context with the view of validation. */
        }
        connection :> responsibleFor connect projectManager to defaultProcess;
        connection :> supports connect productManager to defaultProcess;
        connection :> supports connect requirementsEngineer to defaultProcess;
        connection :> supports connect systemArchitect to defaultProcess;
        connection :> supports connect designEngineer to defaultProcess;
        connection :> supports connect systemAnalyst to defaultProcess;
        connection :> supports connect integrationEngineer to defaultProcess;
        connection :> supports connect verificationEngineer to defaultProcess;
        connection :> supports connect testEngineer to defaultProcess;
        connection :> supports connect validationEngineer to defaultProcess;
        action defaultProcess : SYSMODDefaultProcess :> processes {
            doc /* The default SYSMOD process, performed by the roles of the methodology. */
            ref part :>> projectManager :> SYSMODMethodology::projectManager;
            ref part :>> productManager :> SYSMODMethodology::productManager;
            ref part :>> requirementsEngineer :> SYSMODMethodology::requirementsEngineer;
            ref part :>> systemArchitect :> SYSMODMethodology::systemArchitect;
            ref part :>> designEngineer :> SYSMODMethodology::designEngineer;
            ref part :>> systemAnalyst :> SYSMODMethodology::systemAnalyst;
            ref part :>> integrationEngineer :> SYSMODMethodology::integrationEngineer;
            ref part :>> verificationEngineer :> SYSMODMethodology::verificationEngineer;
            ref part :>> testEngineer :> SYSMODMethodology::testEngineer;
            ref part :>> validationEngineer :> SYSMODMethodology::validationEngineer;
        }
    }

    //
    // Roles
    //
    part def TestEngineer :> ISO15288Processes::Stakeholders::VerificationEngineer {
        doc
        /* A verification engineer who performs the verification: executes the verification cases on the system of interest,
         * e.g., on a test bench, and documents the results in the verification reports. A sub role of the VerificationEngineer
         * derived from the ISO/IEC/IEEE 15288 Verification process: the verification engineer specifies the verification,
         * the test engineer performs it. */
    }

    action def SYSMODDefaultProcess :> MBSEMethodology::Process {
        doc
        /*
            * The default SYSMOD process: setupProject, modelBrownfieldSystem, describeProblemStatement, identifyStakeholders,
            * identifyStakeholderNeeds, describeSystemIdea, defineSystemObjectives, specifySystem, modelSolutionArchitecture (with the nested steps
            * modelFunctionalArchitecture, modelLogicalArchitecture, and modelProductArchitecture), modelSubProjects, integrateSubProjects,
            * specifyVerificationContext, and performVerification, in this order. Between modelSubProjects and integrateSubProjects, each
            * sub-project performs its own process. specifyTradeStudy has no succession: it is performed for any architecture decision
            * with alternatives.
            * Verification is split into two parts: specifySystem specifies the verification cases against the black box specification system
            * (nested step specifyVerificationCases) before any solution architecture is modeled and returns the verification context with them,
            * and specifyVerificationContext completes the verification context with the test systems and the system of interest, which can be
            * any system, e.g., the product system, a prototype, or a simulation model. Verification engineers thus take part from the specification on.
            * The project that performs the process is referenced by project. The project manager is the primary performer,
            * and the other roles are additional performers. Each step has a responsible role (responsibleFor), supporting roles
            * (supports), and owners of its output products (productOwnership), derived from the ISO/IEC/IEEE 15288 processes
            * that the step refines, e.g., the requirements engineer is responsible for SpecifySystem (System Requirements Definition)
            * and owns the SystemSpecification. Outputs of the steps flow into the corresponding project features,
            * and the inputs of the steps are bound to the project features created by earlier steps.
            * The input parameters are the information a human or an AI assistant provides to start the process, e.g., the descriptions of
            * the architectures; they flow into the inputs of the steps. */
        ref occurrence project :>> this : Project {
            doc /* The project that performs the process. The outputs of the steps flow into its features. */
        }

        ref part projectManager : ISO15288Processes::Stakeholders::ProjectManager :>> primaryPerformer {
            doc /* The project manager, the primary performer of the process. */
        }
        ref part productManager : ISO15288Processes::Stakeholders::ProductManager :> additionalPerformers {
            doc /* The product manager, an additional performer of the process (Business or Mission Analysis). */
        }
        ref part requirementsEngineer : ISO15288Processes::Stakeholders::RequirementsEngineer :> additionalPerformers {
            doc /* The requirements engineer, an additional performer of the process (Stakeholder Needs and Requirements Definition, System Requirements Definition). */
        }
        ref part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> additionalPerformers {
            doc /* The system architect, an additional performer of the process (System Architecture Definition). */
        }
        ref part designEngineer : ISO15288Processes::Stakeholders::DesignEngineer :> additionalPerformers {
            doc /* The design engineer, an additional performer of the process (Design Definition). */
        }
        ref part systemAnalyst : ISO15288Processes::Stakeholders::SystemAnalyst :> additionalPerformers {
            doc /* The system analyst, an additional performer of the process (System Analysis). */
        }
        ref part integrationEngineer : ISO15288Processes::Stakeholders::IntegrationEngineer :> additionalPerformers {
            doc /* The integration engineer, an additional performer of the process (Integration). */
        }
        ref part verificationEngineer : ISO15288Processes::Stakeholders::VerificationEngineer :> additionalPerformers {
            doc /* The verification engineer, an additional performer of the process (Verification). */
        }
        ref part testEngineer : TestEngineer :> additionalPerformers {
            doc /* The test engineer, an additional performer of the process (Verification). */
        }
        ref part validationEngineer : ISO15288Processes::Stakeholders::ValidationEngineer :> additionalPerformers {
            doc /* The validation engineer, an additional performer of the process (Validation). */
        }

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
        first [0..1]describeSystemIdea then [0..1]defineSystemObjectives;
        first [0..1]defineSystemObjectives then [0..1]specifySystem;
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
        flow from defineSystemObjectives.systemObjectives to project.systemObjectives;
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
        bind project.problemStatement = defineSystemObjectives.problemStatement;
        bind project.stakeholderNeeds = defineSystemObjectives.stakeholderNeeds;
        bind project.systemIdeaContextImpl = defineSystemObjectives.systemIdeaContextImpl;
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

        // Steps with their responsible (primary performer) and supporting roles (additional performers), and the owners
        // of the products of the steps. The roles follow the ISO/IEC/IEEE 15288 processes that the steps refine.
        connection :> responsibleFor connect projectManager to setupProject;
        connection :> productOwnership connect projectManager to setupProject.projectCover;
        action setupProject : SetupProject :> submethods { @StepStatus; }

        connection :> responsibleFor connect systemArchitect to modelBrownfieldSystem;
        connection :> supports connect productManager to modelBrownfieldSystem;
        connection :> productOwnership connect systemArchitect to modelBrownfieldSystem.brownfieldSystemModel;
        action modelBrownfieldSystem : ModelBrownfieldSystem :> submethods { @StepStatus; }

        connection :> responsibleFor connect productManager to describeProblemStatement;
        connection :> supports connect requirementsEngineer to describeProblemStatement;
        connection :> productOwnership connect productManager to describeProblemStatement.problemStatementModel;
        action describeProblemStatement : DescribeProblemStatement :> submethods { @StepStatus; }

        connection :> responsibleFor connect requirementsEngineer to identifyStakeholders;
        connection :> supports connect productManager to identifyStakeholders;
        connection :> productOwnership connect requirementsEngineer to identifyStakeholders.stakeholderModel;
        action identifyStakeholders : IdentifyStakeholders :> submethods { @StepStatus; }

        connection :> responsibleFor connect requirementsEngineer to identifyStakeholderNeeds;
        connection :> supports connect productManager to identifyStakeholderNeeds;
        connection :> productOwnership connect requirementsEngineer to identifyStakeholderNeeds.stakeholderNeedsModel;
        action identifyStakeholderNeeds : IdentifyStakeholderNeeds :> submethods { @StepStatus; }

        connection :> responsibleFor connect productManager to describeSystemIdea;
        connection :> supports connect systemArchitect to describeSystemIdea;
        connection :> productOwnership connect productManager to describeSystemIdea.systemIdeaModel;
        action describeSystemIdea : DescribeSystemIdea :> submethods { @StepStatus; }

        connection :> responsibleFor connect productManager to defineSystemObjectives;
        connection :> supports connect systemArchitect to defineSystemObjectives;
        connection :> supports connect validationEngineer to defineSystemObjectives;
        connection :> productOwnership connect productManager to defineSystemObjectives.systemObjectivesModel;
        action defineSystemObjectives : DefineSystemObjectives :> submethods { @StepStatus; }

        connection :> responsibleFor connect requirementsEngineer to specifySystem;
        connection :> supports connect systemArchitect to specifySystem;
        connection :> supports connect verificationEngineer to specifySystem;
        connection :> productOwnership connect requirementsEngineer to specifySystem.systemSpecification;
        connection :> productOwnership connect verificationEngineer to specifySystem.verificationSpecification;
        action specifySystem : SpecifySystem :> submethods { @StepStatus; }
        bind specifySystem.verificationEngineer = verificationEngineer;

        connection :> responsibleFor connect systemArchitect to modelSolutionArchitecture;
        connection :> supports connect designEngineer to modelSolutionArchitecture;
        connection :> productOwnership connect systemArchitect to modelSolutionArchitecture.functionalArchitecture;
        connection :> productOwnership connect systemArchitect to modelSolutionArchitecture.logicalArchitecture;
        connection :> productOwnership connect systemArchitect to modelSolutionArchitecture.productArchitecture;
        action modelSolutionArchitecture : ModelSolutionArchitecture :> submethods { @StepStatus; }
        bind modelSolutionArchitecture.designEngineer = designEngineer;

        connection :> responsibleFor connect systemArchitect to modelSubProjects;
        connection :> supports connect projectManager to modelSubProjects;
        connection :> supports connect requirementsEngineer to modelSubProjects;
        connection :> productOwnership connect systemArchitect to modelSubProjects.requirementFlowDown;
        action modelSubProjects : ModelSubProjects :> submethods { @StepStatus; }

        connection :> responsibleFor connect systemArchitect to integrateSubProjects;
        connection :> supports connect integrationEngineer to integrateSubProjects;
        action integrateSubProjects : IntegrateSubProjects :> submethods { @StepStatus; }

        connection :> responsibleFor connect verificationEngineer to specifyVerificationContext;
        connection :> supports connect validationEngineer to specifyVerificationContext;
        connection :> supports connect systemArchitect to specifyVerificationContext;
        action specifyVerificationContext : SpecifyVerificationContext :> submethods { @StepStatus; }

        connection :> responsibleFor connect testEngineer to performVerification;
        connection :> supports connect verificationEngineer to performVerification;
        connection :> productOwnership connect testEngineer to performVerification.verificationReports;
        action performVerification : PerformVerification :> submethods { @StepStatus; }

        // No succession: performed for any architecture decision with alternatives.
        connection :> responsibleFor connect systemArchitect to specifyTradeStudy;
        connection :> supports connect systemAnalyst to specifyTradeStudy;
        connection :> productOwnership connect systemArchitect to specifyTradeStudy.tradeStudyReport;
        action specifyTradeStudy : SpecifyTradeStudy [0..*] :> submethods { @StepStatus; }
    }

    action def SetupProject :> MBSEMethodology::Method {
        doc
        /* Sets up a new SYSMOD project: assigns the name of the project owner and the purpose of the project. Refines the ISO 15288 Project Planning process. */
        ref occurrence project :>> this : Project {
            doc /* The project that is set up. */
        }

        ref part primaryPerformer :>> primaryPerformer {
            doc /* The role that sets up the project, by default the project manager. */
        }

        in item projectDescription : ProjectDescription :> inputs {
            doc
            /* The project description contains the basic information about the project, including the project owner and the project purpose. */
        }
        out item projectCover : ProjectCover :> outputs {
            doc /* The project cover with the project owner, the purpose, and the scope of the project. */
            :>> projectOwner = SetupProject::project.projectOwner;
            :>> purpose = SetupProject::project.purpose;
            :>> scope = SetupProject::project.scope;
        }

        assign project.projectOwner.name := projectDescription.projectOwnerName;
        assign project.purpose := projectDescription.projectPurpose;
        assign project.scope := projectDescription.projectScope;
    }

    action def ModelBrownfieldSystem :> MBSEMethodology::Method {
        doc
        /* Models the existing (brownfield) system and its actors as black box context (brownfieldContext) and white box context (brownfieldContextImpl), based on a given description of the existing architecture. Optional for greenfield projects. Refines the ISO 15288 Business or Mission Analysis process. */
        in item brownfieldArchitectureDescription : ArchitectureDescription :> inputs {
            doc /* The informal description of the existing system and its actors, e.g., a text, sketch, or document. */
        }
        out part brownfieldContext : SystemContext {
            doc /* The black box context of the existing system with its actors. */
        }
        out part brownfieldContextImpl : SystemContext {
            doc /* The white box context of the existing system with its internal structure. */
        }
        out item brownfieldSystemModel : BrownfieldSystemModel :> outputs {
            doc /* The model of the brownfield system: the black box and white box brownfield contexts. */
            :>> brownfieldContext = ModelBrownfieldSystem::brownfieldContext;
            :>> brownfieldContextImpl = ModelBrownfieldSystem::brownfieldContextImpl;
        }
    }

    action def DescribeProblemStatement :> MBSEMethodology::Method {
        doc
        /* Describes the problem statement: a solution-free elevator pitch of the problem, with the brownfield system as subject and the project owner as stakeholder. Refines the ISO 15288 Business or Mission Analysis process. */
        in part projectOwner : ExtendedStakeholder {
            doc /* The project owner, the stakeholder of the problem statement. */
        }
        in item problemStatementDescription : ProblemStatementDescription :> inputs {
            doc
            /* The problem statement is a brief description of the problem the system of interest is intended to solve. */
        }
        in part brownfieldContextImpl : SystemContext {
            doc /* The white box context of the existing system, whose system of interest is the subject of the problem statement. */
        }
        out concern problemStatement : ExtendedConcern {
            doc /* The problem statement as a concern of the project owner. */
        }
        in item projectCover : ProjectCover :> inputs {
            doc /* The project cover that provides the project owner. */
            :>> projectOwner = DescribeProblemStatement::projectOwner;
        }
        in item brownfieldSystemModel : BrownfieldSystemModel :> inputs {
            doc /* The model of the brownfield system that provides the subject of the problem statement. */
            :>> brownfieldContextImpl = DescribeProblemStatement::brownfieldContextImpl;
        }
        out item problemStatementModel : ProblemStatementModel :> outputs {
            doc /* The problem statement as product. */
            :>> problemStatement = DescribeProblemStatement::problemStatement;
        }
    }

    action def IdentifyStakeholders :> MBSEMethodology::Method {
        doc
        /* Identifies the stakeholders of the project based on the problem statement and assesses their risk, effort, and categories. Refines the ISO 15288 Business or Mission Analysis process (identification of the major stakeholders) and the Stakeholder Needs and Requirements Definition process. */
        in concern problemStatement : ExtendedConcern {
            doc /* The problem statement whose stakeholders are identified. */
        }
        out part projectStakeholders[*] : ExtendedStakeholder {
            doc /* The stakeholders of the project are individuals and organizations that have an interest in the system. The list includes the project owner retrieved from the problemStatement.*/
        }
        in item problemStatementModel : ProblemStatementModel :> inputs {
            doc /* The problem statement as product. */
            :>> problemStatement = IdentifyStakeholders::problemStatement;
        }
        out item stakeholderModel : StakeholderModel :> outputs {
            doc /* The stakeholders of the project as product. */
            :>> projectStakeholders = IdentifyStakeholders::projectStakeholders;
        }
    }

    action def IdentifyStakeholderNeeds :> MBSEMethodology::Method {
        doc
        /* Identifies the needs of the stakeholders at intent level, framed by the problem statement and traced to the stakeholders they come from. Refines the ISO 15288 Stakeholder Needs and Requirements Definition process. */
        in concern problemStatement : ExtendedConcern {
            doc /* The problem statement that frames the stakeholder needs. */
        }
        in part projectStakeholders[1..*] : ExtendedStakeholder {
            doc /* The stakeholders whose needs are identified. */
        }
        out concern stakeholderNeeds : ExtendedConcern {
            doc /* The root concern of the stakeholder needs, with the individual needs as nested concerns. */
        }
        in item problemStatementModel : ProblemStatementModel :> inputs {
            doc /* The problem statement as product. */
            :>> problemStatement = IdentifyStakeholderNeeds::problemStatement;
        }
        in item stakeholderModel : StakeholderModel :> inputs {
            doc /* The stakeholders of the project as product. */
            :>> projectStakeholders = IdentifyStakeholderNeeds::projectStakeholders;
        }
        out item stakeholderNeedsModel : StakeholderNeedsModel :> outputs {
            doc /* The stakeholder needs as product. */
            :>> stakeholderNeeds = IdentifyStakeholderNeeds::stakeholderNeeds;
        }
    }

    action def DescribeSystemIdea :> MBSEMethodology::Method {
        doc
        /* Describes the system idea: a conceptual, elevator-pitch-style outline of the new or changed system that answers the problem statement and the stakeholder needs, as black box (systemIdeaContext) and white box (systemIdeaContextImpl) context. Refines the ISO 15288 Business or Mission Analysis process. */
        in item systemIdeaArchitectureDescription : ArchitectureDescription :> inputs {
            doc /* The informal description of the system idea, e.g., a text, sketch, or document. */
        }
        in concern problemStatement : ExtendedConcern {
            doc /* The problem statement that the system idea answers. */
        }
        in concern stakeholderNeeds : ExtendedConcern {
            doc /* The stakeholder needs that the system idea answers. */
        }
        out part systemIdeaContext : SystemContext {
            doc /* The black box context of the system idea. */
        }
        out part systemIdeaContextImpl : SystemContext {
            doc /* The white box context of the system idea. */
        }
        in item problemStatementModel : ProblemStatementModel :> inputs {
            doc /* The problem statement as product. */
            :>> problemStatement = DescribeSystemIdea::problemStatement;
        }
        in item stakeholderNeedsModel : StakeholderNeedsModel :> inputs {
            doc /* The stakeholder needs as product. */
            :>> stakeholderNeeds = DescribeSystemIdea::stakeholderNeeds;
        }
        out item systemIdeaModel : SystemIdeaModel :> outputs {
            doc /* The system idea as product: its black box and white box contexts. */
            :>> systemIdeaContext = DescribeSystemIdea::systemIdeaContext;
            :>> systemIdeaContextImpl = DescribeSystemIdea::systemIdeaContextImpl;
        }
    }

    action def DefineSystemObjectives :> MBSEMethodology::Method {
        doc
        /* Defines the system objectives: the measurable goals of the system idea, agreed with the project owner. Each objective is a SystemObjective with the system idea as subject, its measures of effectiveness (MOE) and measures of performance (MOP), and their target values. The system objectives frame the stakeholder needs and direct the development: they are the basis for the system requirements, for validation, and for the criteria of trade studies. Refines the ISO 15288 Business or Mission Analysis process. */
        in concern problemStatement : ExtendedConcern {
            doc /* The problem statement that the system objectives address. */
        }
        in concern stakeholderNeeds : ExtendedConcern {
            doc /* The stakeholder needs that the system objectives frame. */
        }
        in part systemIdeaContextImpl : SystemContext {
            doc /* The white box context of the system idea, whose system is the subject of the system objectives. */
        }
        out concern systemObjectives : SystemObjective {
            doc /* The root concern of the system objectives, with the individual objectives as nested concerns. */
        }
        in item problemStatementModel : ProblemStatementModel :> inputs {
            doc /* The problem statement as product. */
            :>> problemStatement = DefineSystemObjectives::problemStatement;
        }
        in item stakeholderNeedsModel : StakeholderNeedsModel :> inputs {
            doc /* The stakeholder needs as product. */
            :>> stakeholderNeeds = DefineSystemObjectives::stakeholderNeeds;
        }
        in item systemIdeaModel : SystemIdeaModel :> inputs {
            doc /* The system idea as product. */
            :>> systemIdeaContextImpl = DefineSystemObjectives::systemIdeaContextImpl;
        }
        out item systemObjectivesModel : SystemObjectivesModel :> outputs {
            doc /* The system objectives as product. */
            :>> systemObjectives = DefineSystemObjectives::systemObjectives;
        }
    }

    action def SpecifySystem :> MBSEMethodology::Method {
        doc
        /* Specifies the system based on the system idea, the system objectives, and the stakeholder needs: the specification contexts, the system use cases, the system requirements, and the verification cases that verify them against the black box specification system. Refines the ISO 15288 System Requirements Definition process and the preparation of the ISO 15288 Verification process. */
        in part systemIdeaContextImpl : SystemContext {
            doc /* The white box context of the system idea that the specification contexts refine. */
        }
        in concern stakeholderNeeds : ExtendedConcern {
            doc /* The stakeholder needs that the system use cases and the system requirements frame. */
        }
        in concern systemObjectives : SystemObjective {
            doc /* The system objectives that direct the system requirements. */
        }
        out part specificationContext : SystemContext {
            doc /* The black box specification context with the actors at the system boundary and the system use cases. */
        }
        out part specificationContextImpl : SystemContext {
            doc /* The white box specification context with the subparts and attributes used by use cases and requirements. */
        }
        out requirement systemRequirementSpecification : ExtendedRequirement {
            doc /* The system requirements. */
        }
        out part verificationContext : SystemContext {
            doc /* The verification context with the verification cases of the system requirements. */
        }
        in item systemIdeaModel : SystemIdeaModel :> inputs {
            doc /* The system idea as product. */
            :>> systemIdeaContextImpl = SpecifySystem::systemIdeaContextImpl;
        }
        in item stakeholderNeedsModel : StakeholderNeedsModel :> inputs {
            doc /* The stakeholder needs as product. */
            :>> stakeholderNeeds = SpecifySystem::stakeholderNeeds;
        }
        in item systemObjectivesModel : SystemObjectivesModel :> inputs {
            doc /* The system objectives as product. */
            :>> systemObjectives = SpecifySystem::systemObjectives;
        }
        out item systemSpecification : SystemSpecification :> outputs {
            doc /* The system specification as product: the specification contexts with the system use cases, and the system requirements. */
            :>> specificationContext = SpecifySystem::specificationContext;
            :>> specificationContextImpl = SpecifySystem::specificationContextImpl;
            :>> systemRequirementSpecification = SpecifySystem::systemRequirementSpecification;
        }
        out item verificationSpecification : VerificationSpecification :> outputs {
            doc /* The verification context with the verification cases as product. */
            :>> verificationContext = SpecifySystem::verificationContext;
        }

        // The primary performer of the step, by default the requirements engineer, is responsible for the nested steps
        // (MBSEMethodology::Method::responsibleFor), except for specifyVerificationCases.
        ref part verificationEngineer : ISO15288Processes::Stakeholders::VerificationEngineer :> additionalPerformers {
            doc /* The verification engineer, who is responsible for the verification cases and supports the system requirements. */
        }
        connection :> responsibleFor connect verificationEngineer to specifyVerificationCases;
        connection :> supports connect primaryPerformer to specifyVerificationCases;
        connection :> supports connect verificationEngineer to specifySystemRequirements;

        first start then modelSpecificationContext;
        first [0..1]modelSpecificationContext then [0..1]identifyUseCases;
        first [0..1]identifyUseCases then [0..1]specifySystemRequirements;
        first [0..1]specifySystemRequirements then [0..1]specifyVerificationCases;
        first [0..1]specifyVerificationCases then done;

        action modelSpecificationContext : MBSEMethodology::Method :> submethods {
            doc
            /* Models the black box and white box specification contexts by refining the system idea contexts: the actors at the system boundary in the black box context, and the subparts or attributes of the system used by use cases and requirements in the white box context. */
            in part systemIdeaContextImpl : SystemContext = SpecifySystem::systemIdeaContextImpl;
            out part specificationContext : SystemContext = SpecifySystem::specificationContext;
            out part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
            in item systemIdeaModel : SystemIdeaModel :> inputs = SpecifySystem::systemIdeaModel;
            out item systemSpecification : SystemSpecification :> outputs = SpecifySystem::systemSpecification;
        }
        action identifyUseCases : MBSEMethodology::Method :> submethods {
            doc
            /* Identifies the system use cases of the specification context that describe how the actors interact with the system. */
            in part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
            in concern stakeholderNeeds : ExtendedConcern = SpecifySystem::stakeholderNeeds;
            out use case systemUseCases[*] : SystemUseCase = SpecifySystem::specificationContext.useCases;
            in item stakeholderNeedsModel : StakeholderNeedsModel :> inputs = SpecifySystem::stakeholderNeedsModel;
            inout item systemSpecification : SystemSpecification :> inputs, outputs = SpecifySystem::systemSpecification {
                doc /* The system specification: its specification context is the input, its system use cases the output. */
            }
        }
        action specifySystemRequirements : MBSEMethodology::Method :> submethods {
            doc
            /* Specifies the verifiable, solution-neutral system requirements that frame the stakeholder needs. */
            in part specificationContextImpl : SystemContext = SpecifySystem::specificationContextImpl;
            in concern stakeholderNeeds : ExtendedConcern = SpecifySystem::stakeholderNeeds;
            in concern systemObjectives : SystemObjective = SpecifySystem::systemObjectives;
            out requirement systemRequirementSpecification : ExtendedRequirement = SpecifySystem::systemRequirementSpecification;
            in item stakeholderNeedsModel : StakeholderNeedsModel :> inputs = SpecifySystem::stakeholderNeedsModel;
            in item systemObjectivesModel : SystemObjectivesModel :> inputs = SpecifySystem::systemObjectivesModel;
            inout item systemSpecification : SystemSpecification :> inputs, outputs = SpecifySystem::systemSpecification {
                doc /* The system specification: its white box specification context is the input, its system requirements the output. */
            }
        }
        action specifyVerificationCases : MBSEMethodology::Method :> submethods {
            doc
            /* Specifies the verification cases of the system requirements against the black box specification system, alongside specifySystemRequirements and before any solution architecture exists: a verification case definition per verification case with the objective (verify) and the verdict (e.g., VerificationCases::PassIf), and a verification case usage in the verification context of the project, typed by the definition and subsetting verificationCases. The step returns the updated verification context. The VerificationEngineer is a stakeholder of this step and specifies the verification cases together with the RequirementsEngineer (concern VerificationCoverage), so that both discuss the verification in SysML rather than in a separate test language. The test systems and the system of interest of the verification context follow in SpecifyVerificationContext. */
            in part specificationContext : SystemContext = SpecifySystem::specificationContext;
            in requirement systemRequirementSpecification : ExtendedRequirement = SpecifySystem::systemRequirementSpecification;
            out part verificationContext : SystemContext = SpecifySystem::verificationContext;
            in item systemSpecification : SystemSpecification :> inputs = SpecifySystem::systemSpecification;
            out item verificationSpecification : VerificationSpecification :> outputs = SpecifySystem::verificationSpecification;
        }
    }

    action def ModelSolutionArchitecture :> MBSEMethodology::Method {
        doc
        /* Models the solution architecture based on the specification contexts and the system requirements, in the nested steps modelFunctionalArchitecture (optional), modelLogicalArchitecture (optional), and modelProductArchitecture (optional), in this order. Each nested step creates the black box and the white box context of its architecture; the logical and product steps also create the allocations from the preceding architecture. Refines the ISO 15288 System Architecture Definition process. */
        in requirement systemRequirementSpecification : ExtendedRequirement {
            doc /* The system requirements that the elements of the architectures refine. */
        }
        in part specificationContextImpl : SystemContext {
            doc /* The white box specification context, the base of the logical and the product architecture. */
        }
        in part specificationContext[0..1] : SystemContext {
            doc /* The black box specification context, the base of the functional architecture. */
        }
        in item functionalArchitectureDescription[0..1] : ArchitectureDescription :> inputs {
            doc /* The informal description of the functional architecture. */
        }
        in item logicalArchitectureDescription[0..1] : ArchitectureDescription :> inputs {
            doc /* The informal description of the logical architecture. */
        }
        in item productArchitectureDescription[0..1] : ArchitectureDescription :> inputs {
            doc /* The informal description of the product architecture. */
        }

        out part functionalContext[0..1] : SystemContext {
            doc /* The black box functional context. */
        }
        out part functionalContextImpl[0..1] : SystemContext {
            doc /* The white box functional context with the functional blocks. */
        }
        out part logicalContext[0..1] : SystemContext {
            doc /* The black box logical context. */
        }
        out part logicalContextImpl[0..1] : SystemContext {
            doc /* The white box logical context with the technology-independent building blocks. */
        }
        out abstract allocation functional2logical[0..1] {
            doc /* The allocation of the black box functional context to the black box logical context. */
        }
        out abstract allocation functionalImpl2logicalImpl[0..1] {
            doc /* The allocation of the white box functional context to the white box logical context. */
        }
        out part productContext[0..1] : SystemContext {
            doc /* The black box product context. */
        }
        out part productContextImpl[0..1] : SystemContext {
            doc /* The white box product context with the concrete, physical or deployable building blocks. */
        }
        out abstract allocation logical2product[0..1] {
            doc /* The allocation of the black box logical context to the black box product context. */
        }
        out abstract allocation logicalImpl2productImpl[0..1] {
            doc /* The allocation of the white box logical context to the white box product context. */
        }

        in item systemSpecification : SystemSpecification :> inputs {
            doc /* The system specification as product. */
            :>> specificationContext = ModelSolutionArchitecture::specificationContext;
            :>> specificationContextImpl = ModelSolutionArchitecture::specificationContextImpl;
            :>> systemRequirementSpecification = ModelSolutionArchitecture::systemRequirementSpecification;
        }
        out item functionalArchitecture[0..1] : FunctionalArchitecture :> outputs {
            doc /* The functional architecture as product, if modeled. */
            :>> functionalContext = ModelSolutionArchitecture::functionalContext;
            :>> functionalContextImpl = ModelSolutionArchitecture::functionalContextImpl;
        }
        out item logicalArchitecture[0..1] : LogicalArchitecture :> outputs {
            doc /* The logical architecture as product, if modeled. */
            :>> logicalContext = ModelSolutionArchitecture::logicalContext;
            :>> logicalContextImpl = ModelSolutionArchitecture::logicalContextImpl;
            :>> functional2logical = ModelSolutionArchitecture::functional2logical;
            :>> functionalImpl2logicalImpl = ModelSolutionArchitecture::functionalImpl2logicalImpl;
        }
        out item productArchitecture[0..1] : ProductArchitecture :> outputs {
            doc /* The product architecture as product, if modeled. */
            :>> productContext = ModelSolutionArchitecture::productContext;
            :>> productContextImpl = ModelSolutionArchitecture::productContextImpl;
            :>> logical2product = ModelSolutionArchitecture::logical2product;
            :>> logicalImpl2productImpl = ModelSolutionArchitecture::logicalImpl2productImpl;
        }

        // The primary performer of the step, by default the system architect, is responsible for the nested steps
        // (MBSEMethodology::Method::responsibleFor).
        ref part designEngineer : ISO15288Processes::Stakeholders::DesignEngineer :> additionalPerformers {
            doc /* The design engineer, who supports the modeling of the product architecture. */
        }
        connection :> supports connect designEngineer to modelProductArchitecture;

        first start then [0..1]modelFunctionalArchitecture;
        first [0..1]modelFunctionalArchitecture then [0..1]modelLogicalArchitecture;
        first [0..1]modelLogicalArchitecture then [0..1]modelProductArchitecture;
        first [0..1]modelProductArchitecture then done;

        action modelFunctionalArchitecture : MBSEMethodology::Method :> submethods {
            @StepStatus;
            doc
            /* Models the optional functional architecture based on the black box specification context: the black box functional context and the white box functional context with the functional blocks, and the #refinement dependencies from the functional elements to the system requirements they refine. Refines the ISO 15288 System Architecture Definition process. */
            in item functionalArchitectureDescription : ArchitectureDescription = ModelSolutionArchitecture::functionalArchitectureDescription;
            in requirement systemRequirementSpecification : ExtendedRequirement = ModelSolutionArchitecture::systemRequirementSpecification;
            in part specificationContext : SystemContext = ModelSolutionArchitecture::specificationContext;
            out part functionalContext : SystemContext = ModelSolutionArchitecture::functionalContext;
            out part functionalContextImpl : SystemContext = ModelSolutionArchitecture::functionalContextImpl;
            in item systemSpecification : SystemSpecification :> inputs = ModelSolutionArchitecture::systemSpecification;
            out item functionalArchitecture : FunctionalArchitecture :> outputs = ModelSolutionArchitecture::functionalArchitecture;
        }

        first [0..1]modelFunctionalArchitecture then [0..1]modelLogicalArchitecture;
        flow from modelFunctionalArchitecture.functionalContext to modelLogicalArchitecture.functionalContext;
        flow from modelFunctionalArchitecture.functionalContextImpl to modelLogicalArchitecture.functionalContextImpl;
        flow from modelFunctionalArchitecture.functionalContextImpl to modelProductArchitecture.functionalContextImpl;

        action modelLogicalArchitecture : MBSEMethodology::Method :> submethods {
            @StepStatus;
            doc
            /* Models the optional logical architecture based on the white box specification context and, if present, the white box functional context: the black box logical context and the white box logical context with the technology-independent building blocks, the #refinement dependencies from the logical elements to the system requirements they refine, and, if a functional architecture is present, the allocations functional2logical and functionalImpl2logicalImpl from the functional to the logical architecture. Refines the ISO 15288 System Architecture Definition process. */
            in item logicalArchitectureDescription : ArchitectureDescription = ModelSolutionArchitecture::logicalArchitectureDescription;
            in part specificationContextImpl : SystemContext = ModelSolutionArchitecture::specificationContextImpl;
            in requirement systemRequirementSpecification : ExtendedRequirement = ModelSolutionArchitecture::systemRequirementSpecification;
            in part functionalContext[0..1] : SystemContext {
                doc /* The black box functional context, if a functional architecture is present. */
            }
            in part functionalContextImpl[0..1] : SystemContext {
                doc /* The white box functional context, if a functional architecture is present. */
            }
            out part logicalContext : SystemContext = ModelSolutionArchitecture::logicalContext;
            out part logicalContextImpl : SystemContext = ModelSolutionArchitecture::logicalContextImpl;
            out abstract allocation functional2logical[0..1] {
                doc /* The allocation of the black box functional context to the black box logical context, if a functional architecture is present. */
            }
            out abstract allocation functionalImpl2logicalImpl[0..1] {
                doc /* The allocation of the white box functional context to the white box logical context, if a functional architecture is present. */
            }
            in item systemSpecification : SystemSpecification :> inputs = ModelSolutionArchitecture::systemSpecification;
            in item functionalArchitecture[0..1] : FunctionalArchitecture :> inputs = ModelSolutionArchitecture::functionalArchitecture;
            out item logicalArchitecture : LogicalArchitecture :> outputs = ModelSolutionArchitecture::logicalArchitecture;
        }
        bind functional2logical = modelLogicalArchitecture.functional2logical;
        bind functionalImpl2logicalImpl = modelLogicalArchitecture.functionalImpl2logicalImpl;

        first [0..1]modelLogicalArchitecture then [0..1]modelProductArchitecture;
        flow from modelLogicalArchitecture.logicalContext to modelProductArchitecture.logicalContext;
        flow from modelLogicalArchitecture.logicalContextImpl to modelProductArchitecture.logicalContextImpl;

        action modelProductArchitecture : MBSEMethodology::Method :> submethods {
            @StepStatus;
            doc
            /* Models the optional product architecture based on the white box specification context and, if present, the white box functional and logical contexts: the black box product context and the white box product context with the concrete, physical or deployable building blocks, and, if a logical architecture is present, the allocations logical2product and logicalImpl2productImpl from the logical to the product architecture. Refines the ISO 15288 System Architecture Definition process. */
            in item productArchitectureDescription : ArchitectureDescription = ModelSolutionArchitecture::productArchitectureDescription;
            in part specificationContextImpl : SystemContext = ModelSolutionArchitecture::specificationContextImpl;
            in requirement systemRequirementSpecification : ExtendedRequirement = ModelSolutionArchitecture::systemRequirementSpecification;
            in part functionalContextImpl[0..1] : SystemContext {
                doc /* The white box functional context, if a functional architecture is present. */
            }
            in part logicalContext[0..1] : SystemContext {
                doc /* The black box logical context, if a logical architecture is present. */
            }
            in part logicalContextImpl[0..1] : SystemContext {
                doc /* The white box logical context, if a logical architecture is present. */
            }
            out part productContext : SystemContext = ModelSolutionArchitecture::productContext;
            out part productContextImpl : SystemContext = ModelSolutionArchitecture::productContextImpl;
            out abstract allocation logical2product[0..1] {
                doc /* The allocation of the black box logical context to the black box product context, if a logical architecture is present. */
            }
            out abstract allocation logicalImpl2productImpl[0..1] {
                doc /* The allocation of the white box logical context to the white box product context, if a logical architecture is present. */
            }
            in item systemSpecification : SystemSpecification :> inputs = ModelSolutionArchitecture::systemSpecification;
            in item functionalArchitecture[0..1] : FunctionalArchitecture :> inputs = ModelSolutionArchitecture::functionalArchitecture;
            in item logicalArchitecture[0..1] : LogicalArchitecture :> inputs = ModelSolutionArchitecture::logicalArchitecture;
            out item productArchitecture : ProductArchitecture :> outputs = ModelSolutionArchitecture::productArchitecture;
        }
        bind logical2product = modelProductArchitecture.logical2product;
        bind logicalImpl2productImpl = modelProductArchitecture.logicalImpl2productImpl;
    }

    action def ModelSubProjects :> MBSEMethodology::Method {
        doc
        /* Models a sub-project for each building block of the white box product context that is developed separately, e.g., by another team or a supplier, and the sub-project contract: the sub-project usage subsets subProjects; a separate handover package carries the contract: the handover context (the building block as the system of interest, its external entities that are handed over as actors, and its connections and delegations as the actor/system interfaces), whose system of interest definition types the building block, whose other elements the parent white box specializes, and which the sub-project uses as its black box brownfield context, so that the sub-project, e.g., a supplier, needs no access to the parent project; the handover package also contains the stakeholders and the handover requirements of the sub-project, which the parent derives from its requirements that constrain the building block via its requirementFlowDowns; the sub-project derives its system requirements from the handover requirements. Optional; each sub-project then performs its own process. Refines the ISO 15288 System Architecture Definition process. */
        // The model elements are the parameters; the products that contain them (package Products) subset inputs or outputs.
        // A project is a product itself.
        in part productContextImpl : SystemContext {
            doc /* The white box product context whose building blocks are developed by sub-projects. */
        }
        in requirement systemRequirementSpecification : ExtendedRequirement {
            doc /* The system requirements of the project, from which the handover requirements of the sub-projects are derived. */
        }
        out occurrence subProjects [1..*] : Project :> outputs {
            doc /* The sub-projects, one for each building block that is developed separately. */
        }
        out abstract connection requirementFlowDowns [*] : DerivationConnections::Derivation {
            doc /* The derivations from the requirements of the project to the handover requirements of the sub-projects. */
        }
        in item productArchitecture : ProductArchitecture :> inputs {
            doc /* The product architecture as product. */
            :>> productContextImpl = ModelSubProjects::productContextImpl;
        }
        in item systemSpecification : SystemSpecification :> inputs {
            doc /* The system specification as product. */
            :>> systemRequirementSpecification = ModelSubProjects::systemRequirementSpecification;
        }
        out item requirementFlowDown : RequirementFlowDown :> outputs {
            doc /* The requirement flow-downs to the sub-projects as product. */
            :>> requirementFlowDowns = ModelSubProjects::requirementFlowDowns;
        }
    }

    action def IntegrateSubProjects :> MBSEMethodology::Method {
        doc
        /* Integrates the products of the sub-projects into the white box product context: the parent project binds each building block in its productContextImpl to the white box product system of the sub-project that developed it; if a sub-project delivers only a black box, e.g., a supplier, the building block keeps the type of the handover context. The integrated product system can be the system of interest of the verification context. Optional; performed when the product architectures of the sub-projects are available. Refines the ISO 15288 Integration process. */
        in occurrence subProjects [1..*] : Project :> inputs {
            doc /* The sub-projects whose products are integrated. */
        }
        inout part productContextImpl : SystemContext {
            doc /* The white box product context of the project, whose building blocks are bound to the product systems of the sub-projects. */
        }
        inout item productArchitecture : ProductArchitecture :> inputs, outputs {
            doc /* The product architecture as product, updated with the integrated product systems of the sub-projects. */
            :>> productContextImpl = IntegrateSubProjects::productContextImpl;
        }
    }

    action def SpecifyVerificationContext :> MBSEMethodology::Method {
        doc
        /* Specifies the verification context returned by SpecifySystem: adds the test systems, e.g., test benches or a wind tunnel, as additional actors, and the system of interest, which can be any system, e.g., the product system, a prototype, or a simulation model. Refines the ISO 15288 Verification and Validation processes. */
        in requirement systemRequirementSpecification : ExtendedRequirement {
            doc /* The system requirements that the verification cases verify. */
        }
        inout part verificationContext : SystemContext {
            doc /* The verification context, completed with the test systems and the system of interest. */
        }
        in item systemSpecification : SystemSpecification :> inputs {
            doc /* The system specification as product. */
            :>> systemRequirementSpecification = SpecifyVerificationContext::systemRequirementSpecification;
        }
        inout item verificationSpecification : VerificationSpecification :> inputs, outputs {
            doc /* The verification context as product, completed by the step. */
            :>> verificationContext = SpecifyVerificationContext::verificationContext;
        }
    }

    action def PerformVerification :> MBSEMethodology::Method {
        doc
        /* Performs the verification: executes the verification cases of the verification context on its system of interest and documents the results in verification reports (VerificationReport, content aligned with ISO/IEC/IEEE 15289), which become part of the verification context. Refines the ISO 15288 Verification process. */
        in part verificationContext : SystemContext {
            doc /* The verification context with the verification cases and the system of interest. */
        }
        out item verificationReports[*] : VerificationReport :> outputs {
            doc /* The verification reports with the results of the verification cases. */
        }
        in item verificationSpecification : VerificationSpecification :> inputs {
            doc /* The verification context as product. */
            :>> verificationContext = PerformVerification::verificationContext;
        }
    }

    action def SpecifyTradeStudy :> MBSEMethodology::Method {
        doc
        /* Specifies a SYSMOD trade study for an architecture decision, e.g., between candidate system ideas or candidate product architectures: models the alternatives as variants of the respective context of the project, which becomes a variation usage (e.g., productContextImpl), assesses each alternative against the system objectives (criteria weighted by their priority), selects the alternative with the maximum evaluation, binds the variation to the selected variant, and records the decision on the variation with Rationale metadata whose explanation is the trade study. It takes the open context as decisionContext and returns the decided variation as decidedContext. Mandatory system requirements, if already defined, exclude ineligible alternatives. Optional and without succession: performed whenever a step faces an architecture decision with alternatives. Refines the ISO 15288 Decision Management and System Analysis processes. */
        in concern systemObjectives : SystemObjective {
            doc /* The system objectives, the criteria of the trade study. */
        }
        in requirement systemRequirementSpecification [0..1] : ExtendedRequirement {
            doc /* The system requirements, if already defined. Mandatory requirements exclude ineligible alternatives. */
        }
        in part decisionContext : SystemContext {
            doc /* The project context of the open architecture decision as it is before the trade study, e.g., productContextImpl.
                   It provides the base context, e.g., the white box specification context, that the alternatives specialize. */
        }
        out part decidedContext : SystemContext {
            doc /* The same project context after the decision: a variation usage whose variants are the alternatives, bound to the
                   selected variant (e.g., variation part :>> productContextImpl ... = <variation>::<selected variant>), with
                   Rationale metadata whose explanation is the trade study. It replaces the decisionContext in the project. */
        }
        out analysis tradeStudies [1..*] : SYSMODTradeStudy {
            doc /* The trade studies of the decision. */
        }
        in item systemObjectivesModel : SystemObjectivesModel :> inputs {
            doc /* The system objectives as product. */
            :>> systemObjectives = SpecifyTradeStudy::systemObjectives;
        }
        in item systemSpecification [0..1] : SystemSpecification :> inputs {
            doc /* The system specification as product, if already defined. */
            :>> systemRequirementSpecification = SpecifyTradeStudy::systemRequirementSpecification;
        }
        in item decisionSituation : DecisionSituation :> inputs {
            doc /* The open architecture decision as product. */
            :>> decisionContext = SpecifyTradeStudy::decisionContext;
        }
        out item tradeStudyReport : TradeStudyReport :> outputs {
            doc /* The decision as product: the trade studies and the decided context. */
            :>> tradeStudies = SpecifyTradeStudy::tradeStudies;
            :>> decidedContext = SpecifyTradeStudy::decidedContext;
        }
    }

    //
    // Input artifacts for the methodology steps
    //
    item def ProjectDescription :> MBSEMethodology::Product {
        doc
        /* The basic information to set up a project: its purpose, its scope, and the name of the project owner, given by a human or an AI assistant. */
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
            doc /* Shows the purpose of the project as text. */
            expose projectPurpose;
            render SYSMODViews::asText;
        }
        view projectScopeView :> productViews {
            doc /* Shows the scope of the project as text. */
            expose projectScope;
            render SYSMODViews::asText;
        }
        view projectCoverView :> productViews {
            doc /* Shows the purpose, the project owner, and the scope of the project. */
            view purpose :> projectPurposeView;
            view owner :> projectOwnerView;
            view scope :> projectScopeView;
        }
        view projectOwnerView :> productViews {
            doc /* Shows the name of the project owner as text. */
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
    // Products of the methodology steps
    //
    package Products {
        doc
        /* The products that the SYSMOD steps produce and need (outputs and inputs, MBSEMethodology::Product). A product is a
         * work product of the project model: it refers to the Project features it consists of, e.g., ProblemStatementModel to
         * Project::problemStatement. The step binds these references to its parameters, so the products show which model
         * elements a step reads and creates; the output of one step is the input of others, e.g., the SystemSpecification of
         * SpecifySystem is an input of ModelSolutionArchitecture.
         * A product specializes the product of ISO15288Processes::Products if it is a kind of it, e.g., SystemSpecification
         * is a kind of SystemRequirements; this corresponds to the #refinement of the ISO 15288 processes by the SYSMOD steps.
         * Further products of SYSMOD are the informal input artifacts above (e.g., ProjectDescription), the Project itself
         * (e.g., the subProjects of ModelSubProjects), and the VerificationReport.
         */

        item def ProjectCover :> MBSEMethodology::Product {
            doc /* The project cover: the project owner, the purpose, and the scope of the project. Output of SetupProject. */
            ref part projectOwner : ExtendedStakeholder {
                doc /* The project owner (Project::projectOwner). */
            }
            attribute purpose : ScalarValues::String {
                doc /* The purpose of the project (Project::purpose). */
            }
            attribute scope : ScalarValues::String {
                doc /* The scope of the project (Project::scope). */
            }
        }
        item def BrownfieldSystemModel :> MBSEMethodology::Product {
            doc /* The model of the existing (brownfield) system and its actors. Output of ModelBrownfieldSystem. */
            ref part brownfieldContext : SystemContext {
                doc /* The black box brownfield context (Project::brownfieldContext). */
            }
            ref part brownfieldContextImpl : SystemContext {
                doc /* The white box brownfield context (Project::brownfieldContextImpl). */
            }
        }
        item def ProblemStatementModel :> ISO15288Processes::Products::ProblemOrOpportunityStatement {
            doc /* The problem statement: a solution-free elevator pitch of the problem. Output of DescribeProblemStatement. */
            ref concern problemStatement : ExtendedConcern {
                doc /* The problem statement (Project::problemStatement). */
            }
        }
        item def StakeholderModel :> ISO15288Processes::Products::MajorStakeholderIdentification {
            doc /* The stakeholders of the project with their risk, effort, and categories. Output of IdentifyStakeholders. */
            ref part projectStakeholders[*] : ExtendedStakeholder {
                doc /* The stakeholders of the project (Project::projectStakeholders). */
            }
        }
        item def StakeholderNeedsModel :> ISO15288Processes::Products::StakeholderNeeds {
            doc /* The needs of the stakeholders, traced to the stakeholders they come from. Output of IdentifyStakeholderNeeds. */
            ref concern stakeholderNeeds : ExtendedConcern {
                doc /* The stakeholder needs (Project::stakeholderNeeds). */
            }
        }
        item def SystemIdeaModel :> MBSEMethodology::Product {
            doc /* The system idea: a conceptual outline of the new or changed system. Output of DescribeSystemIdea. */
            ref part systemIdeaContext : SystemContext {
                doc /* The black box system idea context (Project::systemIdeaContext). */
            }
            ref part systemIdeaContextImpl : SystemContext {
                doc /* The white box system idea context (Project::systemIdeaContextImpl). */
            }
        }
        item def SystemObjectivesModel :> MBSEMethodology::Product {
            doc /* The system objectives with their measures of effectiveness and measures of performance. Output of DefineSystemObjectives. */
            ref concern systemObjectives : SystemObjective {
                doc /* The system objectives (Project::systemObjectives). */
            }
        }
        item def SystemSpecification :> ISO15288Processes::Products::SystemRequirements {
            doc /* The system specification: the specification contexts with the system use cases, and the system requirements. Output of SpecifySystem. */
            ref part specificationContext : SystemContext {
                doc /* The black box specification context with the system use cases (Project::specificationContext). */
            }
            ref part specificationContextImpl : SystemContext {
                doc /* The white box specification context (Project::specificationContextImpl). */
            }
            ref requirement systemRequirementSpecification : ExtendedRequirement {
                doc /* The system requirements (Project::systemRequirementSpecification). */
            }
        }
        item def VerificationSpecification :> ISO15288Processes::Products::VerificationProcedures {
            doc /* The verification context with the verification cases, the test systems, and the system of interest.
                 * Output of SpecifySystem, completed by SpecifyVerificationContext. */
            ref part verificationContext : SystemContext {
                doc /* The verification context (Project::verificationContext). */
            }
        }
        item def FunctionalArchitecture :> ISO15288Processes::Products::ArchitectureDescription {
            doc /* The functional architecture. Output of ModelSolutionArchitecture (modelFunctionalArchitecture). */
            ref part functionalContext : SystemContext {
                doc /* The black box functional context (Project::functionalContext). */
            }
            ref part functionalContextImpl : SystemContext {
                doc /* The white box functional context (Project::functionalContextImpl). */
            }
        }
        item def LogicalArchitecture :> ISO15288Processes::Products::ArchitectureDescription {
            doc /* The logical architecture with the allocations from the functional architecture. Output of ModelSolutionArchitecture (modelLogicalArchitecture). */
            ref part logicalContext : SystemContext {
                doc /* The black box logical context (Project::logicalContext). */
            }
            ref part logicalContextImpl : SystemContext {
                doc /* The white box logical context (Project::logicalContextImpl). */
            }
            abstract ref allocation functional2logical[0..1] {
                doc /* The allocation from the black box functional to the black box logical context (Project::functional2logical). */
            }
            abstract ref allocation functionalImpl2logicalImpl[0..1] {
                doc /* The allocation from the white box functional to the white box logical context (Project::functionalImpl2logicalImpl). */
            }
        }
        item def ProductArchitecture :> ISO15288Processes::Products::ArchitectureDescription {
            doc /* The product architecture with the allocations from the logical architecture. Output of ModelSolutionArchitecture
                 * (modelProductArchitecture), updated by IntegrateSubProjects. */
            ref part productContext : SystemContext {
                doc /* The black box product context (Project::productContext). */
            }
            ref part productContextImpl : SystemContext {
                doc /* The white box product context (Project::productContextImpl). */
            }
            abstract ref allocation logical2product[0..1] {
                doc /* The allocation from the black box logical to the black box product context (Project::logical2product). */
            }
            abstract ref allocation logicalImpl2productImpl[0..1] {
                doc /* The allocation from the white box logical to the white box product context (Project::logicalImpl2productImpl). */
            }
        }
        item def RequirementFlowDown :> ISO15288Processes::Products::SystemElementRequirements {
            doc /* The derivations of the handover requirements of the sub-projects from the requirements of the project. Output of ModelSubProjects. */
            abstract ref connection requirementFlowDowns[*] : DerivationConnections::Derivation {
                doc /* The requirement flow-downs (Project::requirementFlowDowns). */
            }
        }
        item def DecisionSituation :> ISO15288Processes::Products::DecisionSituation {
            doc /* An open architecture decision with alternatives: the project context of the decision before the trade study. Input of SpecifyTradeStudy. */
            ref part decisionContext : SystemContext {
                doc /* The project context of the open decision, e.g., Project::productContextImpl. */
            }
        }
        item def TradeStudyReport :> ISO15288Processes::Products::DecisionReport {
            doc /* The decision: the trade studies and the decided project context. Output of SpecifyTradeStudy. */
            ref analysis tradeStudies[*] : SYSMODTradeStudy {
                doc /* The trade studies of the decision (Project::tradeStudies). */
            }
            ref part decidedContext : SystemContext {
                doc /* The project context after the decision, bound to the selected variant. */
            }
        }
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
    #refinement dependency DefineSystemObjectives to ISO15288Processes::BusinessOrMissionAnalysis;
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
    enum def StepStatusKind {
        doc /* The status of a SYSMOD step in a project. */
        enum open { doc /* The step has not been started. */ }
        enum inProgress { doc /* The step has been started and is not finished. */ }
        enum done { doc /* The step is finished. */ }
        enum skipped { doc /* The step is not performed in the project, e.g., ModelBrownfieldSystem in a greenfield project. */ }
    }
    attribute def Percentage :> ScalarValues::Real {
        doc /* A fraction between 0.0 (0 %) and 1.0 (100 %). */
        assert constraint { that >= 0.0 and that <= 1.0 }
    }
    metadata def StepStatus {
        doc /* The status and progress of a SYSMOD step (an action usage) in a project, e.g., for the SYSMOD Map. */
        attribute status : StepStatusKind default StepStatusKind::open {
            doc /* The status of the step. */
        }
        attribute percentage : Percentage default = 0.0 as Percentage {
            doc /* The progress of the step. */
        }
        :> annotatedElement : SysML::ActionUsage;
    }        
}