library package SYSMODRequirementsBoilerplates {
    doc
    /* 
     * Library of generic, parametric requirement patterns. 
     *
     * Each one captures a common quantitative requirement shape as a require constraint over placeholder attributes; 
     * specialize a boilerplate and redefine its attributes to bind it to a concrete quantity and threshold.
     *
     * Version v5.1.4
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


    requirement def MaxValue {
        doc
        /*
         * The quantity must not exceed an upper bound (inclusive).
         * The optional tolerance (default 0.0) relaxes the bound: values up to and including maxValue + tolerance are accepted.
         */
        attribute currentValue : ScalarValues::Real;
        attribute maxValue : ScalarValues::Real;
        attribute tolerance : ScalarValues::Real default 0.0;

        require constraint {
            currentValue <= maxValue + tolerance
        }
    }
    requirement def MinValue {
        doc
        /*
         * The quantity must not fall below a lower bound (inclusive).
         * The optional tolerance (default 0.0) relaxes the bound: values down to and including minValue - tolerance are accepted.
         */
        attribute currentValue : ScalarValues::Real;
        attribute minValue : ScalarValues::Real;
        attribute tolerance : ScalarValues::Real default 0.0;

        require constraint {
            currentValue >= minValue - tolerance
        }
    }
    requirement def RangeValue {
        doc
        /*
         * The quantity must stay within an inclusive lower and upper bound.
         * The optional tolerance (default 0.0) widens the range on both sides to [minValue - tolerance, maxValue + tolerance].
         */
        attribute currentValue : ScalarValues::Real;
        attribute minValue : ScalarValues::Real;
        attribute maxValue : ScalarValues::Real;
        attribute tolerance : ScalarValues::Real default 0.0;

        require constraint {
            minValue - tolerance <= currentValue and currentValue <= maxValue + tolerance
        }
    }
    requirement def ExactValue {
        doc
        /* The quantity must equal a specific target value. */
        attribute currentValue : ScalarValues::Real;
        attribute targetValue : ScalarValues::Real;

        require constraint {
            currentValue == targetValue
        }
    }
    requirement def ToleranceValue {
        doc
        /* The quantity must stay within a target value plus/minus a tolerance. */
        attribute currentValue : ScalarValues::Real;
        attribute targetValue : ScalarValues::Real;
        attribute tolerance : ScalarValues::Real;

        require constraint {
            currentValue >= targetValue - tolerance and currentValue <= targetValue + tolerance
        }
    }
    requirement def MinAvailability {
        doc
        /*
         * The ratio of uptime to total time must reach at least a minimum availability.
         * The optional tolerance (default 0.0) relaxes the bound: availabilities of at least minAvailability - tolerance are accepted.
         */
        attribute uptime :> ISQ::duration;
        attribute totalTime :> ISQ::duration;
        attribute minAvailability : ScalarValues::Real;
        attribute tolerance : ScalarValues::Real default 0.0;

        require constraint {
            uptime / totalTime >= minAvailability - tolerance
        }
    }
    requirement def MinReliability {
        doc
        /*
         * The mean time between failures must reach at least a minimum MTBF.
         * The optional tolerance (a duration, default 0 s) relaxes the bound: an MTBF of at least minMTBF - tolerance is accepted.
         */
        attribute meanTimeBetweenFailures :> ISQ::duration;
        attribute minMTBF :> ISQ::duration;
        attribute tolerance :> ISQ::duration default 0.0 [SI::s];

        require constraint {
            meanTimeBetweenFailures >= minMTBF - tolerance
        }
    }
}

    