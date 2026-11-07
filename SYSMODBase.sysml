library package SYSMODBase {
    doc
    /* 
     * Base for SYSMOD v5 for SysML v2
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

    occurrence def SYSMODEnvironment :> MBSEMethodology::MBSEEnvironment {
        part sysmodMethodology :>> methodology {
            part :>> tools :> SYSMODEnvironment::tools;
            part :>> roles :> SYSMODEnvironment::roles;
        }    
        occurrence sysmodProject :>> rootProduct;
    }
}