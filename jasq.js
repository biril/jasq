//     Jasq v0.1.0 - AMD dependency injector integrated with Jasmine

//     https://github.com/biril/jasq
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013 Alex Lambiris

/*jshint browser:true */
/*global define:false */

define(["squire"], function (Squire) {

    "use strict";

    var

        // Helpers
        noOp = function () {},
        isString = function (s) {
            return Object.prototype.toString.call(s) === "[object String]";
        },
        isFunction = function (f) {
            return Object.prototype.toString.call(f) === "[object Function]";
        },
        isStrictlyObject = function (o) {
            return Object.prototype.toString.call(o) === "[object Object]";
        },
        each = function (array, iterator) {
            for (var i = 0, l = array.length; i < l; ++i) { iterator(array[i], i); }
        },

        // Check if given `descibe` / `xdescribe` args are such that should be handled by jasq
        //  `describe` / `xdescribe` instead of Jasmine's native versions. This would be the case
        //  if the arguments are
        //   * 1. suite description (string)
        //   * 2. module name (string)
        //   * 3. spec definitions (function)
        isArgsForJasqDescribe = function (args) {
            return isString(args[0]) && isString(args[1]) && isFunction(args[2]);
        },

        // Check if given `it` / `xit` args are such that should be handled by jasq `it` / `xit`
        //  instead of Jasmine's native versions. This would be the case if the arguments are
        //   * 1. spec description (string)
        //   * 2. spec config (hash)
        isArgsForJasqIt = function (args) {
            return isString(args[0]) && isStrictlyObject(args[1]);
        },

        // Get the 'path' of given suite. A suite's path is defined as an array of suite
        //  descriptions where
        //  * `path[0]`: descr. of the outermost defined suite == (n-1)th parent of current suite
        //  * `path[1]`: descr. of (n-2)th parent of current suite
        //  * `path[path.length - 1]`: descr. of current suite
        getSuitePath = function (suite) {
            var suitePath = [];
            while (suite) {
                suitePath.unshift(suite.description);
                suite = suite.parentSuite;
            }
            return suitePath;
        },

        // A mapping of suites to modules. When mapped to a suite, a module will be made available
        //  to all specs defined within _that_ (or any _nested_) suite. Suites are identified by
        //  path (see `getSuitePath`), modules are identified by name
        suitesToModules = (function () {
            var m = [],
                areEqualSuitePaths = function (p1, p2) {
                    for (var i = Math.max(p1.length, p2.length) - 1; i >= 0; --i) {
                        if (p1[i] !== p2[i]) { return false; }
                    }
                    return true;
                },
                findSuite = function (suitePath, opts) {
                    isFunction(opts) && (opts = { onFound: opts });
                    opts.onFound || (opts.onFound = noOp);
                    opts.onNotFound || (opts.onNotFound = noOp);
                    for (var i = m.length - 1; i >= 0; --i) {
                        if (areEqualSuitePaths(m[i].suitePath, suitePath)) {
                            return opts.onFound(i);
                        }
                    }
                    return opts.onNotFound();
                };

            return {
                add: function (suitePath, moduleName) {
                    return findSuite(suitePath, {
                        onFound: function () {
                            throw "Cannot add mapping - suite '" + suitePath + "' already has module '" + moduleName + "' mapped to it";
                        },
                        onNotFound: function () {
                            m.push({ suitePath: suitePath, moduleName: moduleName });
                        }
                    });
                },
                remove: function (suitePath) {
                    return findSuite(suitePath, {
                        onFound: function (i) {
                            return m.splice(i, 1);
                        },
                        onNotFound: function () {
                            throw "Cannot remove mapping - suite '" + suitePath + "'' not present in mappings";
                        }
                    });
                },
                removeIfFound: function (suitePath) {
                    return findSuite(suitePath, function (i) {
                        return m.splice(i, 1);
                    });
                },
                get: function (suitePath) {
                    var mod = null;
                    while (suitePath.length) {
                        mod = findSuite(suitePath, function (i) {
                            return m[i].moduleName;
                        });

                        if (mod) { return mod; }

                        suitePath.pop();
                    }
                    throw "Cannot get module for suite '" + suitePath + "' - given suite not present in mappings";
                }
            };
        }()),

        //
        jasmineEnv = null,

        // Jasmine's native (non-jasq-patched) global API
        jasmineNativeApi = {},

        //
        apiNames = ["describe", "xdescribe", "it", "xit"],

        //
        jasq = {},

        // Get a value indicating whether Jasmine is available on the global scope
        isJasmineInGlobalScope = function () {
            return window.jasmine && isFunction(window.jasmine.getEnv);
        },

        // Get the jasq version of Jasmine's `(x)describe`
        getJasqDescribe = function (isX) {
            var
                // Native Jasmine version
                jasmineNative = jasmineNativeApi[isX ? "xdescribe" : "describe"],

                // Jasq version
                //  * `suiteDescription`: Description of this suite, as in Jasmine's native
                //      `describe`
                //  * `moduleName`: Name of the module to which this test suite refers
                //  * `specDefinitions`: The function to execute the suite's specs: A callback to
                //      be invoked without any arguments
                jasqVersion = function (suiteDescription, moduleName, specDefinitions) {

                    // If given arguments are not appropriate for the jasq version of `(x)describe`
                    //  then just run the native Jasmine version
                    if (!isArgsForJasqDescribe(arguments)) {
                        return jasmineNative.apply(null, arguments);
                    }

                    // Map given module (name) to given suite (path).
                    //
                    // It is assumed here that suite paths are unique within the mappings.
                    //  `suitesToModules.add` will throw in the event that a mapping is attempted
                    //  to a pre-existing suite (path). This will generally not happen as
                    //   * mappings are cleared whenever suites complete (see `init`/`MapSweeper`)
                    //   * disabled suites (which _never_ complete) are not mapped at all (`isX`
                    //     indicates that this is in fact a disabled suite)
                    //
                    // To create the mapping, the path of the suite to-be-created is needed. A
                    //  suite instance for the latter does not yet exist so we'll have to build the
                    //  path by concatenating this new suite's description with the parent suite's
                    //  path (if there is one)
                    if (!isX) {
                        suitesToModules.add(getSuitePath(jasmineEnv.currentSuite).concat(suiteDescription), moduleName);
                    }

                    // Ultimately, the native Jasmine version is run. The crucial step was creating
                    //  the mapping above, for later use in `it`-specs
                    return jasmineNative(suiteDescription, specDefinitions || noOp);
                };

            jasqVersion.isJasq = true;
            return jasqVersion;
        },

        // Get the jasq version of Jasmine's `(x)it`
        getJasqIt = function (isX) {
            var
                // Native Jasmine version
                jasmineNative = jasmineNativeApi[isX ? "xit" : "it"],

                // Jasq version
                //  * `specDescription`: Description of this spec, as in Jasmine's native `it`
                //  * `specConfig`: A hash containing:
                //      * `store`: An array of neames of the modules to 'store': These will be
                //          exposed in the spec through `dependencies.store` - a hash of modules
                //      * `mock`: A hash of mocks, mapping module (name) to mock. These will be
                //          exposed in the spec through `dependencies.mocks` - a hash of modules
                //      * `expect`: The expectation function: A callback to be invoked with
                //          `module` and `dependencies` arguments
                jasqVersion = function (specDescription, specConfig) {

                    // If given arguments are not appropriate for the jasq version of `(x)it`
                    //  then just run the native Jasmine version
                    if (!isArgsForJasqIt(arguments)) {
                        return jasmineNative.apply(null, arguments);
                    }

                    // Get the appropriate module (name) using mapping set up during a previous
                    //  call to `describe`
                    var moduleName = suitesToModules.get(getSuitePath(jasmineEnv.currentSuite));

                    // Execute Jasmine's `(x)it` on an appropriately modified _asynchronous_ spec
                    jasmineNative(specDescription, function () {

                        var isSpecTested = false;

                        // Create a new injector ..
                        (new Squire())

                        // .. specify mocked dependencies as requested ..
                        .mock(specConfig.mock || {})

                        // .. specify stored dependencies as requesetd ..
                        .store(specConfig.store || [])

                        // .. and require the module along with all its (mocked / stored) deps
                        .require([moduleName, 'mocks'], function (module, dependencies) {

                            // After module & deps are loaded, just run the original spec. Stored
                            //  dependencies should be available through the `dependencies.store`
                            //  hash. Mocked dependencies should be available through the
                            //  `dependencies.mocks` hash
                            specConfig.expect(module, dependencies);

                            isSpecTested = true;
                        });

                        window.waitsFor(function () { return isSpecTested; });
                    });
                };

            jasqVersion.isJasq = true;
            return jasqVersion;
        },

        // Init: Ensure that `jasmineEnv` and `jasmineNativeApi` have been set and create the
        //  patched version of Jasmine's API. It will only run once
        init = function () {
            if (!isJasmineInGlobalScope()) {
                throw "Jasmine is not available in global scope (not loaded?)";
            }

            // Store Jasmine's globals
            jasmineEnv = window.jasmine.getEnv();
            each(apiNames, function (name) { jasmineNativeApi[name] = window[name]; });

            // Create patched version of Jasmine's API
            each(apiNames, function (name) {
                jasq[name] = (function () {
                    switch (name) {
                        case "describe":  return getJasqDescribe();
                        case "xdescribe": return getJasqDescribe(true);
                        case "it":        return getJasqIt();
                        case "xit":       return getJasqIt(true);
                    }
                }());
            });

            // Register the map-sweeper as a jasmine-reporter to perform housekeeping on the map of
            //  suites-to-modules. It will wait for suites to finish and remove the relevant
            //  mapping, if one is found. Besides keeping the map from growing indefinitely, this
            //  is also necessary to allow the definition of multiple suites with the same
            //  description.
            jasmineEnv.addReporter((function () {
                var MapSweeper = function () {};
                MapSweeper.prototype = new window.jasmine.Reporter();
                MapSweeper.prototype.reportSuiteResults = function (suite) {
                    suitesToModules.removeIfFound(getSuitePath(suite));
                };
                return new MapSweeper();
            }()));

            // Don't `init` more than once
            init = noOp;
        };

    //
    jasq.applyGlobals = function () {
        init();
        each(apiNames, function (name) { window[name] = jasq[name]; });
    },

    //
    jasq.resetGlobals = function () {
        init();
        each(apiNames, function (name) { window[name] = jasmineNativeApi[name]; });
    };

    // If Jasmine is already in global scope then go ahead and apply globals - this will also
    //  initialize jasq
    if (isJasmineInGlobalScope()) { jasq.applyGlobals(); }

    return jasq;
});
