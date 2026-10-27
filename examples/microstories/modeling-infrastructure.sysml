package MicroStory_ModelingInfrastructure {
    private import SYSMOD::*;

    // What is already there: the engineering environment of AmperDrones today
    part def EngineeringEnvironment {
        part plm { doc /* parts, baselines, change requests */ }
        part requirementsDatabase { doc /* today's requirements, as text */ }
        part cad;
        part simulation;
        part engineers [12] { doc /* three of them know SysML v1 */ }
    }

    // What is missing: the MBSE environment builds on what is there
    part def MBSEEnvironment :> EngineeringEnvironment {
        part sysmlV2Tool { doc /* textual and graphical modeling, SysML v2 API */ }
        part modelRepository { doc /* versions, reviews, automatic checks */ }
        part methodology { doc /* SYSMOD, tailored to AmperDrones */ }
        part training { doc /* SysML v2 and SYSMOD for the whole team */ }
        part coaching { doc /* an experienced modeler during the first project */ }

        // The digital thread: the model connects to what is already there
        connection modelToPlm connect sysmlV2Tool to plm;
        connection modelToRequirements connect sysmlV2Tool to requirementsDatabase;
        connection modelToSimulation connect sysmlV2Tool to simulation;
    }

    // The environment is an enabling system (ISO 15288) with its own owner:
    // it serves every project of the organization, not only the drone.
    #project occurrence def 'MBSE Environment Project' {
        attribute :>> purpose = "Give every engineering project a working MBSE environment that is part of the company's digital thread.";
        part lenaOrtiz :>> projectOwner {
            attribute :>> name = "Lena Ortiz";
        }
        part :>> brownfieldContextImpl {
            part :>> soiImpl : EngineeringEnvironment;
        }
        part :>> systemIdeaContextImpl {
            part :>> soiImpl : MBSEEnvironment;
        }
    }

    #project occurrence def 'Delivery Drone Project' {
        part johnFinch :>> projectOwner {
            attribute :>> name = "John Finch";
        }
        // used, not owned: the environment belongs to the organization
        ref occurrence environment : 'MBSE Environment Project';
    }
}
