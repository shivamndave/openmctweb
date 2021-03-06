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
/*global define,Float32Array*/

/**
 * Prepares data to be rendered in a GL Plot. Handles
 * the conversion from data API to displayable buffers.
 */
define(
    ['./PlotLine', './PlotLineBuffer'],
    function (PlotLine, PlotLineBuffer) {
        'use strict';

        var MAX_POINTS = 86400,
            PADDING_RATIO = 0.10, // Padding percentage for top & bottom
            INITIAL_SIZE = 675; // 1/128 of MAX_POINTS

        /**
         * The PlotPreparer is responsible for handling data sets and
         * preparing them to be rendered. It creates a WebGL-plottable
         * Float32Array for each trace, and tracks the boundaries of the
         * data sets (since this is convenient to do during the same pass).
         * @constructor
         * @param {TelemetryHandle} handle the handle to telemetry access
         * @param {string} domain the key to use when looking up domain values
         * @param {string} range the key to use when looking up range values
         * @param {number} maxDuration maximum plot duration to display
         * @param {number} maxPoints maximum number of points to display
         */
        function PlotUpdater(handle, domain, range, fixedDuration, maxPoints) {
            var ids = [],
                lines = {},
                dimensions = [0, 0],
                origin = [0, 0],
                domainExtrema,
                rangeExtrema,
                buffers = {},
                bufferArray = [],
                domainOffset;

            // Look up a domain object's id (for mapping, below)
            function getId(domainObject) {
                return domainObject.getId();
            }

            // Check if this set of ids matches the current set of ids
            // (used to detect if line preparation can be skipped)
            function idsMatch(nextIds) {
                return ids.length === nextIds.length &&
                    nextIds.every(function (id, index) {
                        return ids[index] === id;
                    });
            }

            // Prepare plot lines for this group of telemetry objects
            function prepareLines(telemetryObjects) {
                var nextIds = telemetryObjects.map(getId),
                    next = {};

                // Detect if we already have everything we need prepared
                if (idsMatch(nextIds)) {
                    // Nothing to prepare, move on
                    return;
                }

                // Built up a set of ids. Note that we can only
                // create plot lines after our domain offset has
                // been determined.
                if (domainOffset !== undefined) {
                    // Update list of ids in use
                    ids = nextIds;

                    // Create buffers for these objects
                    bufferArray = ids.map(function (id) {
                        buffers[id] = buffers[id] || new PlotLineBuffer(
                            domainOffset,
                            INITIAL_SIZE,
                            maxPoints
                        );
                        next[id] = lines[id] || new PlotLine(buffers[id]);
                        return buffers[id];
                    });
                }

                // If there are no more lines, clear the domain offset
                if (Object.keys(next).length < 1) {
                    domainOffset = undefined;
                }

                // Update to the current set of lines
                lines = next;
            }


            // Initialize the domain offset, based on these observed values
            function initializeDomainOffset(values) {
                domainOffset =
                    ((domainOffset === undefined) && (values.length > 0)) ?
                            (values.reduce(function (a, b) {
                                return (a || 0) + (b || 0);
                            }, 0) / values.length) :
                            domainOffset;
            }

            // Used in the reduce step of updateExtrema
            function reduceExtrema(a, b) {
                return [ Math.min(a[0], b[0]), Math.max(a[1], b[1]) ];
            }

            // Convert a domain/range extrema to plot dimensions
            function dimensionsOf(extrema) {
                return extrema[1] - extrema[0];
            }

            // Convert a domain/range extrema to a plot origin
            function originOf(extrema) {
                return extrema[0];
            }

            // Expand range slightly so points near edges are visible
            function expandRange() {
                var padding = PADDING_RATIO * dimensions[1],
                    top;
                padding = Math.max(padding, 1.0);
                top = Math.ceil(origin[1] + dimensions[1] + padding / 2);
                origin[1] = Math.floor(origin[1] - padding / 2);
                dimensions[1] = top - origin[1];
            }

            // Update dimensions and origin based on extrema of plots
            function updateBounds() {
                if (bufferArray.length > 0) {
                    domainExtrema = bufferArray.map(function (lineBuffer) {
                        return lineBuffer.getDomainExtrema();
                    }).reduce(reduceExtrema);

                    rangeExtrema = bufferArray.map(function (lineBuffer) {
                        return lineBuffer.getRangeExtrema();
                    }).reduce(reduceExtrema);

                    // Calculate best-fit dimensions
                    dimensions =
                        [dimensionsOf(domainExtrema), dimensionsOf(rangeExtrema)];
                    origin = [originOf(domainExtrema), originOf(rangeExtrema)];

                    // Enforce some minimum visible area
                    expandRange();

                    // ...then enforce a fixed duration if needed
                    if (fixedDuration !== undefined) {
                        origin[0] = origin[0] + dimensions[0] - fixedDuration;
                        dimensions[0] = fixedDuration;
                    }
                }
            }

            // Enforce maximum duration on all plot lines; not that
            // domain extrema must be up-to-date for this to behave correctly.
            function enforceDuration() {
                var cutoff;

                function enforceDurationForBuffer(plotLineBuffer) {
                    var index = plotLineBuffer.findInsertionIndex(cutoff);
                    if (index > 0) {
                        // Leave one point untrimmed, such that line will
                        // continue off left edge of visible plot area.
                        plotLineBuffer.trim(index - 1);
                    }
                }

                if (fixedDuration !== undefined &&
                        domainExtrema !== undefined &&
                            (domainExtrema[1] - domainExtrema[0] > fixedDuration)) {
                    cutoff = domainExtrema[1] - fixedDuration;
                    bufferArray.forEach(enforceDurationForBuffer);
                    updateBounds(); // Extrema may have changed now
                }
            }

            // Add latest data for this domain object
            function addPointFor(domainObject) {
                var line = lines[domainObject.getId()];
                if (line) {
                    line.addPoint(
                        handle.getDomainValue(domainObject, domain),
                        handle.getRangeValue(domainObject, range)
                    );
                }
            }

            // Handle new telemetry data
            function update() {
                var objects = handle.getTelemetryObjects();

                // Initialize domain offset if necessary
                if (domainOffset === undefined) {
                    initializeDomainOffset(objects.map(function (obj) {
                        return handle.getDomainValue(obj, domain);
                    }).filter(function (value) {
                        return typeof value === 'number';
                    }));
                }

                // Make sure lines are available
                prepareLines(objects);

                // Add new data
                objects.forEach(addPointFor);

                // Then, update extrema
                updateBounds();
            }

            // Add historical data for this domain object
            function setHistorical(domainObject, series) {
                var count = series ? series.getPointCount() : 0,
                    line;

                // Nothing to do if it's an empty series
                if (count < 1) {
                    return;
                }

                // Initialize domain offset if necessary
                if (domainOffset === undefined) {
                    initializeDomainOffset([
                        series.getDomainValue(0, domain),
                        series.getDomainValue(count - 1, domain)
                    ]);
                }

                // Make sure lines are available
                prepareLines(handle.getTelemetryObjects());

                // Look up the line for this domain object
                line = lines[domainObject.getId()];

                // ...and put the data into it.
                if (line) {
                    line.addSeries(series, domain, range);
                }

                // Update extrema
                updateBounds();
            }

            // Use a default MAX_POINTS if none is provided
            maxPoints = maxPoints !== undefined ? maxPoints : MAX_POINTS;

            // Initially prepare state for these objects.
            // Note that this may be an empty array at this time,
            // so we also need to check during update cycles.
            update();

            return {
                /**
                 * Get the dimensions which bound all data in the provided
                 * data sets. This is given as a two-element array where the
                 * first element is domain, and second is range.
                 * @returns {number[]} the dimensions which bound this data set
                 */
                getDimensions: function () {
                    return dimensions;
                },
                /**
                 * Get the origin of this data set's boundary.
                 * This is given as a two-element array where the
                 * first element is domain, and second is range.
                 * The domain value here is not adjusted by the domain offset.
                 * @returns {number[]} the origin of this data set's boundary
                 */
                getOrigin: function () {
                    // Pad range if necessary
                    return origin;
                },
                /**
                 * Get the domain offset; this offset will have been subtracted
                 * from all domain values in all buffers returned by this
                 * preparer, in order to minimize loss-of-precision due to
                 * conversion to the 32-bit float format needed by WebGL.
                 * @returns {number} the domain offset
                 */
                getDomainOffset: function () {
                    return domainOffset;
                },
                /**
                 * Get all renderable buffers for this data set. This will
                 * be returned as an array which can be correlated back to
                 * the provided telemetry data objects (from the constructor
                 * call) by index.
                 *
                 * Internally, these are flattened; each buffer contains a
                 * sequence of alternating domain and range values.
                 *
                 * All domain values in all buffers will have been adjusted
                 * from their original values by subtraction of the domain
                 * offset; this minimizes loss-of-precision resulting from
                 * the conversion to 32-bit floats, which may otherwise
                 * cause aliasing artifacts (particularly for timestamps)
                 *
                 * @returns {Float32Array[]} the buffers for these traces
                 */
                getLineBuffers: function () {
                    return bufferArray;
                },
                /**
                 * Update with latest data.
                 */
                update: update,
                /**
                 * Fill in historical data.
                 */
                addHistorical: setHistorical
            };
        }

        return PlotUpdater;

    }
);
