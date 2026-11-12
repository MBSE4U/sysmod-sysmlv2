library package ISO15288Processes {
        doc
    /* 
     * ISO/IEC/IEEE 15288 System Life Cycle Processes
     *
     * Version v5.1.8
     *
     * Package containing the 30 system life cycle processes of ISO/IEC/IEEE 15288, grouped into agreement, 
     * organizational project-enabling, technical management, and technical processes.
     *
     * The subpackage Products contains the products that the processes need and produce (inputs and outputs),
     * the subpackages Stakeholders and Concerns contain the stakeholders and their concerns.
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


    private import Products::*;

    //
    // Agreement Processes
    //
    action def Acquisition :> MBSEMethodology::Process {
        doc
        /* The Acquisition process obtains a product or service in accordance with the acquirer's requirements. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item acquisitionNeed : AcquisitionNeed :> inputs;
        in item supplierResponse : SupplierResponse :> inputs;
        in item agreementStatusReport : AgreementStatusReport :> inputs;
        in item deliveredSystem : DeliveredSystem :> inputs;
        out item acquisitionStrategy : AcquisitionStrategy :> outputs;
        out item requestForSupply : RequestForSupply :> outputs;
        out item supplierSelectionReport : SupplierSelectionReport :> outputs;
        out item agreement : Agreement :> outputs;
        out item agreementChangeRequest : AgreementChangeRequest :> outputs;
    }
    action def Supply :> MBSEMethodology::Process {
        doc
        /* The Supply process provides an acquirer with a product or service that meets agreed requirements. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item requestForSupply : RequestForSupply :> inputs;
        in item agreementChangeRequest : AgreementChangeRequest :> inputs;
        in item validatedSystem : ValidatedSystem :> inputs;
        out item supplyStrategy : SupplyStrategy :> outputs;
        out item supplierResponse : SupplierResponse :> outputs;
        out item agreement : Agreement :> outputs;
        out item agreementStatusReport : AgreementStatusReport :> outputs;
        out item deliveredSystem : DeliveredSystem :> outputs;
    }

    //
    // Organizational Project-Enabling Processes
    //
    action def LifeCycleModelManagement :> MBSEMethodology::Process {
        doc
        /* The Life Cycle Model Management process defines, maintains, and assures availability of policies, life cycle processes, life cycle models, and procedures for use by the organization. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item qualityManagementReport : QualityManagementReport :> inputs;
        in item lessonsLearned : LessonsLearned :> inputs;
        out item organizationalPoliciesAndProcedures : OrganizationalPoliciesAndProcedures :> outputs;
        out item lifeCycleModels : LifeCycleModels :> outputs;
        out item processAssessmentReport : ProcessAssessmentReport :> outputs;
    }
    action def InfrastructureManagement :> MBSEMethodology::Process {
        doc
        /* The Infrastructure Management process provides the infrastructure and services to projects to support organization and project objectives throughout the life cycle. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item organizationalPoliciesAndProcedures : OrganizationalPoliciesAndProcedures :> inputs;
        in item projectInfrastructureNeeds : ProjectInfrastructureNeeds :> inputs;
        out item infrastructure : Infrastructure :> outputs;
        out item infrastructureManagementReport : InfrastructureManagementReport :> outputs;
    }
    action def PortfolioManagement :> MBSEMethodology::Process {
        doc
        /* The Portfolio Management process initiates and sustains necessary, sufficient, and suitable projects in order to meet the strategic objectives of the organization. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item agreement : Agreement :> inputs;
        in item projectStatusReport : ProjectStatusReport :> inputs;
        out item projectPortfolio : ProjectPortfolio :> outputs;
        out item projectDirection : ProjectDirection :> outputs;
    }
    action def HumanResourceManagement :> MBSEMethodology::Process {
        doc
        /* The Human Resource Management process provides the organization with necessary human resources and maintains their competencies consistent with business needs. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item projectPortfolio : ProjectPortfolio :> inputs;
        in item projectHumanResourceNeeds : ProjectHumanResourceNeeds :> inputs;
        out item qualifiedPersonnel : QualifiedPersonnel :> outputs;
        out item skillsInventory : SkillsInventory :> outputs;
    }
    action def QualityManagement :> MBSEMethodology::Process {
        doc
        /* The Quality Management process assures that products, services, and implementations of the life cycle processes meet the organization's quality objectives and achieve customer satisfaction. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item qualityAssuranceReport : QualityAssuranceReport :> inputs;
        out item qualityManagementPlan : QualityManagementPlan :> outputs;
        out item qualityManagementReport : QualityManagementReport :> outputs;
    }
    action def KnowledgeManagement :> MBSEMethodology::Process {
        doc
        /* The Knowledge Management process creates the capability and assets that enable the organization to exploit opportunities to re-apply existing knowledge. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item lessonsLearned : LessonsLearned :> inputs;
        out item knowledgeManagementStrategy : KnowledgeManagementStrategy :> outputs;
        out item knowledgeAssets : KnowledgeAssets :> outputs;
    }

    //
    // Technical Management Processes
    //
    action def ProjectPlanning :> MBSEMethodology::Process {
        doc
        /* The Project Planning process produces and coordinates effective and workable plans. */
        in item projectDirection : ProjectDirection :> inputs;
        in item agreement : Agreement :> inputs;
        in item organizationalPoliciesAndProcedures : OrganizationalPoliciesAndProcedures :> inputs;
        in item lifeCycleModels : LifeCycleModels :> inputs;
        in item lifeCycleConcepts : LifeCycleConcepts :> inputs;
        out item projectPlan : ProjectPlan :> outputs;
        out item systemsEngineeringManagementPlan : SystemsEngineeringManagementPlan :> outputs;
        out item workBreakdownStructure : WorkBreakdownStructure :> outputs;
        out item projectInfrastructureNeeds : ProjectInfrastructureNeeds :> outputs;
        out item projectHumanResourceNeeds : ProjectHumanResourceNeeds :> outputs;
    }
    action def ProjectAssessmentAndControl :> MBSEMethodology::Process {
        doc
        /* The Project Assessment and Control process assesses if the plans are aligned and feasible, determines the status of the project, technical, and process performance, and directs execution to help ensure that the performance is according to plans and schedules, within projected budgets, and satisfies technical objectives. */
        in item projectPlan : ProjectPlan :> inputs;
        in item systemsEngineeringManagementPlan : SystemsEngineeringManagementPlan :> inputs;
        in item measurementReport : MeasurementReport :> inputs;
        in item riskReport : RiskReport :> inputs;
        in item qualityAssuranceReport : QualityAssuranceReport :> inputs;
        in item configurationStatusReport : ConfigurationStatusReport :> inputs;
        out item projectStatusReport : ProjectStatusReport :> outputs;
        out item changeRequest : ChangeRequest :> outputs;
        out item lessonsLearned : LessonsLearned :> outputs;
    }
    action def DecisionManagement :> MBSEMethodology::Process {
        doc
        /* The Decision Management process provides a structured, analytical framework for objectively identifying, characterizing, and evaluating a set of alternatives for a decision at any point in the life cycle and selecting the most beneficial course of action. */
        in item decisionSituation : DecisionSituation :> inputs;
        in item projectPlan : ProjectPlan :> inputs;
        in item systemAnalysisReport : SystemAnalysisReport :> inputs;
        out item decisionManagementStrategy : DecisionManagementStrategy :> outputs;
        out item decisionReport : DecisionReport :> outputs;
    }
    action def RiskManagement :> MBSEMethodology::Process {
        doc
        /* The Risk Management process continually identifies, analyzes, treats, and monitors risks. */
        in item projectPlan : ProjectPlan :> inputs;
        in item candidateRisksAndOpportunities : CandidateRisksAndOpportunities :> inputs;
        in item measurementReport : MeasurementReport :> inputs;
        out item riskManagementStrategy : RiskManagementStrategy :> outputs;
        out item riskProfile : RiskProfile :> outputs;
        out item riskReport : RiskReport :> outputs;
    }
    action def ConfigurationManagement :> MBSEMethodology::Process {
        doc
        /* The Configuration Management process manages and controls system elements and configurations over the life cycle. */
        in item projectPlan : ProjectPlan :> inputs;
        in item candidateConfigurationItems : CandidateConfigurationItems :> inputs;
        in item changeRequest : ChangeRequest :> inputs;
        out item configurationManagementStrategy : ConfigurationManagementStrategy :> outputs;
        out item configurationBaselines : ConfigurationBaselines :> outputs;
        out item configurationStatusReport : ConfigurationStatusReport :> outputs;
    }
    action def InformationManagement :> MBSEMethodology::Process {
        doc
        /* The Information Management process generates, obtains, confirms, transforms, retains, retrieves, disseminates, and disposes of information to designated stakeholders. */
        in item projectPlan : ProjectPlan :> inputs;
        in item projectInformation : ProjectInformation :> inputs;
        out item informationManagementStrategy : InformationManagementStrategy :> outputs;
        out item informationRepository : InformationRepository :> outputs;
        out item informationManagementReport : InformationManagementReport :> outputs;
    }
    action def Measurement :> MBSEMethodology::Process {
        doc
        /* The Measurement process collects, analyzes, and reports objective data and information to support effective management and demonstrate the quality of the products, services, and processes. */
        in item projectPlan : ProjectPlan :> inputs;
        in item measurementNeeds : MeasurementNeeds :> inputs;
        in item measuresOfEffectiveness : MeasuresOfEffectiveness :> inputs;
        in item measuresOfPerformance : MeasuresOfPerformance :> inputs;
        in item technicalPerformanceMeasures : TechnicalPerformanceMeasures :> inputs;
        out item measurementStrategy : MeasurementStrategy :> outputs;
        out item measurementData : MeasurementData :> outputs;
        out item measurementReport : MeasurementReport :> outputs;
    }
    action def QualityAssurance :> MBSEMethodology::Process {
        doc
        /* The Quality Assurance process helps ensure the effective application of the organization's Quality Management process to the project. */
        in item qualityManagementPlan : QualityManagementPlan :> inputs;
        in item organizationalPoliciesAndProcedures : OrganizationalPoliciesAndProcedures :> inputs;
        in item projectPlan : ProjectPlan :> inputs;
        out item qualityAssuranceStrategy : QualityAssuranceStrategy :> outputs;
        out item qualityAssuranceReport : QualityAssuranceReport :> outputs;
    }

    //
    // Technical Processes
    //
    action def BusinessOrMissionAnalysis :> MBSEMethodology::Process {
        doc
        /* The Business or Mission Analysis process defines the business or mission problem or opportunity, characterizes the solution space, and determines potential solution class(es) that can address a problem or take advantage of an opportunity. */
        in item organizationStrategicPlan : OrganizationStrategicPlan :> inputs;
        in item projectPortfolio : ProjectPortfolio :> inputs;
        in item acquisitionNeed : AcquisitionNeed :> inputs;
        out item businessOrMissionAnalysisStrategy : BusinessOrMissionAnalysisStrategy :> outputs;
        out item problemOrOpportunityStatement : ProblemOrOpportunityStatement :> outputs;
        out item majorStakeholderIdentification : MajorStakeholderIdentification :> outputs;
        out item preliminaryLifeCycleConcepts : PreliminaryLifeCycleConcepts :> outputs;
        out item businessOrMissionRequirements : BusinessOrMissionRequirements :> outputs;
        out item alternativeSolutionClasses : AlternativeSolutionClasses :> outputs;
    }
    action def StakeholderNeedsAndRequirementsDefinition :> MBSEMethodology::Process {
        doc
        /* The Stakeholder Needs and Requirements Definition process defines the stakeholder requirements for a system that can provide the capabilities needed by users and other stakeholders in a defined environment. */
        in item problemOrOpportunityStatement : ProblemOrOpportunityStatement :> inputs;
        in item majorStakeholderIdentification : MajorStakeholderIdentification :> inputs;
        in item preliminaryLifeCycleConcepts : PreliminaryLifeCycleConcepts :> inputs;
        in item businessOrMissionRequirements : BusinessOrMissionRequirements :> inputs;
        in item alternativeSolutionClasses : AlternativeSolutionClasses :> inputs;
        out item stakeholderNeedsAndRequirementsDefinitionStrategy : StakeholderNeedsAndRequirementsDefinitionStrategy :> outputs;
        out item stakeholderNeeds : StakeholderNeeds :> outputs;
        out item lifeCycleConcepts : LifeCycleConcepts :> outputs;
        out item stakeholderRequirements : StakeholderRequirements :> outputs;
        out item measuresOfEffectiveness : MeasuresOfEffectiveness :> outputs;
        out item validationCriteria : ValidationCriteria :> outputs;
        out item requirementsTraceability : RequirementsTraceability :> outputs;
    }
    action def SystemRequirementsDefinition :> MBSEMethodology::Process {
        doc
        /* The System Requirements Definition process transforms the stakeholder, user-oriented view of desired capabilities into a technical view of a solution that meets the operational needs of the user. */
        in item lifeCycleConcepts : LifeCycleConcepts :> inputs;
        in item stakeholderRequirements : StakeholderRequirements :> inputs;
        in item measuresOfEffectiveness : MeasuresOfEffectiveness :> inputs;
        inout item requirementsTraceability : RequirementsTraceability :> inputs, outputs;
        out item systemRequirementsDefinitionStrategy : SystemRequirementsDefinitionStrategy :> outputs;
        out item systemRequirements : SystemRequirements :> outputs;
        out item systemFunctionDefinition : SystemFunctionDefinition :> outputs;
        out item measuresOfPerformance : MeasuresOfPerformance :> outputs;
        out item technicalPerformanceMeasures : TechnicalPerformanceMeasures :> outputs;
        out item verificationCriteria : VerificationCriteria :> outputs;
    }
    action def SystemArchitectureDefinition :> MBSEMethodology::Process {
        doc
        /* The System Architecture Definition process generates system architecture alternatives, selects one or more alternatives that address stakeholder concerns and system requirements, and expresses this in consistent views and models. */
        in item lifeCycleConcepts : LifeCycleConcepts :> inputs;
        in item stakeholderRequirements : StakeholderRequirements :> inputs;
        in item systemRequirements : SystemRequirements :> inputs;
        in item systemFunctionDefinition : SystemFunctionDefinition :> inputs;
        in item measuresOfPerformance : MeasuresOfPerformance :> inputs;
        in item systemAnalysisReport : SystemAnalysisReport :> inputs;
        in item decisionReport : DecisionReport :> inputs;
        out item systemArchitectureDefinitionStrategy : SystemArchitectureDefinitionStrategy :> outputs;
        out item candidateArchitectures : CandidateArchitectures :> outputs;
        out item architectureDescription : ArchitectureDescription :> outputs;
        out item systemElementRequirements : SystemElementRequirements :> outputs;
        out item interfaceDefinition : InterfaceDefinition :> outputs;
        out item requirementsTraceability : RequirementsTraceability :> outputs;
    }
    action def DesignDefinition :> MBSEMethodology::Process {
        doc
        /* The Design Definition process provides sufficient detailed data and information about the system and its elements to enable the implementation consistent with the architectural entities as defined in the models and views of the system architecture. */
        in item architectureDescription : ArchitectureDescription :> inputs;
        in item systemElementRequirements : SystemElementRequirements :> inputs;
        inout item interfaceDefinition : InterfaceDefinition :> inputs, outputs;
        in item systemAnalysisReport : SystemAnalysisReport :> inputs;
        out item designDefinitionStrategy : DesignDefinitionStrategy :> outputs;
        out item designDescription : DesignDescription :> outputs;
        out item requirementsTraceability : RequirementsTraceability :> outputs;
    }
    action def SystemAnalysis :> MBSEMethodology::Process {
        doc
        /* The System Analysis process provides a rigorous basis of data and information for technical understanding to aid decision-making across the life cycle. */
        in item systemAnalysisSituation : SystemAnalysisSituation :> inputs;
        in item systemRequirements : SystemRequirements :> inputs;
        in item candidateArchitectures : CandidateArchitectures :> inputs;
        in item designDescription : DesignDescription :> inputs;
        out item systemAnalysisStrategy : SystemAnalysisStrategy :> outputs;
        out item systemAnalysisReport : SystemAnalysisReport :> outputs;
    }
    action def Implementation :> MBSEMethodology::Process {
        doc
        /* The Implementation process realizes a specified system element. */
        in item designDescription : DesignDescription :> inputs;
        in item systemElementRequirements : SystemElementRequirements :> inputs;
        in item interfaceDefinition : InterfaceDefinition :> inputs;
        out item implementationStrategy : ImplementationStrategy :> outputs;
        out item implementedSystemElements : ImplementedSystemElements :> outputs;
        out item implementationReport : ImplementationReport :> outputs;
    }
    action def Integration :> MBSEMethodology::Process {
        doc
        /* The Integration process synthesizes a set of system elements into a realized system that satisfies the system requirements, architecture, and design. */
        in item architectureDescription : ArchitectureDescription :> inputs;
        in item interfaceDefinition : InterfaceDefinition :> inputs;
        in item implementedSystemElements : ImplementedSystemElements :> inputs;
        out item integrationStrategy : IntegrationStrategy :> outputs;
        out item integratedSystem : IntegratedSystem :> outputs;
        out item integrationReport : IntegrationReport :> outputs;
    }
    action def Verification :> MBSEMethodology::Process {
        doc
        /* The Verification process provides objective evidence that a system or system element fulfills its specified requirements and characteristics. */
        in item systemRequirements : SystemRequirements :> inputs;
        in item systemElementRequirements : SystemElementRequirements :> inputs;
        in item verificationCriteria : VerificationCriteria :> inputs;
        in item implementedSystemElements : ImplementedSystemElements :> inputs;
        in item integratedSystem : IntegratedSystem :> inputs;
        out item verificationStrategy : VerificationStrategy :> outputs;
        out item verificationProcedures : VerificationProcedures :> outputs;
        out item verificationReport : VerificationReport :> outputs;
        out item verifiedSystem : VerifiedSystem :> outputs;
    }
    action def Transition :> MBSEMethodology::Process {
        doc
        /* The Transition process establishes a capability for a system to provide services specified by stakeholder requirements in the operational environment. */
        in item agreement : Agreement :> inputs;
        in item lifeCycleConcepts : LifeCycleConcepts :> inputs;
        in item verifiedSystem : VerifiedSystem :> inputs;
        out item transitionStrategy : TransitionStrategy :> outputs;
        out item installedSystem : InstalledSystem :> outputs;
        out item transitionReport : TransitionReport :> outputs;
    }
    action def Validation :> MBSEMethodology::Process {
        doc
        /* The Validation process provides objective evidence that the system, when in use, fulfills its business or mission objectives and stakeholder requirements, achieving its intended use in its intended operational environment. */
        in item stakeholderRequirements : StakeholderRequirements :> inputs;
        in item lifeCycleConcepts : LifeCycleConcepts :> inputs;
        in item validationCriteria : ValidationCriteria :> inputs;
        in item installedSystem : InstalledSystem :> inputs;
        out item validationStrategy : ValidationStrategy :> outputs;
        out item validationProcedures : ValidationProcedures :> outputs;
        out item validationReport : ValidationReport :> outputs;
        out item validatedSystem : ValidatedSystem :> outputs;
    }
    action def Operation :> MBSEMethodology::Process {
        doc
        /* The Operation process uses the system to deliver its services. */
        in item lifeCycleConcepts : LifeCycleConcepts :> inputs;
        in item qualifiedPersonnel : QualifiedPersonnel :> inputs;
        in item validatedSystem : ValidatedSystem :> inputs;
        out item operationStrategy : OperationStrategy :> outputs;
        out item operationReport : OperationReport :> outputs;
    }
    action def Maintenance :> MBSEMethodology::Process {
        doc
        /* The Maintenance process sustains the capability of the system to provide a service. */
        in item lifeCycleConcepts : LifeCycleConcepts :> inputs;
        in item validatedSystem : ValidatedSystem :> inputs;
        in item operationReport : OperationReport :> inputs;
        out item maintenanceStrategy : MaintenanceStrategy :> outputs;
        out item maintenanceReport : MaintenanceReport :> outputs;
        out item changeRequest : ChangeRequest :> outputs;
    }
    action def Disposal :> MBSEMethodology::Process {
        doc
        /* The Disposal process ends the existence of a system element or system for a specified intended use, appropriately handling replaced or retired elements. */
        in item lifeCycleConcepts : LifeCycleConcepts :> inputs;
        in item validatedSystem : ValidatedSystem :> inputs;
        in item maintenanceReport : MaintenanceReport :> inputs;
        out item disposalStrategy : DisposalStrategy :> outputs;
        out item disposalReport : DisposalReport :> outputs;
    }

    package Products {
        doc /* The products (work products, information items, and system states) that the life cycle processes
             * need and produce. The inputs and outputs of the processes follow the input-process-output (IPO) diagrams
             * of the INCOSE Systems Engineering Handbook, which elaborates ISO/IEC/IEEE 15288; the standard itself
             * specifies the purpose, the outcomes, and the activities and tasks of each process.
             * The products and the IPO assignment are modeled after the handbook (v5), but not yet checked line by line
             * against the IPO diagrams of a specific handbook edition.
             * The output of one process is the input of others, e.g., the StakeholderRequirements of
             * Stakeholder Needs and Requirements Definition are an input of System Requirements Definition.
             */

        // Agreement and organizational products
        item def OrganizationStrategicPlan :> MBSEMethodology::Product {
            doc /* The strategy, objectives, and business plans of the organization that direct its projects and enabling services. */
        }
        item def AcquisitionNeed :> MBSEMethodology::Product {
            doc /* The need of the acquirer for a product or service that is obtained from a supplier. */
        }
        item def AcquisitionStrategy :> MBSEMethodology::Product {
            doc /* How the acquirer obtains the product or service, e.g., the type of agreement, the selection of suppliers, and the acceptance. */
        }
        item def RequestForSupply :> MBSEMethodology::Product {
            doc /* The request of the acquirer to candidate suppliers to provide a product or service, e.g., a request for proposal. */
        }
        item def SupplierResponse :> MBSEMethodology::Product {
            doc /* The response of a supplier to a request for supply, e.g., a proposal or a bid. */
        }
        item def SupplierSelectionReport :> MBSEMethodology::Product {
            doc /* The evaluation of the supplier responses and the selected supplier with the rationale. */
        }
        item def Agreement :> MBSEMethodology::Product {
            doc /* The agreement between acquirer and supplier: the product or service, the deliverables, the acceptance criteria, schedule, and payment. */
        }
        item def AgreementChangeRequest :> MBSEMethodology::Product {
            doc /* A request to change the agreement, e.g., its scope, schedule, or acceptance criteria. */
        }
        item def AgreementStatusReport :> MBSEMethodology::Product {
            doc /* The status of the execution of the agreement, e.g., progress, deviations, and delivered items. */
        }
        item def SupplyStrategy :> MBSEMethodology::Product {
            doc /* How the supplier provides the product or service according to the agreement. */
        }
        item def DeliveredSystem :> MBSEMethodology::Product {
            doc /* The product or service that the supplier delivers to the acquirer according to the agreement. */
        }
        item def OrganizationalPoliciesAndProcedures :> MBSEMethodology::Product {
            doc /* The policies, the life cycle processes, and the procedures of the organization for use by its projects. */
        }
        item def LifeCycleModels :> MBSEMethodology::Product {
            doc /* The life cycle models of the organization, i.e., stages, their purpose and outcomes, and the decision gates, from which projects tailor their life cycle. */
        }
        item def ProcessAssessmentReport :> MBSEMethodology::Product {
            doc /* The assessment of the life cycle processes and models of the organization with the improvement actions. */
        }
        item def Infrastructure :> MBSEMethodology::Product {
            doc /* The facilities, tools, communication, and information technology assets that the organization provides to its projects. */
        }
        item def InfrastructureManagementReport :> MBSEMethodology::Product {
            doc /* The status of the infrastructure and of the infrastructure needs of the projects. */
        }
        item def ProjectPortfolio :> MBSEMethodology::Product {
            doc /* The set of projects of the organization with their priorities, resources, and status. */
        }
        item def ProjectDirection :> MBSEMethodology::Product {
            doc /* The authorization and direction of a project by the organization, e.g., its initiation, continuation, redirection, or termination, with its objectives and resources. */
        }
        item def QualifiedPersonnel :> MBSEMethodology::Product {
            doc /* The people with the competencies that the projects need. */
        }
        item def SkillsInventory :> MBSEMethodology::Product {
            doc /* The skills and competencies available in the organization and the needs for training and recruitment. */
        }
        item def QualityManagementPlan :> MBSEMethodology::Product {
            doc /* The quality management policies, objectives, and procedures of the organization. */
        }
        item def QualityManagementReport :> MBSEMethodology::Product {
            doc /* The evaluation of the quality management results, e.g., customer satisfaction, with the corrective and preventive actions. */
        }
        item def LessonsLearned :> MBSEMethodology::Product {
            doc /* Experience gained in a project that is worth reapplying, e.g., successful practices and problems to avoid. */
        }
        item def KnowledgeManagementStrategy :> MBSEMethodology::Product {
            doc /* How the organization identifies, captures, maintains, and shares its knowledge, skills, and knowledge assets. */
        }
        item def KnowledgeAssets :> MBSEMethodology::Product {
            doc /* The reusable knowledge of the organization, e.g., lessons learned, patterns, reference architectures, and reusable models. */
        }

        // Project management products
        item def ProjectPlan :> MBSEMethodology::Product {
            doc /* The plan of the project: objectives, scope, life cycle, activities, schedule, resources, budget, and responsibilities. */
        }
        item def SystemsEngineeringManagementPlan :> MBSEMethodology::Product {
            doc /* The plan of the technical activities of the project and their integration (SEMP). */
        }
        item def WorkBreakdownStructure :> MBSEMethodology::Product {
            doc /* The hierarchical decomposition of the work of the project into work packages. */
        }
        item def ProjectInfrastructureNeeds :> MBSEMethodology::Product {
            doc /* The facilities, tools, and services the project needs from the organization. */
        }
        item def ProjectHumanResourceNeeds :> MBSEMethodology::Product {
            doc /* The people and competencies the project needs from the organization. */
        }
        item def ProjectStatusReport :> MBSEMethodology::Product {
            doc /* The status of the project, the technical, and the process performance compared to the plans. */
        }
        item def ChangeRequest :> MBSEMethodology::Product {
            doc /* A request to change a baselined item, e.g., a requirement, the architecture, a design, or a plan. */
        }
        item def DecisionSituation :> MBSEMethodology::Product {
            doc /* A problem or opportunity that requires a decision between alternatives, raised by any process. */
        }
        item def DecisionManagementStrategy :> MBSEMethodology::Product {
            doc /* How decisions are made, e.g., the decision roles, the criteria, and the analysis methods. */
        }
        item def DecisionReport :> MBSEMethodology::Product {
            doc /* The decision with the alternatives considered, the evaluation, the selected course of action, and the rationale. */
        }
        item def CandidateRisksAndOpportunities :> MBSEMethodology::Product {
            doc /* Risks and opportunities raised by any process of the project. */
        }
        item def RiskManagementStrategy :> MBSEMethodology::Product {
            doc /* How risks are identified, analyzed, treated, and monitored, e.g., the risk categories and thresholds. */
        }
        item def RiskProfile :> MBSEMethodology::Product {
            doc /* The current risks with their likelihood, consequences, priority, and treatment. */
        }
        item def RiskReport :> MBSEMethodology::Product {
            doc /* The status of the risks and of their treatment for the decision makers. */
        }
        item def CandidateConfigurationItems :> MBSEMethodology::Product {
            doc /* The work products and system elements that are to be placed under configuration management. */
        }
        item def ConfigurationManagementStrategy :> MBSEMethodology::Product {
            doc /* How configuration items are identified, baselined, changed, and audited. */
        }
        item def ConfigurationBaselines :> MBSEMethodology::Product {
            doc /* The approved configurations of the configuration items, which are changed only by approved change requests. */
        }
        item def ConfigurationStatusReport :> MBSEMethodology::Product {
            doc /* The status of the configuration items, the baselines, and the change requests. */
        }
        item def ProjectInformation :> MBSEMethodology::Product {
            doc /* The information items that the processes of the project generate and use. */
        }
        item def InformationManagementStrategy :> MBSEMethodology::Product {
            doc /* How information is generated, stored, protected, disseminated, and disposed of. */
        }
        item def InformationRepository :> MBSEMethodology::Product {
            doc /* The managed information of the project, accessible to the designated stakeholders. */
        }
        item def InformationManagementReport :> MBSEMethodology::Product {
            doc /* The status of the information management, e.g., availability and access of information items. */
        }
        item def MeasurementNeeds :> MBSEMethodology::Product {
            doc /* The information needs of the organization and the project that measurement satisfies. */
        }
        item def MeasurementStrategy :> MBSEMethodology::Product {
            doc /* Which measures are collected, analyzed, and reported, how and when. */
        }
        item def MeasurementData :> MBSEMethodology::Product {
            doc /* The collected and validated measurement data. */
        }
        item def MeasurementReport :> MBSEMethodology::Product {
            doc /* The analyzed measurement results and the derived information for the decision makers. */
        }
        item def QualityAssuranceStrategy :> MBSEMethodology::Product {
            doc /* How the project ensures that the quality management of the organization is applied, e.g., evaluations and audits. */
        }
        item def QualityAssuranceReport :> MBSEMethodology::Product {
            doc /* The results of the quality assurance evaluations of products and processes, with the problems and their resolution. */
        }

        // Technical products
        item def BusinessOrMissionAnalysisStrategy :> MBSEMethodology::Product {
            doc /* How the business or mission analysis is performed. */
        }
        item def ProblemOrOpportunityStatement :> MBSEMethodology::Product {
            doc /* The business or mission problem or opportunity that the system addresses. */
        }
        item def MajorStakeholderIdentification :> MBSEMethodology::Product {
            doc /* The major stakeholders of the problem or opportunity. */
        }
        item def PreliminaryLifeCycleConcepts :> MBSEMethodology::Product {
            doc /* Preliminary concepts of how the system is acquired, deployed, operated, supported, and retired, e.g., a preliminary concept of operations. */
        }
        item def BusinessOrMissionRequirements :> MBSEMethodology::Product {
            doc /* The requirements of the business or mission that a solution must satisfy. */
        }
        item def AlternativeSolutionClasses :> MBSEMethodology::Product {
            doc /* The classes of potential solutions that can address the problem or opportunity. */
        }
        item def StakeholderNeedsAndRequirementsDefinitionStrategy :> MBSEMethodology::Product {
            doc /* How stakeholder needs are elicited and stakeholder requirements are defined. */
        }
        item def StakeholderNeeds :> MBSEMethodology::Product {
            doc /* The needs of the stakeholders in the system. */
        }
        item def LifeCycleConcepts :> MBSEMethodology::Product {
            doc /* The life cycle concepts of the system, e.g., the operational concept (OpsCon) and the concepts of acquisition, deployment, support, and retirement. */
        }
        item def StakeholderRequirements :> MBSEMethodology::Product {
            doc /* The requirements of the stakeholders to the system. */
        }
        item def MeasuresOfEffectiveness :> MBSEMethodology::Product {
            doc /* The measures of effectiveness (MOE) of the system in the operational environment from the stakeholder view. */
        }
        item def ValidationCriteria :> MBSEMethodology::Product {
            doc /* The criteria by which the system is validated against the stakeholder requirements. */
        }
        item def RequirementsTraceability :> MBSEMethodology::Product {
            doc /* The traceability between needs, requirements, architecture, design, and verification and validation. */
        }
        item def SystemRequirementsDefinitionStrategy :> MBSEMethodology::Product {
            doc /* How the system requirements are defined. */
        }
        item def SystemRequirements :> MBSEMethodology::Product {
            doc /* The system requirements, the technical view of the system that meets the stakeholder requirements. */
        }
        item def SystemFunctionDefinition :> MBSEMethodology::Product {
            doc /* The functions of the system and their interfaces to the system context. */
        }
        item def MeasuresOfPerformance :> MBSEMethodology::Product {
            doc /* The measures of performance (MOP) that characterize the system performance. */
        }
        item def TechnicalPerformanceMeasures :> MBSEMethodology::Product {
            doc /* The technical performance measures (TPM) that track the achievement of critical performance parameters. */
        }
        item def VerificationCriteria :> MBSEMethodology::Product {
            doc /* The criteria by which the system is verified against the system requirements. */
        }
        item def SystemArchitectureDefinitionStrategy :> MBSEMethodology::Product {
            doc /* How the system architecture is defined. */
        }
        item def CandidateArchitectures :> MBSEMethodology::Product {
            doc /* The alternative system architectures that are evaluated for selection. */
        }
        item def ArchitectureDescription :> MBSEMethodology::Product {
            doc /* The description of the selected system architecture in consistent views and models. */
        }
        item def SystemElementRequirements :> MBSEMethodology::Product {
            doc /* The requirements to the system elements derived from the architecture. */
        }
        item def InterfaceDefinition :> MBSEMethodology::Product {
            doc /* The interfaces between the system elements and to the system context. */
        }
        item def DesignDefinitionStrategy :> MBSEMethodology::Product {
            doc /* How the design of the system elements is defined. */
        }
        item def DesignDescription :> MBSEMethodology::Product {
            doc /* The detailed design of the system elements, sufficient for their implementation. */
        }
        item def SystemAnalysisSituation :> MBSEMethodology::Product {
            doc /* A question to be answered by system analysis, e.g., the evaluation of alternatives or the assessment of a characteristic. */
        }
        item def SystemAnalysisStrategy :> MBSEMethodology::Product {
            doc /* How the system analysis is performed, e.g., the analysis methods, models, and tools. */
        }
        item def SystemAnalysisReport :> MBSEMethodology::Product {
            doc /* The results of the system analysis with their assumptions and validity. */
        }
        item def ImplementationStrategy :> MBSEMethodology::Product {
            doc /* How the system elements are realized, e.g., fabricated, coded, or acquired. */
        }
        item def ImplementedSystemElements :> MBSEMethodology::Product {
            doc /* The realized system elements. */
        }
        item def ImplementationReport :> MBSEMethodology::Product {
            doc /* The results of the implementation, e.g., deviations and anomalies. */
        }
        item def IntegrationStrategy :> MBSEMethodology::Product {
            doc /* How the system elements are assembled, e.g., the integration order and the integration enabling systems. */
        }
        item def IntegratedSystem :> MBSEMethodology::Product {
            doc /* The system assembled from the system elements. */
        }
        item def IntegrationReport :> MBSEMethodology::Product {
            doc /* The results of the integration, e.g., interface anomalies. */
        }
        item def VerificationStrategy :> MBSEMethodology::Product {
            doc /* How the system is verified, e.g., the verification methods, levels, and enabling systems. */
        }
        item def VerificationProcedures :> MBSEMethodology::Product {
            doc /* The procedures of the verification actions. */
        }
        item def VerificationReport :> MBSEMethodology::Product {
            doc /* The results of the verification actions with the anomalies. */
        }
        item def VerifiedSystem :> MBSEMethodology::Product {
            doc /* The system that has been verified against its system requirements. */
        }
        item def TransitionStrategy :> MBSEMethodology::Product {
            doc /* How the system is transferred to and installed in the operational environment. */
        }
        item def InstalledSystem :> MBSEMethodology::Product {
            doc /* The system installed in its operational environment. */
        }
        item def TransitionReport :> MBSEMethodology::Product {
            doc /* The results of the transition, e.g., the installation, the training of operators, and the anomalies. */
        }
        item def ValidationStrategy :> MBSEMethodology::Product {
            doc /* How the system is validated, e.g., the validation methods and the operational scenarios. */
        }
        item def ValidationProcedures :> MBSEMethodology::Product {
            doc /* The procedures of the validation actions. */
        }
        item def ValidationReport :> MBSEMethodology::Product {
            doc /* The results of the validation actions with the anomalies. */
        }
        item def ValidatedSystem :> MBSEMethodology::Product {
            doc /* The system that has been validated for its intended use in its intended operational environment. */
        }
        item def OperationStrategy :> MBSEMethodology::Product {
            doc /* How the system is operated to deliver its services, e.g., staffing and operational modes. */
        }
        item def OperationReport :> MBSEMethodology::Product {
            doc /* The results of the operation, e.g., the performance of the services, incidents, and problems. */
        }
        item def MaintenanceStrategy :> MBSEMethodology::Product {
            doc /* How the system is maintained, e.g., corrective, adaptive, and preventive maintenance, and logistics. */
        }
        item def MaintenanceReport :> MBSEMethodology::Product {
            doc /* The results of the maintenance, e.g., the failures, their resolution, and the trends. */
        }
        item def DisposalStrategy :> MBSEMethodology::Product {
            doc /* How the system or system elements are retired and disposed of. */
        }
        item def DisposalReport :> MBSEMethodology::Product {
            doc /* The results of the disposal, e.g., the disposed elements and the restored environment. */
        }
    }

    package Stakeholders {
        doc /* Typical stakeholders of a systems engineering project that have concerns framed by the SYSMOD viewpoints.
             * ISO/IEC/IEEE 15288 defines processes, not roles. The stakeholders are derived from the roles
             * that are responsible for the respective life cycle processes.
             * Each role specializes SYSMOD::ExtendedStakeholder, so that a project stakeholder can play one or more roles by
             * multiple typing, e.g., part johnFinch : ProductManager :>> projectOwner, or
             * part logisticCompany : LogisticCompany, Acquirer :> projectStakeholders.
             */

        // Agreement processes
        part def Acquirer :> MBSEMethodology::Role {
            doc /* Organization or person that acquires or procures the system from a supplier (ISO/IEC/IEEE 15288 Acquisition process). */
        }
        part def Supplier :> MBSEMethodology::Role {
            doc /* Organization or person that provides the system to an acquirer (ISO/IEC/IEEE 15288 Supply process). */
        }

        // Organizational project-enabling processes
        part def PortfolioManager :> MBSEMethodology::Role {
            doc /* Responsible for initiating, sustaining, and terminating projects in line with the organization's strategy (ISO/IEC/IEEE 15288 Portfolio Management process). */
        }
        part def QualityManager :> MBSEMethodology::Role {
            doc /* Responsible for ensuring that products, services, and processes meet the organization's quality objectives (ISO/IEC/IEEE 15288 Quality Management process). */
        }

        // Technical management processes
        part def ProjectManager :> MBSEMethodology::Role {
            doc /* Responsible for planning, assessing, and controlling the project, e.g., schedule, cost, resources, and progress (ISO/IEC/IEEE 15288 Project Planning and Project Assessment and Control processes). */
        }
        part def RiskManager :> MBSEMethodology::Role {
            doc /* Responsible for identifying, analyzing, treating, and monitoring risks (ISO/IEC/IEEE 15288 Risk Management process). */
        }
        part def ConfigurationManager :> MBSEMethodology::Role {
            doc /* Responsible for managing and controlling system elements, configurations, and baselines over the life cycle (ISO/IEC/IEEE 15288 Configuration Management process). */
        }

        // Technical processes
        part def ProductManager :> MBSEMethodology::Role {
            doc /* Responsible for the business or mission problem or opportunity, the solution space, and the product's success on the market (ISO/IEC/IEEE 15288 Business or Mission Analysis process).
                 * In a SYSMOD project, the projectOwner typically plays this role, since the projectOwner is the stakeholder of the problemStatement. */
        }
        part def RequirementsEngineer :> MBSEMethodology::Role {
            doc /* Responsible for eliciting stakeholder needs and defining stakeholder and system requirements (ISO/IEC/IEEE 15288 Stakeholder Needs and Requirements Definition and System Requirements Definition processes). */
        }
        part def SystemArchitect :> MBSEMethodology::Role {
            doc /* Responsible for the system architecture, i.e., the fundamental concepts and properties of the system and the integration of problem and solution across several levels (ISO/IEC/IEEE 15288 System Architecture Definition process). */
        }
        part def DesignEngineer :> MBSEMethodology::Role {
            doc /* Responsible for the detailed design of system elements so that they can be implemented (ISO/IEC/IEEE 15288 Design Definition and Implementation processes). */
        }
        part def SystemAnalyst :> MBSEMethodology::Role {
            doc /* Responsible for providing a rigorous basis of data and information for technical decisions, e.g., by simulations and trade studies (ISO/IEC/IEEE 15288 System Analysis process). */
        }
        part def IntegrationEngineer :> MBSEMethodology::Role {
            doc /* Responsible for assembling the system elements into a realized system (ISO/IEC/IEEE 15288 Integration process). */
        }
        part def VerificationEngineer :> MBSEMethodology::Role {
            doc /* Responsible for providing objective evidence that the system fulfills its specified requirements (ISO/IEC/IEEE 15288 Verification process). */
        }
        part def ValidationEngineer :> MBSEMethodology::Role {
            doc /* Responsible for providing objective evidence that the system fulfills its intended use in its intended operational environment (ISO/IEC/IEEE 15288 Validation process). */
        }
        part def Operator :> MBSEMethodology::Role {
            doc /* Uses the system to deliver its services (ISO/IEC/IEEE 15288 Operation process). */
        }
        part def Maintainer :> MBSEMethodology::Role {
            doc /* Sustains the capability of the system to provide its services (ISO/IEC/IEEE 15288 Maintenance and Disposal processes). */
        }
    }
    package Concerns {
        private import Stakeholders::*;
        doc /* Concerns of the SYSMOD stakeholders, i.e., their interests in the system and the project.
             * The concerns are derived from the outcomes of the ISO/IEC/IEEE 15288 life cycle processes.
             *
             * Entity of interest: the subject of all concerns is the SYSMOD Project (projectOfInterest). In the sense of
             * ISO/IEC/IEEE 42010, the Project is the entity of interest of the SYSMOD architecture description framework.
             * The system of interest is reached through the system contexts of the Project, e.g., the problemStatement
             * has the brownfield system (brownfieldContextImpl.soiImpl) as its own subject.
             */

        // Agreement processes
        concern def ContractualAgreement {
            doc /* What is the agreed scope of the system, which deliverables are to be provided,
                 * and what are the acceptance criteria? (ISO/IEC/IEEE 15288 Acquisition and Supply processes)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder acquirer : Acquirer;
            stakeholder supplier : Supplier;
        }

        // Organizational project-enabling processes
        concern def PortfolioAlignment {
            doc /* Does the project contribute to the organization's strategy, and should it be
                 * initiated, continued, redirected, or terminated? (ISO/IEC/IEEE 15288 Portfolio Management process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder portfolioManager : PortfolioManager;
        }
        concern def QualityCompliance {
            doc /* Do the system, the work products, and the applied processes meet the quality objectives
                 * and the applicable standards? (ISO/IEC/IEEE 15288 Quality Management and Quality Assurance processes)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder qualityManager : QualityManager;
        }

        // Technical management processes
        concern def ProjectStatus {
            doc /* What is the current status and progress of the project, e.g., the state of the work products
                 * and process steps, compared to the plan? (ISO/IEC/IEEE 15288 Project Planning and Project Assessment and Control processes)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder projectManager : ProjectManager;
            stakeholder portfolioManager : PortfolioManager;
        }
        concern def RiskExposure {
            doc /* Which risks threaten the system and the project, how likely and severe are they,
                 * and how are they treated? (ISO/IEC/IEEE 15288 Risk Management process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder riskManager : RiskManager;
            stakeholder projectManager : ProjectManager;
        }
        concern def ConfigurationBaseline {
            doc /* Which configuration items and baselines exist, what is their version and status,
                 * and which changes are pending? (ISO/IEC/IEEE 15288 Configuration Management process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder configurationManager : ConfigurationManager;
        }

        // Technical processes
        concern def ProblemSolutionPitch {
            doc /* What is the problem to be solved and what is the solution idea? Pitch both concisely
                 * to decision makers. (ISO/IEC/IEEE 15288 Business or Mission Analysis process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder productManager : ProductManager;
            stakeholder acquirer : Acquirer;
        }
        concern def MissionGoalsAndMeasures {
            doc /* Which mission, goals, and objectives does the project pursue, and by which measures of success
                 * is it decided whether the problem is solved? (ISO/IEC/IEEE 15288 Business or Mission Analysis process)
                 * In SYSMOD, the goals are stated with the problemStatement and become measurable in the
                 * systemRequirementSpecification, e.g., with the SYSMODRequirementsBoilerplates.
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder productManager : ProductManager;
            stakeholder acquirer : Acquirer;
        }
        concern def StakeholderNeedsCoverage {
            doc /* Are all relevant stakeholders identified, and are their needs captured and transformed
                 * into stakeholder and system requirements? (ISO/IEC/IEEE 15288 Stakeholder Needs and Requirements Definition
                 * and System Requirements Definition processes)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder requirementsEngineer : RequirementsEngineer;
            stakeholder productManager : ProductManager;
        }
        concern def ProblemSolutionIntegration {
            doc /* How are the problem artifacts, e.g., requirements and use cases, integrated with the solution artifacts,
                 * e.g., the architecture, across several levels of the system hierarchy? (ISO/IEC/IEEE 15288 System Architecture Definition process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder systemArchitect : SystemArchitect;
        }
        concern def DesignConsistency {
            doc /* Do the designs of the system elements conform to the architecture, and are they
                 * sufficiently detailed to be implemented? (ISO/IEC/IEEE 15288 Design Definition and Implementation processes)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder designEngineer : DesignEngineer;
            stakeholder systemArchitect : SystemArchitect;
        }
        concern def TradeOffDecision {
            doc /* Which solution alternatives exist, how do they perform with respect to the relevant criteria,
                 * and which one is preferred? (ISO/IEC/IEEE 15288 System Analysis and Decision Management processes)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder systemAnalyst : SystemAnalyst;
            stakeholder systemArchitect : SystemArchitect;
        }
        concern def InterfaceIntegration {
            doc /* Which interfaces exist between the system elements and to the system context,
                 * and in which order are the system elements integrated? (ISO/IEC/IEEE 15288 Integration process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder integrationEngineer : IntegrationEngineer;
            stakeholder designEngineer : DesignEngineer;
        }
        concern def VerificationCoverage {
            doc /* Is each requirement verified by an appropriate verification case,
                 * and what are the verification results? (ISO/IEC/IEEE 15288 Verification process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder verificationEngineer : VerificationEngineer;
            stakeholder requirementsEngineer : RequirementsEngineer;
        }
        concern def OperationalSuitability {
            doc /* Does the system fulfill its intended use and the stakeholder needs in its intended
                 * operational environment? (ISO/IEC/IEEE 15288 Validation process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder validationEngineer : ValidationEngineer;
            stakeholder operator : Operator;
            stakeholder acquirer : Acquirer;
        }
        concern def SystemOperation {
            doc /* How is the system used to deliver its services, i.e., which use cases, operational modes,
                 * and interactions with users and external systems exist? (ISO/IEC/IEEE 15288 Operation process)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder operator : Operator;
        }
        concern def MaintainabilityAndDisposal {
            doc /* How is the system maintained, repaired, and supported during operation,
                 * and how is it retired and disposed of at the end of its life? (ISO/IEC/IEEE 15288 Maintenance and Disposal processes)
                 */
            subject projectOfInterest : SYSMOD::Project;
            stakeholder maintainer : Maintainer;
        }
    }    
}