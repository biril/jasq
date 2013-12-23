//     Jasq v0.2.0 - AMD dependency injector integrated with Jasmine

//     https://github.com/biril/jasq
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013 Alex Lambiris

/*jshint browser:true */
/*global define:false, require:false */

define(function () {

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
        each = function (obj, iterator) {
            var i, l, key;
            if (!obj) { return; }
            if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
                obj.forEach(iterator);
                return;
            }
            if (obj.length === +obj.length) {
                for (i = 0, l = obj.length; i < l; i++) { iterator(obj[i], i, obj); }
                return;
            }
            for (key in obj) {
                if (obj.hasOwnProperty(key)) { iterator(obj[key], key, obj); }
            }
        },
        clone = function (obj) {
            var clone = {};
            each(obj, function (v, k) { clone[k] = v; });
            return clone;
        },

        // Generate a context-id for given `suiteDescription` / `specDescription` pair
        createContextId = (function () {
            var uid = 0;
            return function (suiteDescription, specDescription) {
                return suiteDescription + " " + specDescription + " " + (uid++);
            };
        }()),

        // Re-configure require for context of given id, getting a loader-function. All requirejs
        // options (except for the context itself) are copied over from the default context `_`
        configRequireForContext = function (contextId) {
            var c = {}, _require = null;
            each(require.s.contexts._.config, function (val, key) {
                if (key !== "deps") { c[key] = val; }
            });
            c.context = contextId;
            return require.config(c);
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
        //  * `path[0]`: descr. of the top-level suite == (n-1)th parent of current suite
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
                remove: function (suitePath, failHard) {
                    return findSuite(suitePath, {
                        onFound: function (i) {
                            return m.splice(i, 1);
                        },
                        onNotFound: function () {
                            if (failHard) {
                                throw "Cannot remove mapping - suite '" + suitePath + "'' not present in mappings";
                            }
                        }
                    });
                },
                get: function (suitePath, failHard) {
                    var mod = null;
                    while (suitePath.length) {
                        mod = findSuite(suitePath, function (i) {
                            return m[i].moduleName;
                        });

                        if (mod) { return mod; }

                        suitePath.pop();
                    }
                    if (failHard) {
                        throw "Cannot get module for suite '" + suitePath + "' - given suite not present in mappings";
                    }
                    return null;
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

        // Execute spec given path of suite it belongs to, description and configuration
        executeSpec = function (currentSuitePath, specDescription, specConfig) {

            var
                // Mods will be loaded inside a new requirejs context. This is its id
                contextId = createContextId(currentSuitePath, specDescription),

                // Configure require for created context, getting an appropriate loader
                load = configRequireForContext(contextId),

                // The name of the module to load for this spec
                moduleName = suitesToModules.get(currentSuitePath),

                // This Jasmine spec is async (due to the async `.load` call it includes) so it'll
                //  have to wait for `isSpecTested` to turn true
                isSpecTested = false;

            // Re-define modules using given mocks (if any), before they're loaded
            each(specConfig.mock, function (mod, modName) { define(modName, mod); });

            // And require the tested module
            load([moduleName], function (module) {

                // After module & deps are loaded, just run the original spec. Dependencies
                //  (mocked and non-mocked) should be available through the `dependencies` hash.
                //  (Note that a dependencies 'clone' is passed to avoid exposing the original
                //  hash that require maintains)
                specConfig.expect(module, clone(require.s.contexts[contextId].defined));

                isSpecTested = true;
            });
        },

        // Get the jasq version of Jasmine's `(x)describe`
        getJasqDescribe = function (isX) {

            var jasmineDescribe = jasmineNativeApi[isX ? "xdescribe" : "describe"];

            // Jasq version
            //  * `suiteDescription`: Description of this suite, as in Jasmine's native
            //      `describe`
            //  * `moduleName`: Name of the module to which this test suite refers
            //  * `specDefinitions`: The function to execute the suite's specs: A callback to
            //      be invoked without any arguments
            return function (suiteDescription, moduleName, specDefinitions) {

                // If given arguments are not appropriate for the jasq version of `(x)describe`
                //  then just run the native Jasmine version
                if (!isArgsForJasqDescribe(arguments)) {
                    return jasmineDescribe.apply(null, arguments);
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
                return jasmineDescribe(suiteDescription, specDefinitions || noOp);
            };
        },

        // Get the jasq version of Jasmine's `(x)it`
        getJasqIt = function (isX) {

            var jasmineIt = jasmineNativeApi[isX ? "xit" : "it"];

            // Jasq version
            //  * `specDescription`: Description of this spec, as in Jasmine's native `it`
            //  * `specConfig`: A hash containing:
            //      * `store`: An array of neames of the modules to 'store': These will be
            //          exposed in the spec through `dependencies.store` - a hash of modules
            //      * `mock`: A hash of mocks, mapping module (name) to mock. These will be
            //          exposed in the spec through `dependencies.mocks` - a hash of modules
            //      * `expect`: The expectation function: A callback to be invoked with
            //          `module` and `dependencies` arguments
            return function (specDescription, specConfig) {

                var currentSuitePath = getSuitePath(jasmineEnv.currentSuite);

                // If given arguments are not appropriate for the jasq-version of `(x)it` ..
                if (!isArgsForJasqIt(arguments)) {

                    //  .. _and_ there's no mapped module to pass to the spec then just run
                    //  the native Jasmine version. Also run the native version in the case
                    //  that the caller invoked `xit` (the spec will not execute so there's
                    //  no reason to incur the module (re)loading overhead) ..
                    if (!suitesToModules.get(currentSuitePath) || isX) {
                        return jasmineIt.apply(null, arguments);
                    }

                    // .. but if there _is_ a mapped module then it should be passed into the
                    //  spec. To do that, an ad-hoc `specConfig` is created and we continue as
                    //  if the caller explicitly invoked the jasq-version of `(x)it`
                    specConfig = { expect: specConfig };
                }

                // Execute Jasmine's `(x)it` on an appropriately modified _asynchronous_ spec
                jasmineIt(specDescription, function () {
                    executeSpec(currentSuitePath, specDescription, specConfig);
                });
            };
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
            jasq.describe  = getJasqDescribe();
            jasq.xdescribe = getJasqDescribe(true);
            jasq.it        = getJasqIt();
            jasq.xit       = getJasqIt(true);

            each(apiNames, function (name) { jasq[name].isJasq = true; });

            // Register the map-sweeper as a jasmine-reporter to perform housekeeping on the map of
            //  suites-to-modules. It will wait for suites to finish and remove the relevant
            //  mapping, if one is found. Besides keeping the map from growing indefinitely, this
            //  also allows definining multiple suites with the same path
            jasmineEnv.addReporter((function () {
                var MapSweeper = function () {};
                MapSweeper.prototype = new window.jasmine.Reporter();
                MapSweeper.prototype.reportSuiteResults = function (suite) {
                    suitesToModules.remove(getSuitePath(suite));
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
    };

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
