/*****************************************************************************
 * Open MCT Web, Copyright (c) 2014-2015, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT Web is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT Web includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

/*global define */

define(
    function () {
        "use strict";

        /**
         * MoveService provides an interface for moving objects from one
         * location to another.  It also provides a method for determining if
         * an object can be copied to a specific location.
         */
        function MoveService(policyService, linkService) {
            return {
                /**
                 * Returns `true` if `object` can be moved into
                 * `parentCandidate`'s composition.
                 */
                validate: function (object, parentCandidate) {
                    var currentParent = object
                        .getCapability('context')
                        .getParent();

                    if (!parentCandidate || !parentCandidate.getId) {
                        return false;
                    }
                    if (parentCandidate.getId() === currentParent.getId()) {
                        return false;
                    }
                    if (parentCandidate.getId() === object.getId()) {
                        return false;
                    }
                    if (parentCandidate.getModel().composition.indexOf(object.getId()) !== -1) {
                        return false;
                    }
                    return policyService.allow(
                        "composition",
                        parentCandidate.getCapability('type'),
                        object.getCapability('type')
                    );
                },
                /**
                 * Move `object` into `parentObject`'s composition.
                 *
                 * @returns {Promise} A promise that is fulfilled when the
                 *    move operation has completed.
                 */
                perform: function (object, parentObject) {
                    return linkService
                        .perform(object, parentObject)
                        .then(function () {
                            return object
                                .getCapability('action')
                                .perform('remove');
                        });
                }
            };
        }

        return MoveService;
    }
);
