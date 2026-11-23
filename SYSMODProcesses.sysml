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
     * | 4     | model    | Structure: contexts, parts, connections, allocations, and refinements                          | Does the result connect to other model elements as structure?              | ModelBrownfieldSystem, modelSpecificationContext, ModelSolutionArchitecture, modelFunctionalArchitecture, modelLogicalArchitecture, modelProductArchitecture, ModelSubProject |
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


    occurrence def SYSMODEnvironment :> MBSEMethodology::MBSEEnvironment {
        doc
        /* The MBSE environment of a project that uses SYSMOD as its methodology. It provides the roles of the SYSMOD
         * methodology (see SYSMODMethodology) and connects them to it. A project environment specializes it and
         * adds its tools, further roles, and the project as the root product. */
        part projectManager : Roles::ProjectManager :> roles {
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
        part testEngineer : Roles::TestEngineer :> roles {
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
        part projectManager : Roles::ProjectManager :> roles {
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
        part testEngineer : Roles::TestEngineer :> roles {
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

    action def SYSMODDefaultProcess :> MBSEMethodology::Process {
        doc
        /*
            * The default SYSMOD process: setupProject, modelBrownfieldSystem, describeProblemStatement, identifyStakeholders,
            * identifyStakeholderNeeds, describeSystemIdea, defineSystemObjectives, specifySystem, modelSolutionArchitecture (with the nested steps
            * modelFunctionalArchitecture, modelLogicalArchitecture, and modelProductArchitecture), modelSubProject, integrateSubProjects,
            * specifyVerificationContext, and performVerification, in this order. Between modelSubProject and integrateSubProjects, each
            * sub-project performs its own process. specifyTradeStudy has no succession: it is performed for any architecture decision
            * with alternatives.
            * Verification is split into two parts: specifySystem specifies the verification cases against the black box specification system
            * (nested step specifyVerificationCases) before any solution architecture is modeled and returns the verification context with them,
            * and specifyVerificationContext completes the verification context with the test systems and the system of interest, which can be
            * any system, e.g., the product system, a prototype, or a simulation model. Verification engineers thus take part from the specification on.
            * The project that performs the process is referenced by thisProject. The project manager is the primary performer,
            * and the other roles are additional performers. Each step has a responsible role (responsibleFor), supporting roles
            * (supports), and owners of its output products (productOwnership), derived from the ISO/IEC/IEEE 15288 processes
            * that the step refines, e.g., the requirements engineer is responsible for SpecifySystem (System Requirements Definition)
            * and owns the SystemSpecification. Outputs of the steps flow into the corresponding project features,
            * and the inputs of the steps are bound to the project features created by earlier steps.
            * The input parameters are the information a human or an AI assistant provides to start the process, e.g., the descriptions of
            * the architectures; they flow into the inputs of the steps. */
        
        ref occurrence thisProject : SYSMOD::Project :> outputs :>> this {
            doc /* The project that performs the process. The outputs of the steps flow into its features. */
        }

        ref part projectManager : Roles::ProjectManager :>> primaryPerformer {
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
        ref part testEngineer : Roles::TestEngineer :> additionalPerformers {
            doc /* The test engineer, an additional performer of the process (Verification). */
        }
        ref part validationEngineer : ISO15288Processes::Stakeholders::ValidationEngineer :> additionalPerformers {
            doc /* The validation engineer, an additional performer of the process (Validation). */
        }

        in item projectDescription : Products::ProjectDescription :> inputs {
            doc
            /* The project description is a brief overview of the project. */
        }
        in item brownfieldArchitectureDescription : Products::ArchitectureDescription :> inputs{
            doc
            /* The brownfield architecture is a description of the existing system. */
        }
        in item problemStatementDescription : Products::ProblemStatementDescription :> inputs {
            doc
            /* The problem statement description is a brief description of the problem the system of interest is intended to solve. */
        }
        in item stakeholdersDescription : Products::StakeholdersDescription :> inputs {
            doc
            /* An informal description of the stakeholders, given by a human or an AI assistant as input to the process step. */
        }
        in item stakeholderNeedsDescription : Products::StakeholderNeedsDescription :> inputs {
            doc
            /* An informal description of the stakeholder needs, given by a human or an AI assistant as input to the process step. */
        }
        in item systemIdeaArchitectureDescription : Products::ArchitectureDescription :> inputs {
            doc
            /* The system idea architecture is a description of the proposed system. */
        }
        in item systemObjectivesDescription : Products::SystemObjectivesDescription :> inputs {
            doc
            /* An informal description of the system objectives, given by a human or an AI assistant as input to the process step. */
        }
        in item specificationArchitectureDescription : Products::ArchitectureDescription :> inputs {
            doc
            /* The architecture description that the specification contexts refine. */
        }
        in item useCaseDescriptions : Products::SystemUseCasesDescription :> inputs {
            doc
            /* The system use case descriptions are informal descriptions of the system use cases, given by a human or an AI assistant as input to the process step. */
        }
        in item systemRequirementsDescription : Products::SystemRequirementsDescription :> inputs {
            doc
            /* The system requirements description that the system specification refines. */
        }
        in item verificationArchitectureDescription : Products::ArchitectureDescription :> inputs {
            doc
            /* The architecture description that the verification cases refine. */
        }
        in item functionalArchitectureDescription : Products::ArchitectureDescription :> inputs {
            doc
            /* The functional architecture is a description of the functions and functional blocks of the solution system. */
        }
        in item logicalArchitectureDescription : Products::ArchitectureDescription :> inputs {
            doc
            /* The logical architecture is a description of the technology-independent building blocks of the solution system. */
        }
        in item productArchitectureDescription : Products::ArchitectureDescription :> inputs {
            doc
            /* The product architecture is a description of the concrete, physical or deployable building blocks of the solution system. */
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
        first [0..1]modelSolutionArchitecture then [0..1]modelSubProject;
        first [0..1]modelSubProject then [0..1]integrateSubProjects;
        first [0..1]integrateSubProjects then [0..1]specifyVerificationContext;
        first [0..1]specifyVerificationContext then [0..1]performVerification;
        first [0..1]performVerification then done;

        // Flows for information coming from the outside or created by steps for project features.
        // A fork distributes the output product of a step to the steps that need it (out_<product>_<Step>) and
        // extracts the model elements that flow into the project features.

        // Project
        bind projectDescription = setupProject.projectDescription;
        flow from setupProject.projectProduct to forkProjectProduct.in_projectProduct;
        fork forkProjectProduct {
            in item in_projectProduct : Products::Project;
            out item out_projectOwnerProduct : Products::ProjectOwner = in_projectProduct.projectOwner;
        }

        // Brownfield System
        bind brownfieldArchitectureDescription = modelBrownfieldSystem.brownfieldArchitectureDescription;
        flow from modelBrownfieldSystem.brownfieldSystem to forkBrownfieldSystemProduct.in_brownfieldSystemProduct;
        fork forkBrownfieldSystemProduct {
            in item in_brownfieldSystemProduct : Products::BrownfieldSystem;
            out item out_brownfieldSystemProduct : Products::BrownfieldSystem = in_brownfieldSystemProduct;
            out part brownfieldContext : SYSMOD::SystemContext = in_brownfieldSystemProduct.brownfieldBlackBoxContext;
            out part brownfieldContextImpl : SYSMOD::SystemContext = in_brownfieldSystemProduct.brownfieldWhiteBoxContext;
        }
        flow from forkBrownfieldSystemProduct.brownfieldContext to thisProject.brownfieldContext;
        flow from forkBrownfieldSystemProduct.brownfieldContextImpl to thisProject.brownfieldContextImpl;

        // Problem Statement
        bind problemStatementDescription = describeProblemStatement.problemStatementDescription;
        flow from forkBrownfieldSystemProduct.out_brownfieldSystemProduct to describeProblemStatement.brownfieldSystem;
        flow from forkProjectProduct.out_projectOwnerProduct to describeProblemStatement.projectOwner;
        flow from describeProblemStatement.problemStatement to forkProblemStatement.in_problemStatementProduct;
        fork forkProblemStatement {
            in item in_problemStatementProduct : Products::ProblemStatement;
            out item out_problemStatementProduct_IdentifyStakeholders : Products::ProblemStatement = in_problemStatementProduct;
            out item out_problemStatementProduct_IdentifyStakeholderNeeds : Products::ProblemStatement = in_problemStatementProduct;
            out item out_problemStatementProduct_DescribeSystemIdea : Products::ProblemStatement = in_problemStatementProduct;
            out item out_problemStatementProduct_ModelSubProject : Products::ProblemStatement = in_problemStatementProduct;
            out concern problemStatement : SYSMOD::ExtendedConcern = in_problemStatementProduct.problemStatement;
        }
        flow from forkProblemStatement.problemStatement to thisProject.problemStatement;

        // Identify Stakeholders
        bind stakeholdersDescription = identifyStakeholders.stakeholdersDescription;
        flow from forkProblemStatement.out_problemStatementProduct_IdentifyStakeholders to identifyStakeholders.problemStatement;
        flow from identifyStakeholders.stakeholderList to forkIdentifyStakeholders.in_identifyStakeholdersProduct;
        fork forkIdentifyStakeholders {
            in item in_identifyStakeholdersProduct : Products::StakeholderList;
            out item out_identifyStakeholdersProduct : Products::StakeholderList = in_identifyStakeholdersProduct;
            out part projectStakeholders[1..*] : SYSMOD::ExtendedStakeholder = in_identifyStakeholdersProduct.projectStakeholders;
        }
        flow from forkIdentifyStakeholders.projectStakeholders to thisProject.projectStakeholders;

        // Identify Stakeholder Needs
        bind stakeholderNeedsDescription = identifyStakeholderNeeds.stakeholderNeedsDescription;
        flow from forkProblemStatement.out_problemStatementProduct_IdentifyStakeholderNeeds to identifyStakeholderNeeds.problemStatement;
        flow from forkIdentifyStakeholders.out_identifyStakeholdersProduct to identifyStakeholderNeeds.stakeholderList;
        flow from identifyStakeholderNeeds.stakeholderNeeds to forkIdentifyStakeholderNeeds.in_identifyStakeholderNeedsProduct;
        fork forkIdentifyStakeholderNeeds {
            in item in_identifyStakeholderNeedsProduct : Products::StakeholderNeeds;
            out item out_identifyStakeholderNeedsProduct_DescribeSystemIdea : Products::StakeholderNeeds = in_identifyStakeholderNeedsProduct;
            out item out_identifyStakeholderNeedsProduct_DefineSystemObjectives : Products::StakeholderNeeds = in_identifyStakeholderNeedsProduct;
            out item out_identifyStakeholderNeedsProduct_SpecifySystem : Products::StakeholderNeeds = in_identifyStakeholderNeedsProduct;
            out concern stakeholderNeeds : SYSMOD::ExtendedConcern = in_identifyStakeholderNeedsProduct.stakeholderNeeds;
        }
        flow from forkIdentifyStakeholderNeeds.stakeholderNeeds to thisProject.stakeholderNeeds;

        // System Idea
        bind systemIdeaArchitectureDescription = describeSystemIdea.systemIdeaArchitectureDescription;
        flow from forkProblemStatement.out_problemStatementProduct_DescribeSystemIdea to describeSystemIdea.problemStatement;
        flow from forkIdentifyStakeholderNeeds.out_identifyStakeholderNeedsProduct_DescribeSystemIdea to describeSystemIdea.stakeholderNeeds;
        flow from describeSystemIdea.systemIdea to forkDescribeSystemIdea.in_systemIdeaProduct;
        fork forkDescribeSystemIdea {
            in item in_systemIdeaProduct : Products::SystemIdeaSystem;
            out item out_systemIdeaProduct_DefineSystemObjectives : Products::SystemIdeaSystem = in_systemIdeaProduct;
            out item out_systemIdeaProduct_SpecifySystem : Products::SystemIdeaSystem = in_systemIdeaProduct;
            out part systemIdeaContext : SYSMOD::SystemContext = in_systemIdeaProduct.systemIdeaContext;
            out part systemIdeaContextImpl : SYSMOD::SystemContext = in_systemIdeaProduct.systemIdeaContextImpl;
        }
        flow from forkDescribeSystemIdea.systemIdeaContext to thisProject.systemIdeaContext;
        flow from forkDescribeSystemIdea.systemIdeaContextImpl to thisProject.systemIdeaContextImpl;

        // System Objectives
        bind systemObjectivesDescription = defineSystemObjectives.systemObjectivesDescription;
        flow from forkIdentifyStakeholderNeeds.out_identifyStakeholderNeedsProduct_DefineSystemObjectives to defineSystemObjectives.stakeholderNeeds;
        flow from forkDescribeSystemIdea.out_systemIdeaProduct_DefineSystemObjectives to defineSystemObjectives.systemIdea;
        flow from defineSystemObjectives.systemObjectives to forkDefineSystemObjectives.in_systemObjectivesProduct;
        fork forkDefineSystemObjectives {
            in item in_systemObjectivesProduct : Products::SystemObjectives;
            out item out_systemObjectivesProduct_SpecifySystem : Products::SystemObjectives = in_systemObjectivesProduct;
            out item out_systemObjectivesProduct_SpecifyTradeStudy : Products::SystemObjectives = in_systemObjectivesProduct;
            out concern systemObjectives : SYSMOD::SystemObjective = in_systemObjectivesProduct.systemObjectives;
        }
        flow from forkDefineSystemObjectives.systemObjectives to thisProject.systemObjectives;

        // Specify System
        bind specificationArchitectureDescription = specifySystem.specificationArchitectureDescription;
        bind useCaseDescriptions = specifySystem.useCaseDescriptions;
        bind systemRequirementsDescription = specifySystem.systemRequirementsDescription;
        bind verificationArchitectureDescription = specifySystem.verificationArchitectureDescription;
        flow from forkDescribeSystemIdea.out_systemIdeaProduct_SpecifySystem to specifySystem.systemIdea;
        flow from forkIdentifyStakeholderNeeds.out_identifyStakeholderNeedsProduct_SpecifySystem to specifySystem.stakeholderNeeds;
        flow from forkDefineSystemObjectives.out_systemObjectivesProduct_SpecifySystem to specifySystem.systemObjectives;
        flow from specifySystem.systemSpecification to forkSpecifySystem.in_systemSpecificationProduct;
        fork forkSpecifySystem {
            in item in_systemSpecificationProduct : Products::SystemSpecification;
            out item out_systemSpecificationProduct_ModelSolutionArchitecture : Products::SystemSpecification = in_systemSpecificationProduct;
            out item out_systemSpecificationProduct_ModelSubProject : Products::SystemSpecification = in_systemSpecificationProduct;
            out item out_systemSpecificationProduct_SpecifyVerificationContext : Products::SystemSpecification = in_systemSpecificationProduct;
            out item out_systemRequirementsProduct_SpecifyTradeStudy : Products::SystemRequirements = in_systemSpecificationProduct.systemRequirements;
            out part specificationContext : SYSMOD::SystemContext = in_systemSpecificationProduct.specificationSystem.specificationContext;
            out part specificationContextImpl : SYSMOD::SystemContext = in_systemSpecificationProduct.specificationSystem.specificationContextImpl;
            out requirement systemRequirementSpecification : SYSMOD::ExtendedRequirement = in_systemSpecificationProduct.systemRequirements.systemRequirementSpecification;
        }
        flow from forkSpecifySystem.specificationContext to thisProject.specificationContext;
        flow from forkSpecifySystem.specificationContextImpl to thisProject.specificationContextImpl;
        flow from forkSpecifySystem.systemRequirementSpecification to thisProject.systemRequirementSpecification;
        flow from specifySystem.verificationSpecification to forkSpecifyVerificationCases.in_verificationSpecificationProduct;
        fork forkSpecifyVerificationCases {
            in item in_verificationSpecificationProduct : Products::VerificationSpecification;
            out item out_verificationSpecificationProduct_ModelSubProject : Products::VerificationSpecification = in_verificationSpecificationProduct;
            out item out_verificationSpecificationProduct_SpecifyVerificationContext : Products::VerificationSpecification = in_verificationSpecificationProduct;
        }

        // Model Solution Architecture
        bind functionalArchitectureDescription = modelSolutionArchitecture.functionalArchitectureDescription;
        bind logicalArchitectureDescription = modelSolutionArchitecture.logicalArchitectureDescription;
        bind productArchitectureDescription = modelSolutionArchitecture.productArchitectureDescription;
        flow from forkSpecifySystem.out_systemSpecificationProduct_ModelSolutionArchitecture to modelSolutionArchitecture.systemSpecification;
        flow from modelSolutionArchitecture.functionalArchitecture to forkFunctionalArchitecture.in_functionalArchitectureProduct;
        fork forkFunctionalArchitecture {
            in item in_functionalArchitectureProduct : Products::FunctionalArchitecture;
            out part functionalContext : SYSMOD::SystemContext = in_functionalArchitectureProduct.functionalContext;
            out part functionalContextImpl : SYSMOD::SystemContext = in_functionalArchitectureProduct.functionalContextImpl;
        }
        flow from forkFunctionalArchitecture.functionalContext to thisProject.functionalContext;
        flow from forkFunctionalArchitecture.functionalContextImpl to thisProject.functionalContextImpl;
        flow from modelSolutionArchitecture.logicalArchitecture to forkLogicalArchitecture.in_logicalArchitectureProduct;
        fork forkLogicalArchitecture {
            in item in_logicalArchitectureProduct : Products::LogicalArchitecture;
            out part logicalContext : SYSMOD::SystemContext = in_logicalArchitectureProduct.logicalContext;
            out part logicalContextImpl : SYSMOD::SystemContext = in_logicalArchitectureProduct.logicalContextImpl;
            out ref functional2logical[0..1] : Allocations::Allocation = in_logicalArchitectureProduct.functional2logical;
            out ref functionalImpl2logicalImpl[0..1] : Allocations::Allocation = in_logicalArchitectureProduct.functionalImpl2logicalImpl;
        }
        flow from forkLogicalArchitecture.logicalContext to thisProject.logicalContext;
        flow from forkLogicalArchitecture.logicalContextImpl to thisProject.logicalContextImpl;
        flow from forkLogicalArchitecture.functional2logical to thisProject.functional2logical;
        flow from forkLogicalArchitecture.functionalImpl2logicalImpl to thisProject.functionalImpl2logicalImpl;
        flow from modelSolutionArchitecture.productArchitecture to forkProductArchitecture.in_productArchitectureProduct;
        fork forkProductArchitecture {
            in item in_productArchitectureProduct : Products::ProductArchitecture;
            out item out_productArchitectureProduct_ModelSubProject : Products::ProductArchitecture = in_productArchitectureProduct;
            out item out_productArchitectureProduct_IntegrateSubProjects : Products::ProductArchitecture = in_productArchitectureProduct;
            out part productContext : SYSMOD::SystemContext = in_productArchitectureProduct.productContext;
            out part productContextImpl : SYSMOD::SystemContext = in_productArchitectureProduct.productContextImpl;
            out ref logical2product[0..1] : Allocations::Allocation = in_productArchitectureProduct.logical2product;
            out ref logicalImpl2productImpl[0..1] : Allocations::Allocation = in_productArchitectureProduct.logicalImpl2productImpl;
        }
        flow from forkProductArchitecture.productContext to thisProject.productContext;
        flow from forkProductArchitecture.productContextImpl to thisProject.productContextImpl;
        flow from forkProductArchitecture.logical2product to thisProject.logical2product;
        flow from forkProductArchitecture.logicalImpl2productImpl to thisProject.logicalImpl2productImpl;

        // Sub-Projects
        flow from forkProblemStatement.out_problemStatementProduct_ModelSubProject to modelSubProject.problemStatement;
        flow from forkSpecifySystem.out_systemSpecificationProduct_ModelSubProject to modelSubProject.systemSpecification;
        flow from forkSpecifyVerificationCases.out_verificationSpecificationProduct_ModelSubProject to modelSubProject.verificationSpecification;
        flow from forkProductArchitecture.out_productArchitectureProduct_ModelSubProject to modelSubProject.productArchitecture;
        flow from modelSubProject.subProject to forkModelSubProject.in_subProject;
        fork forkModelSubProject {
            in occurrence in_subProject : SYSMOD::Project;
            out occurrence out_subProject_IntegrateSubProjects : SYSMOD::Project = in_subProject;
            out occurrence subProject : SYSMOD::Project = in_subProject;
        }
        flow from forkModelSubProject.subProject to thisProject.subProjects;
        flow from modelSubProject.requirementFlowDown.requirementFlowDowns to thisProject.requirementFlowDowns;

        // Integrate Sub-Projects: updates the white box product context with the product systems of the sub-projects
        flow from forkModelSubProject.out_subProject_IntegrateSubProjects to integrateSubProjects.subProjects;
        flow from forkProductArchitecture.out_productArchitectureProduct_IntegrateSubProjects to integrateSubProjects.productArchitecture;
        flow from integrateSubProjects.productArchitecture.productContextImpl to thisProject.productContextImpl;

        // Specify Verification Context
        flow from forkSpecifySystem.out_systemSpecificationProduct_SpecifyVerificationContext to specifyVerificationContext.systemSpecification;
        flow from forkSpecifyVerificationCases.out_verificationSpecificationProduct_SpecifyVerificationContext to specifyVerificationContext.verificationSpecification;
        flow from specifyVerificationContext.verificationSpecification to forkSpecifyVerificationContext.in_verificationSpecificationProduct;
        fork forkSpecifyVerificationContext {
            in item in_verificationSpecificationProduct : Products::VerificationSpecification;
            out item out_verificationSpecificationProduct_PerformVerification : Products::VerificationSpecification = in_verificationSpecificationProduct;
            out part verificationContext : SYSMOD::SystemContext = in_verificationSpecificationProduct.verificationContext;
        }
        flow from forkSpecifyVerificationContext.verificationContext to thisProject.verificationContext;

        // Perform Verification
        flow from forkSpecifyVerificationContext.out_verificationSpecificationProduct_PerformVerification to performVerification.verificationSpecification;
        flow from performVerification.verificationReports to thisProject.verificationContext.verificationReports;

        // Specify Trade Study: the decision context comes from the step that faces the architecture decision.
        flow from forkDefineSystemObjectives.out_systemObjectivesProduct_SpecifyTradeStudy to specifyTradeStudy.systemObjectives;
        flow from forkSpecifySystem.out_systemRequirementsProduct_SpecifyTradeStudy to specifyTradeStudy.systemRequirementSpecification;
        flow from specifyTradeStudy.tradeStudies to thisProject.tradeStudies;

        // Steps with their responsible (primary performer) and supporting roles (additional performers), and the owners
        // of the products of the steps. The roles follow the ISO/IEC/IEEE 15288 processes that the steps refine.
        connection :> responsibleFor connect projectManager to setupProject;
        connection :> productOwnership connect projectManager to setupProject.projectProduct;
        action setupProject : Methods::SetupProject :> submethods { @StepStatus; }
        bind setupProject.productManager = productManager;

        connection :> responsibleFor connect systemArchitect to modelBrownfieldSystem;
        connection :> supports connect productManager to modelBrownfieldSystem;
        connection :> productOwnership connect systemArchitect to modelBrownfieldSystem.brownfieldSystem;
        action modelBrownfieldSystem : Methods::ModelBrownfieldSystem :> submethods { @StepStatus; }
        bind modelBrownfieldSystem.productManager = productManager;

        connection :> responsibleFor connect productManager to describeProblemStatement;
        connection :> supports connect requirementsEngineer to describeProblemStatement;
        connection :> productOwnership connect productManager to describeProblemStatement.problemStatement;
        action describeProblemStatement : Methods::DescribeProblemStatement :> submethods { @StepStatus; }
        bind describeProblemStatement.requirementsEngineer = requirementsEngineer;

        connection :> responsibleFor connect requirementsEngineer to identifyStakeholders;
        connection :> supports connect productManager to identifyStakeholders;
        connection :> productOwnership connect requirementsEngineer to identifyStakeholders.stakeholderList;
        action identifyStakeholders : Methods::IdentifyStakeholders :> submethods { @StepStatus; }
        bind identifyStakeholders.productManager = productManager;

        connection :> responsibleFor connect requirementsEngineer to identifyStakeholderNeeds;
        connection :> supports connect productManager to identifyStakeholderNeeds;
        connection :> productOwnership connect requirementsEngineer to identifyStakeholderNeeds.stakeholderNeeds;
        action identifyStakeholderNeeds : Methods::IdentifyStakeholderNeeds :> submethods { @StepStatus; }
        bind identifyStakeholderNeeds.productManager = productManager;

        connection :> responsibleFor connect productManager to describeSystemIdea;
        connection :> supports connect systemArchitect to describeSystemIdea;
        connection :> productOwnership connect productManager to describeSystemIdea.systemIdea;
        action describeSystemIdea : Methods::DescribeSystemIdea :> submethods { @StepStatus; }
        bind describeSystemIdea.systemArchitect = systemArchitect;

        connection :> responsibleFor connect productManager to defineSystemObjectives;
        connection :> supports connect systemArchitect to defineSystemObjectives;
        connection :> supports connect validationEngineer to defineSystemObjectives;
        connection :> productOwnership connect productManager to defineSystemObjectives.systemObjectives;
        action defineSystemObjectives : Methods::DefineSystemObjectives :> submethods { @StepStatus; }
        bind defineSystemObjectives.systemArchitect = systemArchitect;
        bind defineSystemObjectives.validationEngineer = validationEngineer;

        connection :> responsibleFor connect requirementsEngineer to specifySystem;
        connection :> supports connect systemArchitect to specifySystem;
        connection :> supports connect verificationEngineer to specifySystem;
        connection :> productOwnership connect requirementsEngineer to specifySystem.systemSpecification;
        connection :> productOwnership connect verificationEngineer to specifySystem.verificationSpecification;
        action specifySystem : Methods::SpecifySystem :> submethods { @StepStatus; }
        bind specifySystem.verificationEngineer = verificationEngineer;
        bind specifySystem.systemArchitect = systemArchitect;

        connection :> responsibleFor connect systemArchitect to modelSolutionArchitecture;
        connection :> supports connect designEngineer to modelSolutionArchitecture;
        connection :> productOwnership connect systemArchitect to modelSolutionArchitecture.functionalArchitecture;
        connection :> productOwnership connect systemArchitect to modelSolutionArchitecture.logicalArchitecture;
        connection :> productOwnership connect systemArchitect to modelSolutionArchitecture.productArchitecture;
        action modelSolutionArchitecture : Methods::ModelSolutionArchitecture :> submethods { @StepStatus; }
        bind modelSolutionArchitecture.designEngineer = designEngineer;

        connection :> responsibleFor connect systemArchitect to modelSubProject;
        connection :> supports connect projectManager to modelSubProject;
        connection :> supports connect requirementsEngineer to modelSubProject;
        connection :> productOwnership connect projectManager to modelSubProject.subProject;
        connection :> productOwnership connect systemArchitect to modelSubProject.requirementFlowDown;
        action modelSubProject : Methods::ModelSubProject :> submethods { @StepStatus; }
        bind modelSubProject.projectManager = projectManager;
        bind modelSubProject.requirementsEngineer = requirementsEngineer;

        connection :> responsibleFor connect systemArchitect to integrateSubProjects;
        connection :> supports connect integrationEngineer to integrateSubProjects;
        connection :> productOwnership connect systemArchitect to integrateSubProjects.productArchitecture;
        action integrateSubProjects : Methods::IntegrateSubProjects :> submethods { @StepStatus; }
        bind integrateSubProjects.integrationEngineer = integrationEngineer;

        connection :> responsibleFor connect verificationEngineer to specifyVerificationContext;
        connection :> supports connect systemArchitect to specifyVerificationContext;
        connection :> supports connect testEngineer to specifyVerificationContext;
        connection :> supports connect validationEngineer to specifyVerificationContext;
        connection :> productOwnership connect verificationEngineer to specifyVerificationContext.verificationSpecification;
        action specifyVerificationContext : Methods::SpecifyVerificationContext :> submethods { @StepStatus; }
        bind specifyVerificationContext.systemArchitect = systemArchitect;
        bind specifyVerificationContext.testEngineer = testEngineer;
        bind specifyVerificationContext.validationEngineer = validationEngineer;

        connection :> responsibleFor connect testEngineer to performVerification;
        connection :> supports connect verificationEngineer to performVerification;
        connection :> productOwnership connect testEngineer to performVerification.verificationReports;
        action performVerification : Methods::PerformVerification :> submethods { @StepStatus; }
        bind performVerification.verificationEngineer = verificationEngineer;

        // No succession: performed for any architecture decision with alternatives.
        connection :> responsibleFor connect systemArchitect to specifyTradeStudy;
        connection :> supports connect systemAnalyst to specifyTradeStudy;
        connection :> productOwnership connect systemArchitect to specifyTradeStudy.tradeStudyReport;
        action specifyTradeStudy : Methods::SpecifyTradeStudy [0..*] :> submethods { @StepStatus; }
        bind specifyTradeStudy.systemAnalyst = systemAnalyst;
    }

    package Roles {
        doc /* The roles defined in the SYSMOD methodology. */

        part def ProjectManager :> ISO15288Processes::Stakeholders::ProjectManager {
            doc
            /* The project manager who is responsible for the overall project planning, execution, and delivery. A sub role of the ProjectManager
            * defined in the ISO/IEC/IEEE 15288 standard. */
        }

        part def TestEngineer :> ISO15288Processes::Stakeholders::VerificationEngineer {
            doc
            /* A verification engineer who performs the verification: executes the verification cases on the system of interest,
            * e.g., on a test bench, and documents the results in the verification reports. A sub role of the VerificationEngineer
            * derived from the ISO/IEC/IEEE 15288 Verification process: the verification engineer specifies the verification,
            * the test engineer performs it. */
        }
    }
    
    package Methods {
        doc
        /* The methods of the SYSMOD steps (MBSEMethodology::Method): one action definition per step of SYSMODDefaultProcess,
         * e.g., SpecifySystem for the step specifySystem. A method describes how the step is performed: its model elements
         * are the parameters (e.g., the concern problemStatement), and the products that contain them (package Products)
         * subset inputs or outputs and bind their references to these parameters, so the output product of one step is the
         * input product of others. Methods with nested steps (SpecifySystem, ModelSolutionArchitecture) define them as
         * submethods; the primary performer of the step is responsible for them unless a nested responsibleFor connection
         * assigns another role. Each method refines one or more ISO/IEC/IEEE 15288 processes (#refinement dependencies below).
         * Each method types its primary performer (redefinition of primaryPerformer) and names its additional performers
         * (subsets of additionalPerformers); SYSMODDefaultProcess connects its roles to them (responsibleFor, supports, and
         * binds of the additional performers) and assigns the owners of the products.
         */

        action def SetupProject :> MBSEMethodology::Method {
            doc
            /* Sets up a new SYSMOD project: assigns the name of the project owner, the purpose, and the scope of the project. Refines the ISO 15288 Project Planning process. */
            ref occurrence project :>> this : SYSMOD::Project {
                doc /* The project that is set up. */
            }

            in item projectDescription : Products::ProjectDescription :> inputs {
                doc
                /* The project description contains the basic information about the project, including the project owner and the project purpose. */
            }
            out item projectProduct : Products::Project :> outputs {
                doc /* The project cover as product: the project and its project owner. */
            }

            ref part :>> primaryPerformer : Roles::ProjectManager {
                doc /* The primary performer of the setup project action. */
            }

            bind projectProduct.project = project;
            bind projectProduct.projectOwner.projectOwner = project.projectOwner;

            assign project.projectOwner.name := projectDescription.projectOwnerName;
            assign project.purpose := projectDescription.projectPurpose;
            assign project.scope := projectDescription.projectScope;
        }

        action def ModelBrownfieldSystem :> MBSEMethodology::Method {
            doc
            /* Models the existing (brownfield) system and its actors as black box context (brownfieldContext) and white box context (brownfieldContextImpl), based on a given description of the existing architecture. Optional for greenfield projects. Refines the ISO 15288 Business or Mission Analysis process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::SystemArchitect {
                doc /* The system architect, who is responsible for the step. */
            }
            ref part productManager : ISO15288Processes::Stakeholders::ProductManager :> additionalPerformers {
                doc /* The product manager, who knows the existing system and its use. */
            }
            in item brownfieldArchitectureDescription : Products::ArchitectureDescription :> inputs {
                doc /* The informal description of the existing system and its actors, e.g., a text, sketch, or document. */
            }
            out item brownfieldSystem : Products::BrownfieldSystem :> outputs;
        }

        action def DescribeProblemStatement :> MBSEMethodology::Method {
            doc
            /* Describes the problem statement: a solution-free elevator pitch of the problem, with the brownfield system as subject and the project owner as stakeholder. Refines the ISO 15288 Business or Mission Analysis process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::ProductManager {
                doc /* The product manager, who is responsible for the step. */
            }
            ref part requirementsEngineer : ISO15288Processes::Stakeholders::RequirementsEngineer :> additionalPerformers {
                doc /* The requirements engineer, who supports the description of the problem statement. */
            }
            in item problemStatementDescription : Products::ProblemStatementDescription :> inputs {
                doc
                /* The problem statement is a brief description of the problem the system of interest is intended to solve. */
            }
            in item projectOwner : Products::ProjectOwner :> inputs {
                doc /* The project owner, the stakeholder of the problem statement. */
            }
            in item brownfieldSystem[0..1] : Products::BrownfieldSystem :> inputs {
                doc /* The existing system, whose system of interest is the subject of the problem statement. */
            }
            out item problemStatement : Products::ProblemStatement :> outputs {
                doc /* The problem statement as product. */
            }
        }

        action def IdentifyStakeholders :> MBSEMethodology::Method {
            doc
            /* Identifies the stakeholders of the project based on the problem statement and assesses their risk, effort, and categories. Refines the ISO 15288 Business or Mission Analysis process (identification of the major stakeholders) and the Stakeholder Needs and Requirements Definition process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::RequirementsEngineer {
                doc /* The requirements engineer, who is responsible for the step. */
            }
            ref part productManager : ISO15288Processes::Stakeholders::ProductManager :> additionalPerformers {
                doc /* The product manager, who knows the stakeholders of the product. */
            }

            in item stakeholdersDescription : Products::StakeholdersDescription :> inputs {
                doc /* An informal description of the stakeholders, given by a human or an AI assistant as input to the process step. */
            }
            in item problemStatement : Products::ProblemStatement :> inputs {
                doc /* The problem statement whose stakeholders are identified. */
            }
            out item stakeholderList : Products::StakeholderList :> outputs {
                doc /* The stakeholders of the project are individuals and organizations that have an interest in the system. The list includes the project owner retrieved from the problemStatement.*/
            }
        }

        action def IdentifyStakeholderNeeds :> MBSEMethodology::Method {
            doc
            /* Identifies the needs of the stakeholders at intent level, framed by the problem statement and traced to the stakeholders they come from. Refines the ISO 15288 Stakeholder Needs and Requirements Definition process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::RequirementsEngineer {
                doc /* The requirements engineer, who is responsible for the step. */
            }
            ref part productManager : ISO15288Processes::Stakeholders::ProductManager :> additionalPerformers {
                doc /* The product manager, who supports the identification of the stakeholder needs. */
            }
            in item stakeholderNeedsDescription : Products::StakeholderNeedsDescription :> inputs {
                doc /* An informal description of the stakeholder needs, given by a human or an AI assistant as input to the process step. */
            }
            in item problemStatement : Products::ProblemStatement :> inputs {
                doc /* The problem statement that frames the stakeholder needs. */
            }
            in item stakeholderList : Products::StakeholderList :> inputs {
                doc /* The stakeholders whose needs are identified. */
            }
            out item stakeholderNeeds : Products::StakeholderNeeds :> outputs {
                doc /* The stakeholder needs. */
            }
        }

        action def DescribeSystemIdea :> MBSEMethodology::Method {
            doc
            /* Describes the system idea: a conceptual, elevator-pitch-style outline of the new or changed system that answers the problem statement and the stakeholder needs, as black box (systemIdeaContext) and white box (systemIdeaContextImpl) context. Refines the ISO 15288 Business or Mission Analysis process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::ProductManager {
                doc /* The product manager, who is responsible for the step. */
            }
            ref part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> additionalPerformers {
                doc /* The system architect, who supports the system idea with the view of the architecture. */
            }
            in item systemIdeaArchitectureDescription : Products::ArchitectureDescription :> inputs {
                doc /* The informal description of the system idea, e.g., a text, sketch, or document. */
            }
            in item problemStatement : Products::ProblemStatement :> inputs {
                doc /* The problem statement that the system idea answers. */
            }
            in item stakeholderNeeds : Products::StakeholderNeeds :> inputs {
                doc /* The stakeholder needs that the system idea answers. */
            }
            out item systemIdea : Products::SystemIdeaSystem :> outputs {
                doc /* The system idea. */
            }
        }

        action def DefineSystemObjectives :> MBSEMethodology::Method {
            doc
            /* Defines the system objectives: the measurable goals of the system idea, agreed with the project owner. Each objective is a SystemObjective with the system idea as subject, its measures of effectiveness (MOE) and measures of performance (MOP), and their target values. The system objectives frame the stakeholder needs and direct the development: they are the basis for the system requirements, for validation, and for the criteria of trade studies. Refines the ISO 15288 Business or Mission Analysis process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::ProductManager {
                doc /* The product manager, who is responsible for the step. */
            }
            ref part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> additionalPerformers {
                doc /* The system architect, who supports the system objectives with the view of the architecture. */
            }
            ref part validationEngineer : ISO15288Processes::Stakeholders::ValidationEngineer :> additionalPerformers {
                doc /* The validation engineer, who supports the system objectives with the view of validation. */
            }
            in item systemObjectivesDescription : Products::SystemObjectivesDescription :> inputs {
                doc /* The informal description of the system objectives. */
            }
            in item stakeholderNeeds : Products::StakeholderNeeds :> inputs {
                doc /* The stakeholder needs that the system objectives frame. */
            }
            in item systemIdea : Products::SystemIdeaSystem :> inputs {
                doc /* The white box context of the system idea, whose system is the subject of the system objectives. */
            }
            out item systemObjectives : Products::SystemObjectives :> outputs {
                doc /* The system objectives. */
            }
        }

        action def SpecifySystem :> MBSEMethodology::Method {
            doc
            /* Specifies the system based on the system idea, the system objectives, and the stakeholder needs: the specification contexts, the system use cases, the system requirements, and the verification cases that verify them against the black box specification system. Refines the ISO 15288 System Requirements Definition process and the preparation of the ISO 15288 Verification process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::RequirementsEngineer {
                doc /* The requirements engineer, who is responsible for the step. */
            }
            ref part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> additionalPerformers {
                doc /* The system architect, who supports the specification contexts and the system requirements with the view of the architecture. */
            }
            in item specificationArchitectureDescription : Products::ArchitectureDescription :> inputs {
                doc /* The architecture description that the specification contexts refine. */
            }
            in item useCaseDescriptions : Products::SystemUseCasesDescription :> inputs {
                doc /* The system use case descriptions that the system specification refines. */
            }
            in item systemRequirementsDescription : Products::SystemRequirementsDescription :> inputs {
                doc /* The system requirements description that the system specification refines. */
            }
            in item verificationArchitectureDescription : Products::ArchitectureDescription :> inputs {
                doc /* The architecture description that the verification cases refine. */
            }
            in item systemIdea : Products::SystemIdeaSystem :> inputs {
                doc /* The system idea that the specification contexts refine. */
            }
            in item stakeholderNeeds : Products::StakeholderNeeds :> inputs {
                doc /* The stakeholder needs that the system specification addresses. */
            }
            in item systemObjectives : Products::SystemObjectives :> inputs {
                doc /* The system objectives that the system specification addresses. */
            }
            out item systemSpecification : Products::SystemSpecification :> outputs {
                doc /* The system specification as product: the specification contexts with the system use cases, and the system requirements. */
            }
            out item verificationSpecification : Products::VerificationSpecification :> outputs {
                doc /* The verification specification as product: the verification architecture description with the verification cases. */
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

            // Model Specification Context
            bind specificationArchitectureDescription = modelSpecificationContext.specificationArchitectureDescription;
            bind systemIdea = modelSpecificationContext.systemIdea;
            flow from modelSpecificationContext.specificationSystem to forkModelSpecificationContext.in_specificationSystemProduct;
            fork forkModelSpecificationContext {
                in item in_specificationSystemProduct : Products::SpecificationSystem;
                out item out_specificationSystemProduct_identifyUseCases : Products::SpecificationSystem = in_specificationSystemProduct;
                out item out_specificationSystemProduct_specifySystemRequirements : Products::SpecificationSystem = in_specificationSystemProduct;
                out item out_specificationSystemProduct_specifyVerificationCases : Products::SpecificationSystem = in_specificationSystemProduct;
            }
            bind modelSpecificationContext.specificationSystem = SpecifySystem::systemSpecification.specificationSystem;

            // Identify Use Cases
            bind useCaseDescriptions = identifyUseCases.useCaseDescriptions;
            bind stakeholderNeeds = identifyUseCases.stakeholderNeeds;
            flow from forkModelSpecificationContext.out_specificationSystemProduct_identifyUseCases to identifyUseCases.specificationSystem;
            bind identifyUseCases.systemUseCases = SpecifySystem::systemSpecification.systemUseCases;

            // Specify System Requirements
            bind systemRequirementsDescription = specifySystemRequirements.systemRequirementsDescription;
            bind stakeholderNeeds = specifySystemRequirements.stakeholderNeeds;
            bind systemObjectives = specifySystemRequirements.systemObjectives;
            flow from forkModelSpecificationContext.out_specificationSystemProduct_specifySystemRequirements to specifySystemRequirements.specificationSystem;
            bind specifySystemRequirements.systemRequirements = SpecifySystem::systemSpecification.systemRequirements;

            // Specify Verification Cases
            bind verificationArchitectureDescription = specifyVerificationCases.verificationArchitectureDescription;
            flow from forkModelSpecificationContext.out_specificationSystemProduct_specifyVerificationCases to specifyVerificationCases.specificationSystem;
            flow from specifySystemRequirements.systemRequirements to specifyVerificationCases.systemRequirements;
            bind specifyVerificationCases.verificationSpecification = SpecifySystem::verificationSpecification;

            action modelSpecificationContext : MBSEMethodology::Method :> submethods {
                @StepStatus;
                doc
                /* Models the black box and white box specification contexts by refining the system idea contexts: the actors at the system boundary in the black box context, and the subparts or attributes of the system used by use cases and requirements in the white box context. */
                in item specificationArchitectureDescription : Products::ArchitectureDescription :> inputs;
                in item systemIdea : Products::SystemIdeaSystem :> inputs;
                out item specificationSystem : Products::SpecificationSystem :> outputs;               
            }
            action identifyUseCases : MBSEMethodology::Method :> submethods {
                @StepStatus;
                doc
                /* Identifies the system use cases of the specification context that describe how the actors interact with the system. */
                in item useCaseDescriptions : Products::SystemUseCasesDescription :> inputs;
                in item stakeholderNeeds : Products::StakeholderNeeds :> inputs;
                in item specificationSystem : Products::SpecificationSystem :> inputs;
                out item systemUseCases : Products::SystemUseCases :> outputs;
            }
            action specifySystemRequirements : MBSEMethodology::Method :> submethods {
                @StepStatus;
                doc
                /* Specifies the verifiable, solution-neutral system requirements that frame the stakeholder needs. */
                in item systemRequirementsDescription : Products::SystemRequirementsDescription :> inputs;
                in item stakeholderNeeds : Products::StakeholderNeeds :> inputs;
                in item specificationSystem : Products::SpecificationSystem :> inputs;
                in item systemObjectives : Products::SystemObjectives :> inputs;
                out item systemRequirements : Products::SystemRequirements :> outputs;
            }
            action specifyVerificationCases : MBSEMethodology::Method :> submethods {
                @StepStatus;
                doc
                /* Specifies the verification cases of the system requirements against the black box specification system, alongside specifySystemRequirements and before any solution architecture exists: a verification case definition per verification case with the objective (verify) and the verdict (e.g., VerificationCases::PassIf), and a verification case usage in the verification context of the project, typed by the definition and subsetting verificationCases. The step returns the updated verification context. The VerificationEngineer is a stakeholder of this step and specifies the verification cases together with the RequirementsEngineer (concern VerificationCoverage), so that both discuss the verification in SysML rather than in a separate test language. The test systems and the system of interest of the verification context follow in SpecifyVerificationContext. */
                in item verificationArchitectureDescription : Products::ArchitectureDescription :> inputs;
                in item specificationSystem : Products::SpecificationSystem :> inputs;
                in item systemRequirements : Products::SystemRequirements :> inputs;
                out item verificationSpecification : Products::VerificationSpecification :> outputs;
            }
        }

        action def ModelSolutionArchitecture :> MBSEMethodology::Method {
            doc
            /* Models the solution architecture based on the specification contexts and the system requirements, in the nested steps modelFunctionalArchitecture (optional), modelLogicalArchitecture (optional), and modelProductArchitecture (optional), in this order. Each nested step creates the black box and the white box context of its architecture; the logical and product steps also create the allocations from the preceding architecture. Refines the ISO 15288 System Architecture Definition process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::SystemArchitect {
                doc /* The system architect, who is responsible for the step. */
            }
            in item functionalArchitectureDescription[0..1] : Products::ArchitectureDescription :> inputs {
                doc /* The informal description of the functional architecture. */
            }
            in item logicalArchitectureDescription[0..1] : Products::ArchitectureDescription :> inputs {
                doc /* The informal description of the logical architecture. */
            }
            in item productArchitectureDescription[0..1] : Products::ArchitectureDescription :> inputs {
                doc /* The informal description of the product architecture. */
            }
            in item systemSpecification : Products::SystemSpecification :> inputs {
                doc /* The system specification: the specification contexts that the architectures specialize and the system requirements that the elements of the architectures refine. */
            }

            out item functionalArchitecture[0..1] : Products::FunctionalArchitecture :> outputs {
                doc /* The functional architecture. */
            }
            out item logicalArchitecture[0..1] : Products::LogicalArchitecture :> outputs {
                doc /* The logical architecture. */
            }
            out item productArchitecture[0..1] : Products::ProductArchitecture :> outputs {
                doc /* The product architecture. */
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


            // Modeling the functional architecture
            bind functionalArchitectureDescription = modelFunctionalArchitecture.functionalArchitectureDescription;
            bind systemSpecification = modelFunctionalArchitecture.systemSpecification;
            flow from modelFunctionalArchitecture.functionalArchitecture to forkModelFunctionalArchitecture.in_functionalArchitecture;
            fork forkModelFunctionalArchitecture {
                in item in_functionalArchitecture : Products::FunctionalArchitecture;
                out item out_functionalArchitecture_ModelLogicalArchitecture : Products::FunctionalArchitecture = in_functionalArchitecture;
                out item out_functionalArchitecture_ModelProductArchitecture : Products::FunctionalArchitecture = in_functionalArchitecture;
            }
            bind modelFunctionalArchitecture.functionalArchitecture = functionalArchitecture;

            // Modeling the logical architecture
            bind logicalArchitectureDescription = modelLogicalArchitecture.logicalArchitectureDescription;
            bind systemSpecification = modelLogicalArchitecture.systemSpecification;
            flow from forkModelFunctionalArchitecture.out_functionalArchitecture_ModelLogicalArchitecture to modelLogicalArchitecture.functionalArchitecture;
            bind modelLogicalArchitecture.logicalArchitecture = logicalArchitecture;

            // Modeling the product architecture
            bind productArchitectureDescription = modelProductArchitecture.productArchitectureDescription;
            bind systemSpecification = modelProductArchitecture.systemSpecification;
            flow from forkModelFunctionalArchitecture.out_functionalArchitecture_ModelProductArchitecture to modelProductArchitecture.functionalArchitecture;
            flow from modelLogicalArchitecture.logicalArchitecture to modelProductArchitecture.logicalArchitecture;
            bind modelProductArchitecture.productArchitecture = productArchitecture;

            action modelFunctionalArchitecture : MBSEMethodology::Method :> submethods {
                @StepStatus;
                doc
                /* Models the optional functional architecture based on the black box specification context: the black box functional context and the white box functional context with the functional blocks, and the #refinement dependencies from the functional elements to the system requirements they refine. Refines the ISO 15288 System Architecture Definition process. */
                in item functionalArchitectureDescription : Products::ArchitectureDescription :> inputs;
                in item systemSpecification : Products::SystemSpecification :> inputs;
                out item functionalArchitecture : Products::FunctionalArchitecture :> outputs;
            }

            action modelLogicalArchitecture : MBSEMethodology::Method :> submethods {
                @StepStatus;
                doc
                /* Models the optional logical architecture based on the white box specification context and, if present, the white box functional context: the black box logical context and the white box logical context with the technology-independent building blocks, the #refinement dependencies from the logical elements to the system requirements they refine, and, if a functional architecture is present, the allocations functional2logical and functionalImpl2logicalImpl from the functional to the logical architecture. Refines the ISO 15288 System Architecture Definition process. */
                in item logicalArchitectureDescription : Products::ArchitectureDescription :> inputs;
                in item systemSpecification : Products::SystemSpecification :> inputs;
                in item functionalArchitecture[0..1] : Products::FunctionalArchitecture :> inputs;
                out item logicalArchitecture : Products::LogicalArchitecture :> outputs;
            }

            action modelProductArchitecture : MBSEMethodology::Method :> submethods {
                @StepStatus;
                doc
                /* Models the optional product architecture based on the white box specification context and, if present, the white box functional and logical contexts: the black box product context and the white box product context with the concrete, physical or deployable building blocks, and, if a logical architecture is present, the allocations logical2product and logicalImpl2productImpl from the logical to the product architecture. Refines the ISO 15288 System Architecture Definition process. */
                in item productArchitectureDescription : Products::ArchitectureDescription :> inputs;
                in item systemSpecification : Products::SystemSpecification :> inputs;
                in item functionalArchitecture[0..1] : Products::FunctionalArchitecture :> inputs;
                in item logicalArchitecture[0..1] : Products::LogicalArchitecture :> inputs;
                out item productArchitecture : Products::ProductArchitecture :> outputs;
            }
        }

        action def ModelSubProject :> MBSEMethodology::Method {
            doc
            /* Models a sub-project for each building block of the white box product context that is developed separately, e.g., by another team or a supplier, and the sub-project contract: the sub-project usage subsets subProjects; a separate handover package carries the contract: the handover context (the building block as the system of interest, its external entities that are handed over as actors, and its connections and delegations as the actor/system interfaces), whose system of interest definition types the building block, whose other elements the parent white box specializes, and which the sub-project uses as its black box brownfield context, so that the sub-project, e.g., a supplier, needs no access to the parent project; the handover package also contains the stakeholders and the handover requirements of the sub-project, which the parent derives from its requirements that constrain the building block via its requirementFlowDowns; the sub-project derives its system requirements from the handover requirements. Optional; each sub-project then performs its own process. Refines the ISO 15288 System Architecture Definition process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::SystemArchitect {
                doc /* The system architect, who is responsible for the step. */
            }
            ref part projectManager : Roles::ProjectManager :> additionalPerformers {
                doc /* The project manager, who sets up the sub-projects and owns them. */
            }
            ref part requirementsEngineer : ISO15288Processes::Stakeholders::RequirementsEngineer :> additionalPerformers {
                doc /* The requirements engineer, who supports the derivation of the handover requirements. */
            }
            // A project is a product itself.
            in item productArchitecture : Products::ProductArchitecture :> inputs {
                doc /* The product architecture whose white box product context contains the building blocks that are developed by sub-projects. */
            }
            in item problemStatement : Products::ProblemStatement :> inputs {
                doc /* The problem statement of the project, the context for the problem statements of the sub-projects. */
            }
            in item systemSpecification : Products::SystemSpecification :> inputs {
                doc /* The system requirements of the project, from which the handover requirements of the sub-projects are derived. */
            }
            in item verificationSpecification : Products::VerificationSpecification :> inputs {
                doc /* The verification context of the project, the context for the verification of the sub-projects. */
            }
            out occurrence subProject : SYSMOD::Project :> outputs {
                doc /* The sub-project. */
            }
            out item requirementFlowDown : Products::RequirementFlowDown :> outputs {
                doc /* The derivations of the handover requirements of the sub-project from the requirements of the project. */
            }
        }

        action def IntegrateSubProjects :> MBSEMethodology::Method {
            doc
            /* Integrates the products of the sub-projects into the architecture of the project: binds each building block of the white box product context that a sub-project develops to the product system of the sub-project, or keeps the black box of the handover context if the sub-project, e.g., a supplier, delivers no white box. Optional; performed when the product architectures of the sub-projects are available. Outside the verb scale: it combines the products of the sub-projects. Refines the ISO 15288 Integration process. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::SystemArchitect {
                doc /* The system architect, who is responsible for the step. */
            }
            ref part integrationEngineer : ISO15288Processes::Stakeholders::IntegrationEngineer :> additionalPerformers {
                doc /* The integration engineer, who supports the integration of the product systems of the sub-projects. */
            }
            in occurrence subProjects[*] : SYSMOD::Project :> inputs {
                doc /* The sub-projects whose product systems are integrated. */
            }
            inout item productArchitecture : Products::ProductArchitecture :> inputs, outputs {
                doc /* The product architecture, whose white box product context is updated with the integrated product systems. */
            }
        }

        action def SpecifyVerificationContext :> MBSEMethodology::Method {
            doc
            /* Specifies the verification context returned by SpecifySystem: types it by a system context definition whose system of interest is the system under verification, which can be any system, e.g., the integrated product system, a prototype, or a simulation model, and adds the test systems, e.g., test benches or a wind tunnel, as actors. The verification cases of the context, specified in SpecifySystem, are bound to the system under verification and not changed. Refines the ISO 15288 Verification and Validation processes. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::VerificationEngineer {
                doc /* The verification engineer, who is responsible for the step. */
            }
            ref part systemArchitect : ISO15288Processes::Stakeholders::SystemArchitect :> additionalPerformers {
                doc /* The system architect, who supports the verification context with the view of the architecture. */
            }
            ref part testEngineer : Roles::TestEngineer :> additionalPerformers {
                doc /* The test engineer, who supports the verification context with the view of the test systems. */
            }
            ref part validationEngineer : ISO15288Processes::Stakeholders::ValidationEngineer :> additionalPerformers {
                doc /* The validation engineer, who supports the verification context with the view of validation. */
            }
            in item systemSpecification : Products::SystemSpecification :> inputs {
                doc /* The system specification with the system requirements that the verification cases verify. */
            }
            inout item verificationSpecification : Products::VerificationSpecification :> inputs, outputs {
                doc /* The verification context with the verification cases, completed by the step with the test systems and the system of interest. */
            }
        }

        action def PerformVerification :> MBSEMethodology::Method {
            doc
            /* Performs the verification: executes the verification cases of the verification context on its system of interest, e.g., the product system, a prototype, or a simulation model, with the test systems of the context, and documents the results in verification reports (SYSMOD::VerificationReport, content aligned with ISO/IEC/IEEE 15289): the verdict of each verification case, the verified requirements, and the evidence. The verification reports become part of the verification context (Project::verificationContext::verificationReports). The step does not change the verification cases; failed verdicts are fed back to the steps that created the requirements or the system of interest. Outside the verb scale: it executes specified content. Refines the ISO 15288 Verification process. */
            ref part :>> primaryPerformer : Roles::TestEngineer {
                doc /* The test engineer, who is responsible for the step. */
            }
            ref part verificationEngineer : ISO15288Processes::Stakeholders::VerificationEngineer :> additionalPerformers {
                doc /* The verification engineer, who supports the verification and assesses its results. */
            }
            in item verificationSpecification : Products::VerificationSpecification :> inputs {
                doc /* The verification context completed by SpecifyVerificationContext: the verification cases, the test systems, and the system of interest. */
            }
            out item verificationReports[*] : Products::VerificationReport :> outputs {
                doc /* The verification reports with the results of the verification cases. */
            }
        }

        action def SpecifyTradeStudy :> MBSEMethodology::Method {
            doc
            /* Specifies a SYSMOD trade study for an architecture decision, e.g., between candidate system ideas or candidate product architectures: models the alternatives as variants of the respective context of the project, which becomes a variation usage (e.g., productContextImpl), assesses each alternative against the system objectives (criteria weighted by their priority), selects the alternative with the maximum evaluation, binds the variation to the selected variant, and records the decision on the variation with Rationale metadata whose explanation is the trade study. It takes the open context as decisionSituation and returns the decided variation as decidedContext and, with the trade studies, as tradeStudyReport. Mandatory system requirements, if already defined, exclude ineligible alternatives. Optional and without succession: performed whenever a step faces an architecture decision with alternatives. Refines the ISO 15288 Decision Management and System Analysis processes. */
            ref part :>> primaryPerformer : ISO15288Processes::Stakeholders::SystemArchitect {
                doc /* The system architect, who is responsible for the step. */
            }
            ref part systemAnalyst : ISO15288Processes::Stakeholders::SystemAnalyst :> additionalPerformers {
                doc /* The system analyst, who supports the assessment of the alternatives. */
            }
            in item systemObjectives : Products::SystemObjectives :> inputs {
                doc /* The system objectives, the criteria of the trade study. */
            }
            in item systemRequirementSpecification [0..1] : Products::SystemRequirements :> inputs {
                doc /* The system requirements, if already defined. Mandatory requirements exclude ineligible alternatives. */
            }
            in item decisionSituation : Products::DecisionSituation :> inputs {
                doc /* The open architecture decision: the project context as it is before the trade study, e.g., productContextImpl.
                    It provides the base context, e.g., the white box specification context, that the alternatives specialize. */
            }
            out part decidedContext : SYSMOD::SystemContext {
                doc /* The same project context after the decision: a variation usage whose variants are the alternatives, bound to the
                    selected variant. */
            }
            out analysis tradeStudies [1..*] : SYSMOD::SYSMODTradeStudy {
                doc /* The trade studies of the decision. */
            }
            out item tradeStudyReport : Products::TradeStudyReport :> outputs {
                doc /* The decision as product: the trade studies and the decided context. */
            }
            bind tradeStudyReport.decidedContext = decidedContext;
            bind tradeStudyReport.tradeStudies = tradeStudies;
        }
    }

    //
    // Products of the methodology steps
    //
    package Products {
        doc
        /* The products that the SYSMOD steps produce and need (outputs and inputs, MBSEMethodology::Product). A product is a
         * work product of the project model: it refers to the Project features it consists of, e.g., ProblemStatement to
         * Project::problemStatement. The step binds these references to its parameters, so the products show which model
         * elements a step reads and creates; the output of one step is the input of others, e.g., the SystemSpecification of
         * SpecifySystem is an input of ModelSolutionArchitecture.
         * A product specializes the product of ISO15288Processes::Products if it is a kind of it, e.g., SystemSpecification
         * is a kind of SystemRequirements; this corresponds to the #refinement of the ISO 15288 processes by the SYSMOD steps.
         * Further products of SYSMOD are the informal input artifacts above (e.g., ProjectDescription), the Project itself
         * (e.g., the subProject of ModelSubProject), and the VerificationReport.
         */

        item def ProjectOwner :> MBSEMethodology::Product {
            doc
            /* The project owner of the project. */ 

            ref part projectOwner : SYSMOD::ExtendedStakeholder :> modelElements;
        }

        item def ProjectDescription :> MBSEMethodology::Product {
            doc
            /* The basic information to set up a project: its purpose, its scope, and the name of the project owner, given by a human or an AI assistant. */
            attribute projectPurpose : ScalarValues::String {
                doc
                /* The project purpose is a brief description of the purpose of the project. */
            }
            attribute projectScope : ScalarValues::String {
                doc
                /* The scope of the project is a brief description of the boundaries and extent of the project. In particular, it describes what is not part of the project but could be considered by stakeholders. */
            }
            attribute projectOwnerName : ScalarValues::String {
                doc
                /* The project owner is the stakeholder who is in charge of the project. */
            }
        }
        item def Project :> MBSEMethodology::Product {
            doc /* The project cover: the project owner, the purpose, and the scope of the project. Output of SetupProject. */
            ref occurrence project : SYSMOD::Project :> modelElements {
                doc /* The project. */
            }

            ref item projectOwner : ProjectOwner {
                doc /* The project owner as product. */
            }
        }

        item def ArchitectureDescription :> MBSEMethodology::Product {
            doc
            /* An informal description of a system architecture, given by a human or an AI assistant as input to a process step, for example, a text, sketch, or document of the existing system. */
        }
        item def BrownfieldSystem :> MBSEMethodology::Product {
            doc /* The model of the existing (brownfield) system and its actors. Output of ModelBrownfieldSystem. */
            ref part brownfieldBlackBoxContext : SYSMOD::SystemContext :> modelElements {
                doc /* The black box brownfield context (Project::brownfieldContext). */
            }
            ref part brownfieldWhiteBoxContext : SYSMOD::SystemContext :> modelElements {
                doc /* The white box brownfield context (Project::brownfieldContextImpl). */
            }
        }

        item def ProblemStatementDescription :> MBSEMethodology::Product {
            doc
            /* A brief description of the problem the system of interest is intended to solve. Can be a text, sketch, or document, for example. */
        }
        item def ProblemStatement :> ISO15288Processes::Products::ProblemOrOpportunityStatement {
            doc /* The problem statement: a solution-free elevator pitch of the problem. Output of DescribeProblemStatement. */
            ref concern problemStatement : SYSMOD::ExtendedConcern :> modelElements;
        }

        item def StakeholdersDescription :> MBSEMethodology::Product {
            doc /* An informal description of the stakeholders, given by a human or an AI assistant as input to a process step, for example, a text, sketch, or document of the existing stakeholders. */
        }
        item def StakeholderList :> ISO15288Processes::Products::MajorStakeholderIdentification {
            doc /* The stakeholders of the project with their risk, effort, and categories. Output of IdentifyStakeholders. */
            ref part projectStakeholders[1..*] : SYSMOD::ExtendedStakeholder :> modelElements {
                doc /* The stakeholders of the project (Project::projectStakeholders). */
            }
        }

        item def StakeholderNeedsDescription :> MBSEMethodology::Product {
            doc /* An informal description of the stakeholder needs, given by a human or an AI assistant as input to a process step, for example, a text, sketch, or document of the existing stakeholder needs. */
        }
        item def StakeholderNeeds :> ISO15288Processes::Products::StakeholderNeeds {
            doc /* The needs of the stakeholders, traced to the stakeholders they come from. Output of IdentifyStakeholderNeeds. */
            ref concern stakeholderNeeds : SYSMOD::ExtendedConcern :> modelElements {
                doc /* The stakeholder needs (Project::stakeholderNeeds). */
            }
        }

        item def SystemIdeaSystem :> MBSEMethodology::Product {
            doc /* The system idea: a conceptual outline of the new or changed system. Output of DescribeSystemIdea. */
            ref part systemIdeaContext : SYSMOD::SystemContext :> modelElements {
                doc /* The black box system idea context (Project::systemIdeaContext). */
            }
            ref part systemIdeaContextImpl : SYSMOD::SystemContext :> modelElements {
                doc /* The white box system idea context (Project::systemIdeaContextImpl). */
            }
        }

        item def SystemObjectivesDescription :> MBSEMethodology::Product {
            doc /* An informal description of the system objectives, given by a human or an AI assistant as input to a process step, for example, a text, sketch, or document of the existing system objectives. */
        }
        item def SystemObjectives :> MBSEMethodology::Product {
            doc /* The system objectives with their measures of effectiveness and measures of performance. Output of DefineSystemObjectives. */
            ref concern systemObjectives : SYSMOD::SystemObjective :> modelElements {
                doc /* The system objectives (Project::systemObjectives). */
            }
        }

        item def SystemSpecification :> ISO15288Processes::Products::SystemRequirements {
            doc /* The system specification: the specification contexts with the system use cases, and the system requirements. Output of SpecifySystem. */
            ref item specificationSystem : SpecificationSystem {
                doc /* The specification contexts. */
            }
            ref item systemRequirements : SystemRequirements {
                doc /* The system requirements. */
            }
            ref item systemUseCases : SystemUseCases {
                doc /* The system use cases. */
            }
        }

        item def SpecificationSystem :> MBSEMethodology::Product {
            doc /* The black box and white box specification contexts. Output of SpecifySystem (modelSpecificationContext). */
            ref part specificationContext : SYSMOD::SystemContext :> modelElements {
                doc /* The black box specification context with the system use cases (Project::specificationContext). */
            }
            ref part specificationContextImpl : SYSMOD::SystemContext :> modelElements {
                doc /* The white box specification context (Project::specificationContextImpl). */
            }
        }

        item def SystemRequirementsDescription :> MBSEMethodology::Product {
            doc /* An informal description of the system requirements, given by a human or an AI assistant as input to SpecifySystem. */
        }
        item def SystemRequirements :> ISO15288Processes::Products::SystemRequirements {
            doc /* The system requirements. Output of SpecifySystem (specifySystemRequirements). */

            ref requirement systemRequirementSpecification : SYSMOD::ExtendedRequirement :> modelElements {
                doc /* The system requirements (Project::systemRequirementSpecification). */
            }
        }

        item def SystemUseCasesDescription :> MBSEMethodology::Product {
            doc /* An informal description of the system use cases, given by a human or an AI assistant as input to SpecifySystem. */
        }
        item def SystemUseCases :> MBSEMethodology::Product {
            doc /* The system use cases. Output of SpecifySystem (identifyUseCases). */

            ref use case systemUseCases[*] : SYSMOD::SystemUseCase :> modelElements {
                doc /* The system use cases. */
            }
        }


        item def VerificationSpecification :> ISO15288Processes::Products::VerificationProcedures {
            doc /* The verification context with the verification cases, the test systems, and the system of interest.
                 * Output of SpecifySystem, completed by SpecifyVerificationContext. */
            ref part verificationContext : SYSMOD::SystemContext :> modelElements {
                doc /* The verification context (Project::verificationContext). */
            }
        }

        item def VerificationReport :> SYSMOD::VerificationReport {
            doc /* The verification report with the results of the verification cases. Output of PerformVerification. */
        }

        abstract item def SolutionArchitecture :> ISO15288Processes::Products::ArchitectureDescription {
            doc /* The solution architecture. Output of ModelSolutionArchitecture (modelSolutionArchitecture). */
        }

        item def FunctionalArchitecture :> SolutionArchitecture {
            doc /* The functional architecture. Output of ModelSolutionArchitecture (modelFunctionalArchitecture). */
            ref part functionalContext : SYSMOD::SystemContext :> modelElements {
                doc /* The black box functional context (Project::functionalContext). */
            }
            ref part functionalContextImpl : SYSMOD::SystemContext :> modelElements {
                doc /* The white box functional context (Project::functionalContextImpl). */
            }
        }
        item def LogicalArchitecture :> SolutionArchitecture {
            doc /* The logical architecture with the allocations from the functional architecture. Output of ModelSolutionArchitecture (modelLogicalArchitecture). */
            ref part logicalContext : SYSMOD::SystemContext :> modelElements {
                doc /* The black box logical context (Project::logicalContext). */
            }
            ref part logicalContextImpl : SYSMOD::SystemContext :> modelElements {
                doc /* The white box logical context (Project::logicalContextImpl). */
            }
            abstract ref allocation functional2logical[0..1] {
                doc /* The allocation from the black box functional to the black box logical context (Project::functional2logical). */
            }
            abstract ref allocation functionalImpl2logicalImpl[0..1] {
                doc /* The allocation from the white box functional to the white box logical context (Project::functionalImpl2logicalImpl). */
            }
        }
        item def ProductArchitecture :> SolutionArchitecture {
            doc /* The product architecture with the allocations from the logical architecture. Output of ModelSolutionArchitecture
                 * (modelProductArchitecture), updated by IntegrateSubProjects. */
            ref part productContext : SYSMOD::SystemContext :> modelElements {
                doc /* The black box product context (Project::productContext). */
            }
            ref part productContextImpl : SYSMOD::SystemContext :> modelElements {
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
            doc /* The derivations of the handover requirements of the sub-projects from the requirements of the project. Output of ModelSubProject. */
            abstract ref connection requirementFlowDowns[*] : DerivationConnections::Derivation :> modelElements {
                doc /* The requirement flow-downs (Project::requirementFlowDowns). */
            }
        }
        item def DecisionSituation :> ISO15288Processes::Products::DecisionSituation {
            doc /* An open architecture decision with alternatives: the project context of the decision before the trade study. Input of SpecifyTradeStudy. */
            ref part decisionContext : SYSMOD::SystemContext :> modelElements {
                doc /* The project context of the open decision, e.g., Project::productContextImpl. */
            }
        }
        item def TradeStudyReport :> ISO15288Processes::Products::DecisionReport {
            doc /* The decision: the trade studies and the decided project context. Output of SpecifyTradeStudy. */
            ref analysis tradeStudies[*] : SYSMOD::SYSMODTradeStudy :> modelElements {
                doc /* The trade studies of the decision (Project::tradeStudies). */
            }
            ref part decidedContext : SYSMOD::SystemContext :> modelElements {
                doc /* The project context after the decision, bound to the selected variant. */
            }
        }
    }

    //
    // Refinement of the ISO 15288 processes by the SYSMOD processes
    //
    private import ModelingMetadata::refinement;
    #refinement dependency Methods::SetupProject to ISO15288Processes::ProjectPlanning;
    #refinement dependency Methods::ModelBrownfieldSystem to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency Methods::DescribeProblemStatement to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency Methods::IdentifyStakeholders to ISO15288Processes::StakeholderNeedsAndRequirementsDefinition;
    #refinement dependency Methods::IdentifyStakeholders to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency Methods::IdentifyStakeholderNeeds to ISO15288Processes::StakeholderNeedsAndRequirementsDefinition;
    #refinement dependency Methods::DescribeSystemIdea to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency Methods::DefineSystemObjectives to ISO15288Processes::BusinessOrMissionAnalysis;
    #refinement dependency Methods::SpecifySystem to ISO15288Processes::SystemRequirementsDefinition;
    #refinement dependency Methods::SpecifySystem to ISO15288Processes::Verification;
    #refinement dependency Methods::ModelSolutionArchitecture to ISO15288Processes::SystemArchitectureDefinition;
    #refinement dependency Methods::ModelSubProject to ISO15288Processes::SystemArchitectureDefinition;
    #refinement dependency Methods::IntegrateSubProjects to ISO15288Processes::Integration;
    #refinement dependency Methods::SpecifyVerificationContext to ISO15288Processes::Verification;
    #refinement dependency Methods::SpecifyVerificationContext to ISO15288Processes::Validation;
    #refinement dependency Methods::PerformVerification to ISO15288Processes::Verification;
    #refinement dependency Methods::SpecifyTradeStudy to ISO15288Processes::DecisionManagement;
    #refinement dependency Methods::SpecifyTradeStudy to ISO15288Processes::SystemAnalysis;

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