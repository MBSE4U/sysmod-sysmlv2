library package ISO15288Processes {
        doc
    /* 
     * Package containing the 30 system life cycle processes of ISO/IEC/IEEE 15288, grouped into agreement, 
     * organizational project-enabling, technical management, and technical processes.
     *
     * Subpackages contain Stakeholders and their Concerns.
     *
     * Version v5.1.8
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


    //
    // Agreement Processes
    //
    action def Acquisition {
        doc
        /* The Acquisition process obtains a product or service in accordance with the acquirer's requirements. */
    }
    action def Supply {
        doc
        /* The Supply process provides an acquirer with a product or service that meets agreed requirements. */
    }

    //
    // Organizational Project-Enabling Processes
    //
    action def LifeCycleModelManagement {
        doc
        /* The Life Cycle Model Management process defines, maintains, and assures availability of policies, life cycle processes, life cycle models, and procedures for use by the organization. */
    }
    action def InfrastructureManagement {
        doc
        /* The Infrastructure Management process provides the infrastructure and services to projects to support organization and project objectives throughout the life cycle. */
    }
    action def PortfolioManagement {
        doc
        /* The Portfolio Management process initiates and sustains necessary, sufficient, and suitable projects in order to meet the strategic objectives of the organization. */
    }
    action def HumanResourceManagement {
        doc
        /* The Human Resource Management process provides the organization with necessary human resources and maintains their competencies consistent with business needs. */
    }
    action def QualityManagement {
        doc
        /* The Quality Management process assures that products, services, and implementations of the life cycle processes meet the organization's quality objectives and achieve customer satisfaction. */
    }
    action def KnowledgeManagement {
        doc
        /* The Knowledge Management process creates the capability and assets that enable the organization to exploit opportunities to re-apply existing knowledge. */
    }

    //
    // Technical Management Processes
    //
    action def ProjectPlanning {
        doc
        /* The Project Planning process produces and coordinates effective and workable plans. */
    }
    action def ProjectAssessmentAndControl {
        doc
        /* The Project Assessment and Control process assesses if the plans are aligned and feasible, determines the status of the project, technical, and process performance, and directs execution to help ensure that the performance is according to plans and schedules, within projected budgets, and satisfies technical objectives. */
    }
    action def DecisionManagement {
        doc
        /* The Decision Management process provides a structured, analytical framework for objectively identifying, characterizing, and evaluating a set of alternatives for a decision at any point in the life cycle and selecting the most beneficial course of action. */
    }
    action def RiskManagement {
        doc
        /* The Risk Management process continually identifies, analyzes, treats, and monitors risks. */
    }
    action def ConfigurationManagement {
        doc
        /* The Configuration Management process manages and controls system elements and configurations over the life cycle. */
    }
    action def InformationManagement {
        doc
        /* The Information Management process generates, obtains, confirms, transforms, retains, retrieves, disseminates, and disposes of information to designated stakeholders. */
    }
    action def Measurement {
        doc
        /* The Measurement process collects, analyzes, and reports objective data and information to support effective management and demonstrate the quality of the products, services, and processes. */
    }
    action def QualityAssurance {
        doc
        /* The Quality Assurance process helps ensure the effective application of the organization's Quality Management process to the project. */
    }

    //
    // Technical Processes
    //
    action def BusinessOrMissionAnalysis {
        doc
        /* The Business or Mission Analysis process defines the business or mission problem or opportunity, characterizes the solution space, and determines potential solution class(es) that can address a problem or take advantage of an opportunity. */
    }
    action def StakeholderNeedsAndRequirementsDefinition {
        doc
        /* The Stakeholder Needs and Requirements Definition process defines the stakeholder requirements for a system that can provide the capabilities needed by users and other stakeholders in a defined environment. */
    }
    action def SystemRequirementsDefinition {
        doc
        /* The System Requirements Definition process transforms the stakeholder, user-oriented view of desired capabilities into a technical view of a solution that meets the operational needs of the user. */
    }
    action def SystemArchitectureDefinition {
        doc
        /* The System Architecture Definition process generates system architecture alternatives, selects one or more alternatives that address stakeholder concerns and system requirements, and expresses this in consistent views and models. */
    }
    action def DesignDefinition {
        doc
        /* The Design Definition process provides sufficient detailed data and information about the system and its elements to enable the implementation consistent with the architectural entities as defined in the models and views of the system architecture. */
    }
    action def SystemAnalysis {
        doc
        /* The System Analysis process provides a rigorous basis of data and information for technical understanding to aid decision-making across the life cycle. */
    }
    action def Implementation {
        doc
        /* The Implementation process realizes a specified system element. */
    }
    action def Integration {
        doc
        /* The Integration process synthesizes a set of system elements into a realized system that satisfies the system requirements, architecture, and design. */
    }
    action def Verification {
        doc
        /* The Verification process provides objective evidence that a system or system element fulfills its specified requirements and characteristics. */
    }
    action def Transition {
        doc
        /* The Transition process establishes a capability for a system to provide services specified by stakeholder requirements in the operational environment. */
    }
    action def Validation {
        doc
        /* The Validation process provides objective evidence that the system, when in use, fulfills its business or mission objectives and stakeholder requirements, achieving its intended use in its intended operational environment. */
    }
    action def Operation {
        doc
        /* The Operation process uses the system to deliver its services. */
    }
    action def Maintenance {
        doc
        /* The Maintenance process sustains the capability of the system to provide a service. */
    }
    action def Disposal {
        doc
        /* The Disposal process ends the existence of a system element or system for a specified intended use, appropriately handling replaced or retired elements. */
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
        part def Acquirer :> SYSMOD::ExtendedStakeholder {
            doc /* Organization or person that acquires or procures the system from a supplier (ISO/IEC/IEEE 15288 Acquisition process). */
        }
        part def Supplier :> SYSMOD::ExtendedStakeholder {
            doc /* Organization or person that provides the system to an acquirer (ISO/IEC/IEEE 15288 Supply process). */
        }

        // Organizational project-enabling processes
        part def PortfolioManager :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for initiating, sustaining, and terminating projects in line with the organization's strategy (ISO/IEC/IEEE 15288 Portfolio Management process). */
        }
        part def QualityManager :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for ensuring that products, services, and processes meet the organization's quality objectives (ISO/IEC/IEEE 15288 Quality Management process). */
        }

        // Technical management processes
        part def ProjectManager :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for planning, assessing, and controlling the project, e.g., schedule, cost, resources, and progress (ISO/IEC/IEEE 15288 Project Planning and Project Assessment and Control processes). */
        }
        part def RiskManager :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for identifying, analyzing, treating, and monitoring risks (ISO/IEC/IEEE 15288 Risk Management process). */
        }
        part def ConfigurationManager :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for managing and controlling system elements, configurations, and baselines over the life cycle (ISO/IEC/IEEE 15288 Configuration Management process). */
        }

        // Technical processes
        part def ProductManager :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for the business or mission problem or opportunity, the solution space, and the product's success on the market (ISO/IEC/IEEE 15288 Business or Mission Analysis process).
                 * In a SYSMOD project, the projectOwner typically plays this role, since the projectOwner is the stakeholder of the problemStatement. */
        }
        part def RequirementsEngineer :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for eliciting stakeholder needs and defining stakeholder and system requirements (ISO/IEC/IEEE 15288 Stakeholder Needs and Requirements Definition and System Requirements Definition processes). */
        }
        part def SystemArchitect :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for the system architecture, i.e., the fundamental concepts and properties of the system and the integration of problem and solution across several levels (ISO/IEC/IEEE 15288 System Architecture Definition process). */
        }
        part def DesignEngineer :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for the detailed design of system elements so that they can be implemented (ISO/IEC/IEEE 15288 Design Definition and Implementation processes). */
        }
        part def SystemAnalyst :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for providing a rigorous basis of data and information for technical decisions, e.g., by simulations and trade studies (ISO/IEC/IEEE 15288 System Analysis process). */
        }
        part def IntegrationEngineer :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for assembling the system elements into a realized system (ISO/IEC/IEEE 15288 Integration process). */
        }
        part def VerificationEngineer :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for providing objective evidence that the system fulfills its specified requirements (ISO/IEC/IEEE 15288 Verification process). */
        }
        part def ValidationEngineer :> SYSMOD::ExtendedStakeholder {
            doc /* Responsible for providing objective evidence that the system fulfills its intended use in its intended operational environment (ISO/IEC/IEEE 15288 Validation process). */
        }
        part def Operator :> SYSMOD::ExtendedStakeholder {
            doc /* Uses the system to deliver its services (ISO/IEC/IEEE 15288 Operation process). */
        }
        part def Maintainer :> SYSMOD::ExtendedStakeholder {
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