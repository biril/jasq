/*global define, ok */
define(function () {
    "use strict";

    var

        isFunction = function (f) {
            return Object.prototype.toString.call(f) === "[object Function]";
        },
        isArray = function (o) {
            return Object.prototype.toString.call(o) === "[object Array]";
        },
        isStrictlyObject = function (o) {
            return Object.prototype.toString.call(o) === "[object Object]";
        },
        each = function (array, iterator) {
            for (var i = 0, l = array.length; i < l; ++i) { iterator(array[i], i); }
        },
        find = function (array, iterator) {
            for (var i = 0, l = array.length; i < l; ++i) {
                if (iterator(array[i], i)) {
                    return array[i];
                }
            }
        },

        // Get a value indicating whether given suite-paths are equal, i.e. refer to the same suite
        areEqualSuitePaths = function (p1, p2) {
            for (var i = Math.max(p1.length, p2.length) - 1; i >= 0; --i) {
                if (p1[i] !== p2[i]) { return false; }
            }
            return true;
        },

        // Assert that Jasmine spec of given `specDescription` executed as part of given
        //  `specSuite` and did not fail
        okSpec = function (specSuite, specDescription) {
            var isSpecPassed = function () {
                    var theSpec = find(specSuite.specs, function (spec) {
                            return specDescription === spec.description;
                        });
                    return theSpec && !theSpec.failedExpectations.length;
                };
            ok(isSpecPassed(), specSuite.path.join(" ") + " " + specDescription + " [has passed]");
        },

        // A Jasmine reporter which is used to track the completion of Jasmine test suites in
        //  order to execute registered post-completion processors. (These perform a number of
        //  (QUnit) assertions on the completed Jasmine test suite)
        SuiteWatcher = function () {
            this.currentSuitePath = [];
            this.suites = [];

            this._getSuiteIndex = function (suitePath) {
                for (var i = this.suites.length - 1; i >= 0; --i) {
                    if (areEqualSuitePaths(this.suites[i].path, suitePath)) {
                        return i;
                    }
                }
                return -1;
            };

            this.suiteStarted = function (startedSuite) {
                this.currentSuitePath.push(startedSuite.description);
            };

            this.specDone = function (completedSpec) {
                var currentSuite = this.suites[this._getSuiteIndex(this.currentSuitePath)];
                if (currentSuite) {
                    currentSuite.specs.push(completedSpec);
                }
            };

            this.suiteDone = function (completedSuite) {
                var currentSuiteIndex = this._getSuiteIndex(this.currentSuitePath);
                if (this.currentSuitePath.pop() !== completedSuite.description) {
                    throw "Completed suite '" + completedSuite.description + "' does not match current";
                }
                if (currentSuiteIndex !== -1) {
                    var suite = this.suites[currentSuiteIndex];
                    this.suites.splice(currentSuiteIndex, 1);
                    suite.processor(suite);
                }
            };

            // Register a `processor` to execute when suite of given `suitePath` completes
            this.onCompleted = function (suitePath, processor) {
                !isArray(suitePath) && (suitePath = [suitePath]);
                if(this._getSuiteIndex(suitePath) !== -1) {
                    throw "Suite '" + suitePath.join(" ") + "' is already tracked";
                }
                this.suites.push({
                    path: suitePath,
                    specs: [],
                    processor: processor
                });

                return this; // Chain
            };
        },

        // `startSuiteWatcher` will only instantiate a single SuiteWatcher instance and register
        //  it as a Jasmine reporter once. Subsequent calls will return the one-and-only instance
        suiteWatcher = null,
        startSuiteWatcher = function (jasmine) {
            var suiteWatcher = new SuiteWatcher();
            jasmine.getEnv().addReporter(suiteWatcher);
            startSuiteWatcher = function () {
                return suiteWatcher;
            };
            return suiteWatcher;
        };

    return {
        isFunction: isFunction,
        isStrictlyObject: isStrictlyObject,
        each: each,
        okSpec: okSpec,
        startSuiteWatcher: startSuiteWatcher
    };

});
