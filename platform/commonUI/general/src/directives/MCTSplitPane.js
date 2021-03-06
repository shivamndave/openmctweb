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
/*global define*/

define(
    [],
    function () {
        'use strict';

        // Pixel width to allocate for the splitter itself
        var DEFAULT_ANCHOR = 'left',
            CHILDREN_WARNING_MESSAGE = [
                "Invalid mct-split-pane contents.",
                "This element should contain exactly three",
                "child elements, where the middle-most element",
                "is an mct-splitter."
            ].join(" "),
            ANCHOR_WARNING_MESSAGE = [
                "Unknown anchor provided to mct-split-pane,",
                "defaulting to",
                DEFAULT_ANCHOR + "."
            ].join(" "),
            ANCHORS = {
                left: {
                    edge: "left",
                    opposite: "right",
                    dimension: "width",
                    orientation: "vertical"
                },
                right: {
                    edge: "right",
                    opposite: "left",
                    dimension: "width",
                    orientation: "vertical",
                    reversed: true
                },
                top: {
                    edge: "top",
                    opposite: "bottom",
                    dimension: "height",
                    orientation: "horizontal"
                },
                bottom: {
                    edge: "bottom",
                    opposite: "top",
                    dimension: "height",
                    orientation: "horizontal",
                    reversed: true
                }
            };

        /**
         * Implements `mct-split-pane` directive.
         *
         * This takes the following attributes:
         * * `position`: Two-way bound scope variable which will contain
         *   the pixel position of the splitter, offset from the appropriate
         *   edge.
         * * `anchor`: Plain string, one of "left", "right", "top",
         *    or "bottom".
         *
         * When used, an `mct-split-pane` element should contain exactly
         * three child elements, where the middle is an `mct-splitter`
         * element. These should be included in either left-to-right
         * or top-to-bottom order (depending on anchoring.) If the contents
         * do not match this form, `mct-split-pane` will issue a warning
         * and its behavior will be undefined.
         *
         * This directive works by setting the width of the element
         * nearest the anchor edge, and then positioning the other elements
         * based on its observed width. As such, `min-width`, `max-width`,
         * etc. can be set on that element to control the splitter's
         * allowable positions.
         *
         * @constructor
         */
        function MCTSplitPane($parse, $log) {
            var anchors = {
                left: true,
                right: true,
                top: true,
                bottom: true
            };

            function controller($scope, $element, $attrs) {
                var anchorKey = $attrs.anchor || DEFAULT_ANCHOR,
                    anchor,
                    positionParsed = $parse($attrs.position),
                    position; // Start undefined, until explicitly set

                // Get relevant size (height or width) of DOM element
                function getSize(domElement) {
                    return (anchor.orientation === 'vertical' ?
                            domElement.offsetWidth : domElement.offsetHeight);
                }

                // Apply styles to child elements
                function updateChildren(children) {
                    // Pick out correct elements to update, flowing from
                    // selected anchor edge.
                    var first = children.eq(anchor.reversed ? 2 : 0),
                        splitter = children.eq(1),
                        last = children.eq(anchor.reversed ? 0 : 2),
                        splitterSize = getSize(splitter[0]),
                        firstSize;

                    first.css(anchor.edge, "0px");
                    first.css(anchor.dimension, (position - splitterSize) + 'px');

                    // Get actual size (to obey min-width etc.)
                    firstSize = getSize(first[0]);
                    first.css(anchor.dimension, firstSize + 'px');
                    splitter.css(anchor.edge, (firstSize + splitterSize) + 'px');
                    splitter.css(anchor.opposite, "auto");

                    last.css(anchor.edge, (firstSize + splitterSize * 3) + 'px');
                    last.css(anchor.opposite, "0px");

                    position = firstSize + splitterSize;
                }

                // Update positioning of contained elements
                function updateElementPositions() {
                    var children = $element.children();

                    // Check to make sure contents are well-formed
                    if (children.length !== 3 ||
                            children[1].nodeName.toLowerCase() !== 'mct-splitter') {
                        $log.warn(CHILDREN_WARNING_MESSAGE);
                        return;
                    }

                    updateChildren(children);
                }

                // Enforce minimum/maximum positions
                function enforceExtrema() {
                    position = Math.max(position, 0);
                    position = Math.min(position, getSize($element[0]));
                }

                // Getter-setter for the pixel offset of the splitter,
                // relative to the current edge.
                function getSetPosition(value) {
                    var min, max;
                    if (typeof value === 'number') {
                        position = value;
                        enforceExtrema();
                        updateElementPositions();

                        // Pass change up so this state can be shared
                        if (positionParsed.assign) {
                            positionParsed.assign($scope, position);
                        }
                    }
                    return position;
                }

                // Make sure anchor parameter is something we know
                if (!ANCHORS[anchorKey]) {
                    $log.warn(ANCHOR_WARNING_MESSAGE);
                    anchorKey = DEFAULT_ANCHOR;
                }
                anchor = ANCHORS[anchorKey];

                $scope.$watch($attrs.position, getSetPosition);

                $element.addClass("split-layout");
                $element.addClass(anchor.orientation);

                // Initialize positions
                getSetPosition(getSize(
                    $element.children().eq(anchor.reversed ? 2 : 0)[0]
                ));

                // Interface exposed by controller, for mct-splitter to user
                return {
                    position: getSetPosition,
                    anchor: function () {
                        return anchor;
                    }
                };
            }

            return {
                // Restrict to attributes
                restrict: "E",
                // Expose its controller
                controller: ['$scope', '$element', '$attrs', controller]
            };
        }

        return MCTSplitPane;

    }
);
