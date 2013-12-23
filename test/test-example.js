/*jshint browser:true */
/*global require, define, QUnit, test, asyncTest, ok, strictEqual, deepEqual, start, stop, jasmine */
define(["helpers", "jasq"], function (helpers, jasq) {
    "use strict";

    var

        isFunction   = helpers.isFunction,
        each         = helpers.each,
        okSpec       = helpers.okSpec,
        okSuite      = helpers.okSuite,
        suiteWatcher = helpers.startSuiteWatcher(jasmine);

    ////////////////////////////////////
    ////////////////////////////////////

    QUnit.module("Example");

    //
    asyncTest("`modA` is available to specs within the suite", 2, function () {

        var theModAModule = "The modA module (suite)",
            shouldHaveAValueOfA = "should have a value of 'A' (spec)";

        suiteWatcher.onCompleted(theModAModule, function (suite) {
            okSpec(suite, shouldHaveAValueOfA);
            okSuite(suite, theModAModule);
            start();
        });

        window.describe(theModAModule, "modA", function () {

            // The module is passed to specs within the suite, as a parameter
            window.it(shouldHaveAValueOfA, function (modA) {
                window.expect(modA.getValue()).toBe("A"); // Passes
            });
        }).execute();
    });

    //
    asyncTest("`modA` is available to specs within nested suites", 3, function () {

        var theModAModule = "The modA module (suite)",
            itsValue = "its value (nested suite)",
            shouldBeA = "should be 'A' (spec)";

        suiteWatcher.onCompleted(itsValue, function (suite) {
            okSpec(suite, shouldBeA);
            okSuite(suite, itsValue);
        });
        suiteWatcher.onCompleted(theModAModule, function (suite) {
            okSuite(suite, theModAModule);
            start();
        });

        window.describe(theModAModule, "modA", function () {

            window.describe(itsValue, function () {

                // The module is also passed to specs within the nested suite
                window.it(shouldBeA, function (modA) {
                    window.expect(modA.getValue()).toBe("A"); // Passes
                });
            });
        }).execute();
    });

    //
    asyncTest("`modA`'s state is not persisted across specs", 3, function () {

        var theModAModule = "The modA module (suite)",
            shouldHaveAValueOfAWhenTweaked = "should have a value of 'C' when tweaked (spec)",
            shouldHaveAValueOfA = "should have a value of A (spec)";

        suiteWatcher.onCompleted(theModAModule, function (suite) {
            okSpec(suite, shouldHaveAValueOfA);
            okSpec(suite, shouldHaveAValueOfAWhenTweaked);
            okSuite(suite, theModAModule);
            start();
        });

        window.describe(theModAModule, "modA", function () {

            // This spec modifies modA
            window.it(shouldHaveAValueOfAWhenTweaked, function (modA) {
                modA.getValue = function () {
                    return "C";
                };
                window.expect(modA.getValue()).toBe("C"); // Passes
            });

            // This spec is passed the original, unmodified modA
            window.it(shouldHaveAValueOfA, function (modA) {
                window.expect(modA.getValue()).toBe("A"); // Passes
            });
        }).execute();
    });

    //
    asyncTest("`modA`'s dependencies may be mocked", 2, function () {

        var theModAModule = "The modA module (suite)",
            shouldExposeModBsValue = "should expose modB's value (spec)";

        suiteWatcher.onCompleted(theModAModule, function (suite) {
            okSpec(suite, shouldExposeModBsValue);
            okSuite(suite, theModAModule);
            start();
        });

        window.describe(theModAModule, "modA", function () {

            // Define a mock for modB
            var mockB = {
                getValue: function () {
                    return "C";
                }
            };

            // modA will use the mocked version of modB
            window.it(shouldExposeModBsValue, {
                mock: {
                    modB: mockB
                },
                expect: function (modA) {
                    window.expect(modA.getModBValue()).toBe("C"); // Passes
                }
            });
        }).execute();
    });

    //
    asyncTest("Mocked dependencies may be accessed through `dependencies`", 2, function () {

        var theModAModule = "The modA module (suite)",
            shouldExposeModBsValue = "should expose modB's value (spec)";

        suiteWatcher.onCompleted(theModAModule, function (suite) {
            okSpec(suite, shouldExposeModBsValue);
            okSuite(suite, theModAModule);
            start();
        });

        window.describe(theModAModule, "modA", function () {

            // Mocked modB may be accessed through 'dependencies.modB'
            window.it(shouldExposeModBsValue, {
                mock: {
                    modB: {} // Mocking with an empty object
                },
                expect: function (modA, dependencies) {
                    dependencies.modB.getValue = function () {
                        return "D";
                    };
                    window.expect(modA.getModBValue()).toBe("D"); // Passes
                }
            });
        }).execute();
    });

    //
    asyncTest("Non-mocked dependencies may be accessed through `dependencies`", 2, function () {

        var theModAModule = "The modA module (suite)",
            shouldDelegateToModB = "should delegate to modB to expose modB's value (spec)";

        suiteWatcher.onCompleted(theModAModule, function (suite) {
            okSpec(suite, shouldDelegateToModB);
            okSuite(suite, theModAModule);
            start();
        });

        window.describe(theModAModule, "modA", function () {

            // Stored modB may be accessed through 'dependencies.modB'
            window.it(shouldDelegateToModB, function (modA, dependencies) {
                window.spyOn(dependencies.modB, "getValue");
                modA.getModBValue();
                window.expect(dependencies.modB.getValue).toHaveBeenCalled(); // Passes
            });
        }).execute();
    });

});
