/*jshint browser:true */
/*global require, define, QUnit, test, asyncTest, ok, strictEqual, deepEqual, start, stop, jasmine */
define(function () {
    "use strict";

    var

        //
        isFunction = function (f) {
            return Object.prototype.toString.call(f) === "[object Function]";
        },

        //
        each = function (array, iterator) {
            for (var i = 0, l = array.length; i < l; ++i) { iterator(array[i], i); }
        },

        // Assert that Jasmine suite of given `suiteDescription` has run
        okSuite = function (suite, suiteDescription) {
            ok(suite.description === suiteDescription && !suite.queue.running, suite.getFullName() + " [has executed]");
        },

        // Assert that Jasmine spec of given `specDescription` executed as part of given
        //  `specSuite` and did not fail
        okSpec = function (specSuite, specDescription) {
            var isSpecPassed = function () {
                    var theSpec = null;
                    each(specSuite.specs(), function (spec) {
                        if (specDescription === spec.description) { theSpec = spec; }
                    });
                    // if (!theSpec) { throw "Spec '" + theSpecDescription + "' not found"; }
                    return theSpec && theSpec.results().failedCount === 0;
                };
            ok(isSpecPassed(specSuite, specDescription), specSuite.getFullName() + " " + specDescription + " [has passed]");
        },

        // SuiteWatcher: A Jasmine reporter which is used to track the completion of Jasmine test
        //  suites in order to execute registered post-completion processors. (These perform a
        //  number of (QUnit) assertions on the completed Jasmine test suite.)
        //
        // `startSuiteWatcher` will only instantiate a single SuiteWatcher instance and register
        //  it as a Jasmine reporter once. Subsequent calls will return the one-and-only instance
        suiteWatcher = null,
        startSuiteWatcher = function (jasmine) {

            // Skip if SuiteWatcher instance already exists
            if (suiteWatcher) { return suiteWatcher; }

            var SuiteWatcher = function () {
                this.processors = {};
            };
            SuiteWatcher.prototype = new jasmine.Reporter();

            // Runs when (any) suite completes and executes the suite's processor
            SuiteWatcher.prototype.reportSuiteResults = function (suite) {
                var processor = this.processors[suite.description];
                this.processors[suite.description] = null; // It's a one-off processor
                if (!processor) {
                    throw "Suite '" + suite.description + "' just completed but no processor is set";
                }
                processor(suite);
            };

            // Register a `processor` to execute when suite of given `suiteDescription` completes
            SuiteWatcher.prototype.onCompleted = function (suiteDescription, processor) {
                if (this.processors[suiteDescription]) {
                    throw "A processor for suite '" + suiteDescription + "' has already been set";
                }
                this.processors[suiteDescription] = processor;
                return this; // Chain
            };

            // Create (one-and-only) instance and register as a reporter
            suiteWatcher = new SuiteWatcher();
            jasmine.getEnv().addReporter(suiteWatcher);

            return suiteWatcher;
        };

    return {
        isFunction: isFunction,
        each: each,
        okSpec: okSpec,
        okSuite: okSuite,
        startSuiteWatcher: startSuiteWatcher
    };

});