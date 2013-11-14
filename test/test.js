/*jshint browser:true */
/*global require, define, QUnit, test, asyncTest, ok, strictEqual, deepEqual, start, stop, jasmine */
define(["helpers", "jasq"], function (helpers, jasq) {
    "use strict";

    var

        isFunction   = helpers.isFunction,
        each         = helpers.each,
        okSpec       = helpers.okSpec,
        okSuite      = helpers.okSuite,
        suiteWatcher = helpers.startSuiteWatcher(jasmine),

        globalMethodNames = ["describe", "xdescribe", "it", "xit"];

    //////////////////////////////////////////////////////////////////////////////////////////////
    //
    // The general idea, repeated on most tests below, goes like this:
    //
    //  * QUnit test defines Jasmine suite (plus relevant specs / expectations / nested suites)
    //  * `suiteWatcher.onCompleted` is invoked to register a specific post-completion processor
    //    for each Jasmine suite. The processor's raison d'etre is performing any necessary
    //    assertions to check whether the Jasmine suite in question executed successfully. If it
    //    didn't, the test fails
    //  * Jasmine suite is `.execute()`d
    //
    // Note that jasq-expectations (`it`) are async and this forces the enclosing QUnit tests to
    //  also be async - post-completion processors always `.start()` them
    //
    //////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////
    ////////////////////////////////////

    QUnit.module("Environment");

    //
    test("Jasmine globals (" + globalMethodNames.join(", ") + ") are available and jasq-patched", 8, function () {

        each(globalMethodNames, function (methodName) {
            ok(isFunction(window[methodName]), "'" + methodName + "' is globally available ..");
            strictEqual(window[methodName].isJasq, true, ".. and is jasq-patched");
        });
    });

    //
    test("Patched globals are exposed on jasq", 4, function () {

        each(globalMethodNames, function (methodName) {
            strictEqual(jasq[methodName], window[methodName], "'" + methodName + "' is exposed on jasq");
        });
    });

    test("Globals may be reset and re-patched", 16, function () {

        jasq.resetGlobals();

        each(globalMethodNames, function (methodName) {
            ok(isFunction(window[methodName]), "after reset, '" + methodName + "' is globally available ..");
            ok(!window[methodName].isJasq, ".. and is not jasq-patched");
        });

        jasq.applyGlobals();

        each(globalMethodNames, function (methodName) {
            ok(isFunction(window[methodName]), "after patch, '" + methodName + "' is globally available ..");
            strictEqual(window[methodName].isJasq, true, ".. and is jasq-patched");
        });

    });

    ////////////////////////////////////
    ////////////////////////////////////

    QUnit.module("Plain suites");

    //
    asyncTest("Suites execute", 2, function () {

        var theThing = "The thing (suite)",
            shouldDoSomething = "should do something (spec)";

        suiteWatcher.onCompleted(theThing, function (suite) {
             okSpec(suite, shouldDoSomething);
             okSuite(suite, theThing);
             start();
        });

        // A plain Jasmine suite which describes 'The thing'
        window.describe(theThing, function () {
            window.it(shouldDoSomething, function () {
                // .. expectations ..
            });
        }).execute();
    });

    //
    asyncTest("Specs may be disabled", 3, function () {

        var theThing = "The thing (suite)",
            shouldDoSomething = "should do something (spec)",
            isSecondSpecExecuted = false;

        suiteWatcher.onCompleted(theThing, function (suite) {
            ok(!isSecondSpecExecuted, 'disabled spec (xit) did not execute');
            okSpec(suite, shouldDoSomething);
            okSuite(suite, theThing);
            start();
        });

        // A plain Jasmine suite which describes 'The thing'
        window.describe(theThing, function () {
            window.it(shouldDoSomething, function () {
                // .. expectations ..
            });
            window.xit("should do something else", function () {
                // .. expectations ..
                isSecondSpecExecuted = true; // Should not run
            });
        }).execute();
    });

    //
    asyncTest("Suites may be disabled", 1, function () {

        var theThing = "The thing (suite)",
            isSuiteExecuted = false;

        // A plain Jasmine suite which describes 'The thing'
        window.xdescribe(theThing, function () {
            // .. specs ..
            isSuiteExecuted = true;
        }).execute();

        // Give it a sec - expect the suite not to have run
        window.setTimeout(function () {
            strictEqual(isSuiteExecuted, false, "disabled suite (xdescribe) did not execute");
            start();
        }, 300);
    });

    ////////////////////////////////////
    ////////////////////////////////////

    QUnit.module("Jasq suites");

    asyncTest("Module is available to specs within the suite", 2, function () {

        var theOmeletteModule = "The Omelette Module",
            shouldTasteAmazing = "should taste amazing";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldTasteAmazing, {
                expect: function (module) {
                    window.expect(module.isOmeletteModule).toBeTruthy();
                }
            });

        }).execute();
    });

    //
    asyncTest("Module is available to specs within nested suites", 8, function () {

        var theEggsModule  = "The Eggs Module (suite)",
            shouldBeBoiled = "should be boiled (spec)",
            shouldBeFried  = "should be fried (spec)",
            inTermsOfSize  = "in terms of size (suite)",
            shouldBeLarge  = "should be large (spec)",
            shouldBeSmall  = "should be small (spec)",
            inTermsOfShape = "in terms of weight (suite)",
            shouldBeRound  = "should be round (spec)";

        suiteWatcher
        .onCompleted(inTermsOfShape, function (suite) {
            okSpec(suite, shouldBeRound);
            okSuite(suite, inTermsOfShape);
        })
        .onCompleted(inTermsOfSize, function (suite) {
            okSpec(suite, shouldBeSmall);
            okSpec(suite, shouldBeLarge);
            okSuite(suite, inTermsOfSize);
        })
        .onCompleted(theEggsModule, function (suite) {
            okSpec(suite, shouldBeFried);
            okSpec(suite, shouldBeBoiled);
            okSuite(suite, theEggsModule);
            start();
        });

        // A Jasq suite which describes the 'Eggs' Module
        window.describe(theEggsModule, "eggs", function () {

            window.it(shouldBeBoiled, {
                expect: function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                }
            });

            // A _nested_ jasq suite which describes the 'Eggs' Module in terms of size
            window.describe(inTermsOfSize, function () {

                window.it(shouldBeLarge, {
                    expect: function (module) {
                        window.expect(module.isEggsModule).toBeTruthy();
                    }
                });

                // A _nested_ _nested_ jasq suite which describes the 'Eggs' Module in terms of shape
                window.describe(inTermsOfShape, function () {

                    window.it(shouldBeRound, {
                        expect: function (module) {
                            window.expect(module.isEggsModule).toBeTruthy();
                        }
                    });
                });

                window.it(shouldBeSmall, {
                    expect: function (module) {
                        window.expect(module.isEggsModule).toBeTruthy();
                    }
                });
            });

            window.it(shouldBeFried, {
                expect: function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                }
            });

        }).execute();
    });

    //
    asyncTest("Modules in nested suites shadow outer modules", 8, function () {

        var theEggsModule      = "The Eggs Module (suite)",
            shouldBeBoiled     = "should be boiled (spec)",
            shouldBeRound      = "should be round (spec)",
            theOmeletteModule  = "The Omelette Module (suite)",
            shouldTasteAmazing = "should taste amazing (spec)",
            shouldBeSalty      = "should be salty (spec)",
            theBaconModule     = "The Bacon Module (suite)",
            shouldBeCrispy     = "should be crispy (spec)";

        suiteWatcher
        .onCompleted(theBaconModule, function (suite) {
            okSpec(suite, shouldBeCrispy);
            okSuite(suite, theBaconModule);
        })
        .onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBeSalty);
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
        })
        .onCompleted(theEggsModule, function (suite) {
            okSpec(suite, shouldBeRound);
            okSpec(suite, shouldBeBoiled);
            okSuite(suite, theEggsModule);
            start();
        });

        // A Jasq suite which describes the 'Eggs' Module
        window.describe(theEggsModule, "eggs", function () {

            // This expectation refers to the Eggs Module
            window.it(shouldBeBoiled, {
                expect: function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                }
            });

            // A _nested_ jasq suite which describes the 'Omelette' Module
            window.describe(theOmeletteModule, "omelette", function () {

                // This expectation refers to the Omelette Module
                window.it(shouldTasteAmazing, {
                    expect: function (module) {
                        window.expect(module.isOmeletteModule).toBeTruthy();
                    }
                });

                // A _nested_ _nested_ jasq suite which describes the 'Bacon' Module
                window.describe(theBaconModule, "bacon", function () {

                    // This expectation refers to the Bacon Module
                    window.it(shouldBeCrispy, {
                        expect: function (module) {
                            window.expect(module.isBaconModule).toBeTruthy();
                        }
                    });
                });

                // This expectation refers to the Omelette Module
                window.it(shouldBeSalty, {
                    expect: function (module) {
                        window.expect(module.isOmeletteModule).toBeTruthy();
                    }
                });
            });

            // This expectation refers to the Eggs Module
            window.it(shouldBeRound, {
                expect: function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                }
            });

        }).execute();
    });

    asyncTest("Module's state is not persisted across specs", 3, function () {

        var theOmeletteModule = "The Omelette Module",
            shouldTasteAmazing = "should taste amazing",
            shouldBeSalty = "should be salty";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBeSalty);
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldTasteAmazing, {
                expect: function (module) {
                    module.isEaten = true;
                }
            });

            window.it(shouldBeSalty, {
                expect: function (module) {
                    window.expect(module.isEaten).toBeUndefined();
                }
            });

        }).execute();
    });

    asyncTest("Module's dependencies may be stored - accessed through `dependencies.store`", 3, function () {

        var theOmeletteModule = "The Omelette Module",
            shouldTasteAmazing = "should taste amazing",
            shouldBeSalty = "should be salty";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBeSalty);
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldTasteAmazing, {
                store: ["eggs"],
                expect: function (module, dependencies) {
                    var stored = dependencies.store;
                    window.expect(stored.eggs.isEggsModule).toBeTruthy(); // Exposes the stored Eggs Module ..
                    window.expect(stored.bacon).toBeUndefined();          // .. but not the Bacon Module which is not stored
                }
            });

            window.it(shouldBeSalty, {
                store: ["eggs", "bacon"],
                expect: function (module, dependencies) {
                    var stored = dependencies.store;
                    window.expect(stored.eggs.isEggsModule).toBeTruthy();   // Exposes the stored Eggs Module ..
                    window.expect(stored.bacon.isBaconModule).toBeTruthy(); // .. as well as the stored Bacon Module
                }
            });

        }).execute();
    });

    asyncTest("Module's dependencies may be mocked - accessed through `dependencies.mocks`", 2, function () {

        var theOmeletteModule = "The Omelette Module",
            shouldTasteAmazing = "should taste amazing";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldTasteAmazing, {
                mock: {
                    eggs: { isMocked: true }
                },
                store: ["bacon"],
                expect: function (module, dependencies) {
                    var mocked = dependencies.mocks,
                        stored = dependencies.store;
                    window.expect(mocked.eggs).toBeTruthy();                // Eggs Module is available as a mocked dependency
                    window.expect(mocked.eggs.isMocked).toBeTruthy();       // Available Eggs Module is indeed mocked
                    window.expect(mocked.bacon).toBeUndefined();            // Bacon Module is not available as a mocked dependency
                    window.expect(stored.bacon.isBaconModule).toBeTruthy(); // Bacon Module is available as a stored dependency
                    window.expect(stored.bacon.isMocked).toBeFalsy();       // Bacon Module is indeed not mocked
                }
            });

        }).execute();
    });

    asyncTest("Mocked (and only mocked) dependencies are injected into tested module", 2, function () {

        var theOmeletteModule = "The Omelette Module",
            shouldTasteAmazing = "should taste amazing";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldTasteAmazing, {
                mock: {
                    eggs: { isMocked: true }
                },
                expect: function (module, dependencies) {
                    window.expect(module.getEggs().isMocked).toBeTruthy(); // Mocked Eggs Module is injected into tested Module
                    window.expect(module.getBacon().isMocked).toBeFalsy(); // Tested Module uses original (non-mocked) Bacon dependency
                }
            });

        }).execute();
    });

    //
    asyncTest("Specs may be disabled", 2, function () {

        var theOmeletteModule = "The Omelette Module",
            shouldTasteAmazing = "should taste amazing",
            shouldBeSalty = "should be salty";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A Jasmine suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {
            window.it(shouldTasteAmazing, {
                expect: function () {
                    // This spec should run ..
                }
            });
            window.xit(shouldBeSalty, {
                expect: function () {
                    // .. while this spec shouldn't
                    ok(false, "suite's disabled spec executing");
                }
            });
        }).execute();
    });

    //
    asyncTest("Suites may be disabled", 1, function () {

        var theOmeletteModule = "The Omelette Module",
            isSuiteExecuted = false;

        // A plain Jasmine suite which describes the 'Omelette' Module
        window.xdescribe(theOmeletteModule, "omelette", function () {
            isSuiteExecuted = true;
        }).execute();

        // Give it a sec - expect the suite not to have run
        window.setTimeout(function () {
            strictEqual(isSuiteExecuted, false, "disabled suite did not execute");
            start();
        }, 300);
    });

    //
    asyncTest("Specs may be asynchronous", 8, function () {

        var theEggsModule      = "The Eggs Module (suite)",
            shouldBeBoiled     = "should be boiled (spec)",
            shouldBeRound      = "should be round (spec)",
            theOmeletteModule  = "The Omelette Module (suite)",
            shouldTasteAmazing = "should taste amazing (spec)",
            shouldBeSalty      = "should be salty (spec)",
            theBaconModule     = "The Bacon Module (suite)",
            shouldBeCrispy     = "should be crispy (spec)";

        suiteWatcher
        .onCompleted(theBaconModule, function (suite) {
            okSpec(suite, shouldBeCrispy);
            okSuite(suite, theBaconModule);
        })
        .onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBeSalty);
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
        })
        .onCompleted(theEggsModule, function (suite) {
            okSpec(suite, shouldBeRound);
            okSpec(suite, shouldBeBoiled);
            okSuite(suite, theEggsModule);
            start();
        });

        // A Jasq suite which describes the 'Eggs' Module
        window.describe(theEggsModule, "eggs", function () {

            // This expectation refers to the Eggs Module
            window.it(shouldBeBoiled, {
                expect: function (module) {
                    //
                }
            });

            // A _nested_ jasq suite which describes the 'Omelette' Module
            window.describe(theOmeletteModule, "omelette", function () {

                // This expectation refers to the Omelette Module
                window.it(shouldTasteAmazing, {
                    expect: function (module) {
                        var isDone = false;
                        setTimeout(function () { isDone = true; }, 300);
                        window.waitsFor(function () { return isDone; });
                        window.runs(function () {
                            //
                        });
                    }
                });

                // A _nested_ _nested_ jasq suite which describes the 'Bacon' Module
                window.describe(theBaconModule, "bacon", function () {

                    // This expectation refers to the Bacon Module
                    window.it(shouldBeCrispy, {
                        expect: function (module) {
                            window.waits(150);
                            window.runs(function () {
                                //
                            });
                        }
                    });
                });

                // This expectation refers to the Omelette Module
                window.it(shouldBeSalty, {
                    expect: function (module) {
                        //
                    }
                });
            });

            // This expectation refers to the Eggs Module
            window.it(shouldBeRound, {
                expect: function (module) {
                    //
                }
            });

        }).execute();
    });

});
