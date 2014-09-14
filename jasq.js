//     Jasq v0.3.1 - AMD dependency injector integrated with Jasmine

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
    extend = function () {
      var target = {};
      each(arguments, function (source) {
        each(source, function (v, k) { target[k] = v; });
      });
      return target;
    },
    cloneArray = function (array) {
      var clone = [];
      each(array, function (element) { clone.push(element); });
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
    // [configuration options](http://requirejs.org/docs/api.html#config), except for the
    // context itself, are copied over from the default context `_`
    configRequireForContext = function (contextId) {
      var c = {};
      each(require.s.contexts._.config, function (val, key) {
        if (key !== "deps") { c[key] = val; }
      });
      c.context = contextId;
      return require.config(c);
    },

    // Parse arguments given when invoking the jasq-version of `descibe` / `xdescribe` and
    //  return a hash containing `moduleName`, `mock` and `specify`. Return null if the
    //  arguments are such that should be handled by Jasmine's native `describe` instead. For
    //  the jasq-version, we're expecting
    //   * 1. suite description (string)
    //   * 2. module name (string)
    //   * 3. spec definitions (function)
    // OR
    //   * 1. suite description (string)
    //   * 2. suite config (object)
    parseArgsForJasqDescribe = function (args) {
      if (isString(args[0]) && isString(args[1]) && isFunction(args[2])) {
        return {
          moduleName: args[1],
          specify: args[2]
        };
      }

      if (isString(args[0]) && isStrictlyObject(args[1])) { return args[1]; }

      return null;
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

    // Path of the 'current suite'. Holds the path of the suite that is currently being defined
    //  OR currently being executed - these never overlap
    curSuitePath = [],

    // A collection of test-suite configurations. A configuration is uniquely identified by the
    //  path of the suite it refers to and includes the (name of the) module under test and
    //  optionally a mocking function. The module specified in the suite's configuration will
    //  be made available to all specs defined within that (or any _nested_) suite. The mocking
    //  function, if present in the configuration, will be invoked on every spec to instantiate
    //  mocks. (Mocks defined on the spec itself (in the specConfig provided during the
    //  invocation of `it`) will override those defined in the suiteConfig)
    //
    // Suite configs are added to the collection during `describe`. They are removed by the
    //  `SuiteConfigSweeper` jasmine reporter, when suites are complete
    suiteConfigs = (function () {
        var
          configs = [],
          areEqualSuitePaths = function (p1, p2) {
            for (var i = Math.max(p1.length, p2.length) - 1; i >= 0; --i) {
              if (p1[i] !== p2[i]) { return false; }
            }
            return true;
          },
          findBySuitePath = function (suitePath, callbacks) {
            isFunction(callbacks) && (callbacks = { onFound: callbacks });
            callbacks.onFound || (callbacks.onFound = noOp);
            callbacks.onNotFound || (callbacks.onNotFound = noOp);
            for (var i = configs.length - 1; i >= 0; --i) {
              if (areEqualSuitePaths(configs[i].suitePath, suitePath)) {
                return callbacks.onFound(i);
              }
            }
            return callbacks.onNotFound();
          };

        return {
          add: function (suitePath, moduleName, mock) {
            return findBySuitePath(suitePath, {
              onFound: function () {
                throw "Cannot add mapping - suite '" + suitePath + "' already has module '" + moduleName + "' mapped to it";
              },
              onNotFound: function () {
                configs.push({
                  suitePath: cloneArray(suitePath),
                  moduleName: moduleName,
                  mock: mock
                });
              }
            });
          },
          remove: function (suitePath, failHard) {
            return findBySuitePath(suitePath, {
              onFound: function (i) {
                return configs.splice(i, 1);
              },
              onNotFound: function () {
                if (failHard) {
                  throw "Cannot remove mapping - suite '" + suitePath + "'' not present in mappings";
                }
              }
            });
          },
          get: function (suitePath, failHard) {
            var found = null;
            while (suitePath.length) {
              found = findBySuitePath(suitePath, function (i) {
                return configs[i];
              });

              if (found) {
                return found;
              }

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

    // Create a function to execute the spec of given `specDescription` and `specConfig` after
    //  (re)loading the tested module and mocking its dependencies as specified at the
    //  (current) suite and (given) spec level
    createSpec = function (specDescription, specConfig) {

      var contextId, load, suiteConfig, mock;

      // Mods will load in a new requirejs context, specific to this spec. This is its id
      contextId = createContextId(curSuitePath, specDescription);

      // Create the context, configuring require appropriately and obtaining a loader
      load = configRequireForContext(contextId);

      // Configuration of current suite (name of module to load & mock function, if any)
      suiteConfig = suiteConfigs.get(curSuitePath) || {};

      // Modules to mock, as specified at the suite level as well as the spec level
      mock = extend(suiteConfig.mock ? suiteConfig.mock() : {}, specConfig.mock);

      return function (done) {
        // Re-define modules using given mocks (if any), before they're loaded
        each(mock, function (mod, modName) { define(modName, mod); });

        // And require the tested module
        load(suiteConfig.moduleName ? [suiteConfig.moduleName] : [], function (module) {

          // After module & deps are loaded, just run the original spec's expectations.
          //  Dependencies (mocked and non-mocked) should be available through the
          //  `dependencies` hash. (Note that a (shallow) copy of dependencies is passed, to
          //  avoid exposing the original hash that require maintains)
          specConfig.expect(module, extend(require.s.contexts[contextId].defined), done);

          // In the event that the expectation-function is _not_ meant to complete
          //  asynchronously (<=> the expectation-function did _not_ 'request' a `done`
          //  argument) then it's already completed. Invoke `done`
          if (specConfig.expect.length < 3) {
            done();
          }
        });
      };
    },

    // Get the jasq version of Jasmine's `(x)describe`
    getJasqDescribe = function (isX) {

      var jasmineDescribe = jasmineNativeApi[isX ? "xdescribe" : "describe"];

      // Jasq version
      //  * `suiteDescription`: Description of this suite, as in Jasmine's native `describe`
      //  * `moduleName`: Name of the module to which this test suite refers
      //  * `specify`: The function to execute the suite's specs, as in Jasmine's `describe`
      // OR
      //  * `suiteDescription`: Description of this suite, as in Jasmine's native `describe`
      //  * `suiteConfig`: Configuration of the suite containing
      //      * `moduleName`: Name of the module to which this test suite refers
      //      * `mock`: Optionally a function that returns a hash of mocks
      //      * `specify`: The function to execute the suite's specs
      return function (suiteDescription) {

        var args, suitePath, ret;

        // Parse given arguments as if they were suitable for the jasq-version of
        //  `describe`. `args` will be null if they're not, otherwise it will contain
        //  the expected `moduleName`, `mock` and `specify` properties
        args = parseArgsForJasqDescribe(arguments);

        // Path of current suite. To be set later on, if needed
        suitePath = null;

        // If given arguments are not appropriate for the jasq version of `(x)describe`
        //  then just run the native Jasmine version
        // if (!isArgsForJasqDescribe(arguments)) {
        if (!args) { return jasmineDescribe.apply(null, arguments); }

        // Map given module (name) to given suite (path).
        //
        // It is assumed here that suite paths are unique within the mappings.
        //  `suiteConfigs.add` will throw in the event that a mapping is attempted
        //  to a pre-existing suite (path). This will generally not happen as
        //   * mappings are cleared whenever suites complete (see `init`/`MapSweeper`)
        //   * disabled suites (which _never_ complete) are not mapped at all (`isX`
        //     indicates that this is in fact a disabled suite)
        //
        // To create the mapping, the path of the suite to-be-created is needed. A
        //  suite instance for the latter does not yet exist so we'll have to build the
        //  path by concatenating this new suite's description with the parent suite's
        //  path (if there is one)
        curSuitePath.push(suiteDescription);

        if (!isX) {
          // suitePath = getSuitePath(jasmineEnv.currentSuite).concat(suiteDescription);
          // suiteConfigs.add(suitePath, args.moduleName, args.mock);
          suiteConfigs.add(curSuitePath, args.moduleName, args.mock);
        }

        // Ultimately, the native Jasmine version is run. The crucial step was creating
        //  the mapping above, for later use in `it`-specs
        ret = jasmineDescribe(suiteDescription, args.specify);
        curSuitePath.pop();
        return ret;
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

        // In the event that there's no mapped module to pass to the spec the just run the
        //  native Jasmine version - this will avoid forcing spec to run asynchronously.
        //  Also run the native version in the case the the caller invoked `xit` - the spec
        //  will not execute so there's no reason to incur the module (re)loading overhead
        if (!suiteConfigs.get(curSuitePath) || isX) {

          // We tolerate the caller passing an expectation-hash into a spec which is not
          //  part of a jasq-suite - we just keep the expectation function and ignore
          //  everything else
          if (isStrictlyObject(specConfig)) {
            specConfig = specConfig.expect;
          }

          return jasmineIt.call(null, specDescription, specConfig);
        }

        // Create a specConfig, in case the caller passed an expectation-function instead
        if (!isStrictlyObject(specConfig)) {
            specConfig = { expect: specConfig };
        }

        // Execute Jasmine's `(x)it` on an appropriately modified _asynchronous_ spec
        return jasmineIt(specDescription, createSpec(specDescription, specConfig));
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

      // Register the suiteConfigSweeper as a jasmine-reporter to perform housekeeping on
      //  the collection of suite-configs. It will wait for suites to finish and remove the
      //  relevant config, if one is found. Besides keeping the collection from growing
      //  indefinitely, this also allows definining multiple suites with the same path
      jasmineEnv.addReporter((function () {
        var SuiteConfigSweeper = function () {
            this.suiteStarted = function (suite) {
              curSuitePath.push(suite.description);
            };
            this.suiteDone = function (suite) {
              // Expecting `curSuitePath[curSuitePath.length - 1] === suite.description)`
              suiteConfigs.remove(curSuitePath);
              curSuitePath.pop();
            };
          };
        return new SuiteConfigSweeper();
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
