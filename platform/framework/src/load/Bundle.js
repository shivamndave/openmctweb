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
    ['../Constants', './Extension'],
    function (Constants, Extension) {
        "use strict";


        /**
         * A bundle's plain JSON definition.
         *
         * @name BundleDefinition
         * @property {string} name the human-readable name of this bundle
         * @property {string} sources the name of the directory which
         *           contains source code used by this bundle
         * @property {string} resources the name of the directory which
         *           contains resource files used by this bundle
         * @property {Object.<string,ExtensionDefinition[]>} [extensions={}]
         *           all extensions exposed by this bundle
         */


        /**
         * Instantiate a new reference to a bundle, based on its human-readable
         * definition.
         *
         * @param {string} path the path to the directory containing
         *        this bundle
         * @param {BundleDefinition} bundleDefinition
         * @returns {{getDefinition: Function}}
         * @constructor
         */
        function Bundle(path, bundleDefinition) {
            // Start with defaults
            var definition = Object.create(Constants.DEFAULT_BUNDLE),
                logName = path,
                self;

            // Utility function for resolving paths in this bundle
            function resolvePath(elements) {
                return [path].concat(elements || []).join(Constants.SEPARATOR);
            }

            // Override defaults with specifics from bundle definition
            Object.keys(bundleDefinition).forEach(function (k) {
                definition[k] = bundleDefinition[k];
            });

            // Record path to bundle in definition
            definition.path = path;

            // Build up the log-friendly name for this bundle
            if (definition.key || definition.name) {
                logName += "(";
                logName += definition.key || "";
                logName += (definition.key && definition.name) ? " " : "";
                logName += definition.name || "";
                logName += ")";
            }

            self = {
                /**
                 * Get the path to this bundle.
                 * @memberof Bundle#
                 * @returns {string}
                 */
                getPath: function () {
                    return path;
                },
                /**
                 * Get the path to this bundle's source folder. If an
                 * argument is provided, the path will be to the source
                 * file within the bundle's source file.
                 *
                 * @memberof Bundle#
                 * @param {string} [sourceFile] optionally, give a path to
                 *        a specific source file in the bundle.
                 * @returns {string}
                 */
                getSourcePath: function (sourceFile) {
                    var subpath = sourceFile ?
                            [ definition.sources, sourceFile ] :
                            [ definition.sources ];

                    return resolvePath(subpath);
                },
                /**
                 * Get the path to this bundle's resource folder. If an
                 * argument is provided, the path will be to the resource
                 * file within the bundle's resource file.
                 *
                 * @memberof Bundle#
                 * @param {string} [resourceFile] optionally, give a path to
                 *        a specific resource file in the bundle.
                 * @returns {string}
                 */
                getResourcePath: function (resourceFile) {
                    var subpath = resourceFile ?
                            [ definition.resources, resourceFile ] :
                            [ definition.resources ];

                    return resolvePath(subpath);
                },
                /**
                 * Get the path to this bundle's library folder. If an
                 * argument is provided, the path will be to the library
                 * file within the bundle's resource file.
                 *
                 * @memberof Bundle#
                 * @param {string} [libraryFile] optionally, give a path to
                 *        a specific library file in the bundle.
                 * @returns {string}
                 */
                getLibraryPath: function (libraryFile) {
                    var subpath = libraryFile ?
                            [ definition.libraries, libraryFile ] :
                            [ definition.libraries ];

                    return resolvePath(subpath);
                },
                /**
                 * Get library configuration for this bundle. This is read
                 * from the bundle's definition; if the bundle is well-formed,
                 * it will resemble a require.config object.
                 * @memberof Bundle#
                 * @returns {object}
                 */
                getConfiguration: function () {
                    return definition.configuration || {};
                },
                /**
                 * Get a log-friendly name for this bundle; this will
                 * include both the key (machine-readable name for this
                 * bundle) and the name (human-readable name for this
                 * bundle.)
                 * @returns {string} log-friendly name for this bundle
                 */
                getLogName: function () {
                    return logName;
                },
                /**
                 * Get all extensions exposed by this bundle of a given
                 * category.
                 *
                 * @param category
                 * @memberof Bundle#
                 * @returns {Array}
                 */
                getExtensions: function (category) {
                    var extensions = definition.extensions[category] || [];

                    return extensions.map(function objectify(extDefinition) {
                        return new Extension(self, category, extDefinition);
                    });
                },
                /**
                 * Get a list of all categories of extension exposed by
                 * this bundle.
                 *
                 * @memberof Bundle#
                 * @returns {Array}
                 */
                getExtensionCategories: function () {
                    return Object.keys(definition.extensions);
                },
                /**
                 * Get the plain definition of this bundle, as read from
                 * its JSON declaration.
                 *
                 * @memberof Bundle#
                 * @returns {BundleDefinition} the raw definition of this bundle
                 */
                getDefinition: function () {
                    return definition;
                }
            };

            return self;
        }

        return Bundle;
    }
);