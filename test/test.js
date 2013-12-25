/*jshint browser:true */
/*global require, define, QUnit, test, asyncTest, ok, strictEqual, deepEqual, start, stop, jasmine */
define(["helpers", "jasq"], function (helpers, jasq) {
    "use strict";

    var

        isFunction       = helpers.isFunction,
        isStrictlyObject = helpers.isStrictlyObject,
        each             = helpers.each,

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

    asyncTest("Specs receive undefined module when enclosed in suite that doesn't define one", 3, function () {

        var theOmeletteModule      = "The Omelette Module (suite)",
            shouldTasteAmazing     = "should taste amazing (spec)",
            shouldTasteMoreAmazing = "should taste more amazing (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldTasteMoreAmazing);
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A plain suite which includes a jasq-spec
        window.describe(theOmeletteModule, function () {

            window.it(shouldTasteAmazing, function (module) {
                window.expect(module).toBeUndefined();
            });

            window.it(shouldTasteMoreAmazing, {
                expect: function (module) {
                    window.expect(module).toBeUndefined();
                }
            });

        }).execute();
    });

    ////////////////////////////////////
    ////////////////////////////////////

    QUnit.module("Jasq suites");

    asyncTest("Module is available to specs within the suite", 3, function () {

        var theOmeletteModule      = "The Omelette Module (suite)",
            shouldTasteAmazing     = "should taste amazing (spec)",
            shouldTasteMoreAmazing = "should taste more amazing (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldTasteMoreAmazing);
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldTasteAmazing, function (module) {
                window.expect(module.isOmeletteModule).toBeTruthy();
            });
            window.it(shouldTasteMoreAmazing, {
                expect: function (module) {
                    window.expect(module.isOmeletteModule).toBeTruthy();
                }
            });

        }).execute();
    });

    asyncTest("Module is available to specs within nested suites", 13, function () {

        var theEggsModule      = "The Eggs Module (suite)",
            shouldBeBoiled     = "should be boiled (spec)",
            shouldBeMoreBoiled = "should be more boiled (spec)",
            shouldBeFried      = "should be fried (spec)",
            shouldBeMoreFried  = "should be more fried (spec)",
            inTermsOfSize      = "in terms of size (suite)",
            shouldBeLarge      = "should be large (spec)",
            shouldBeLarger     = "should be larger (spec)",
            shouldBeSmall      = "should be small (spec)",
            shouldBeSmaller    = "should be smaller (spec)",
            inTermsOfShape     = "in terms of weight (suite)",
            shouldBeRound      = "should be round (spec)",
            shouldBeMoreRound  = "should be more round (spec)";

        suiteWatcher
        .onCompleted(inTermsOfShape, function (suite) {
            okSpec(suite, shouldBeMoreRound);
            okSpec(suite, shouldBeRound);
            okSuite(suite, inTermsOfShape);
        })
        .onCompleted(inTermsOfSize, function (suite) {
            okSpec(suite, shouldBeSmaller);
            okSpec(suite, shouldBeSmall);
            okSpec(suite, shouldBeLarger);
            okSpec(suite, shouldBeLarge);
            okSuite(suite, inTermsOfSize);
        })
        .onCompleted(theEggsModule, function (suite) {
            okSpec(suite, shouldBeMoreFried);
            okSpec(suite, shouldBeFried);
            okSpec(suite, shouldBeMoreBoiled);
            okSpec(suite, shouldBeBoiled);
            okSuite(suite, theEggsModule);
            start();
        });

        // A Jasq suite which describes the 'Eggs' Module
        window.describe(theEggsModule, "eggs", function () {

            window.it(shouldBeBoiled, function (module) {
                window.expect(module.isEggsModule).toBeTruthy();
            });
            window.it(shouldBeMoreBoiled, {
                expect: function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                }
            });

            // A _nested_ jasq suite which describes the 'Eggs' Module in terms of size
            window.describe(inTermsOfSize, function () {

                window.it(shouldBeLarge, function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                });
                window.it(shouldBeLarger, {
                    expect: function (module) {
                        window.expect(module.isEggsModule).toBeTruthy();
                    }
                });

                // A _nested_ _nested_ jasq suite which describes the 'Eggs' Module in terms of shape
                window.describe(inTermsOfShape, function () {

                    window.it(shouldBeRound, function (module) {
                        window.expect(module.isEggsModule).toBeTruthy();
                    });
                    window.it(shouldBeMoreRound, {
                        expect: function (module) {
                            window.expect(module.isEggsModule).toBeTruthy();
                        }
                    });
                });

                window.it(shouldBeSmall, function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                });
                window.it(shouldBeSmaller, {
                    expect: function (module) {
                        window.expect(module.isEggsModule).toBeTruthy();
                    }
                });
            });

            window.it(shouldBeFried, function (module) {
                window.expect(module.isEggsModule).toBeTruthy();
            });
            window.it(shouldBeMoreFried, {
                expect: function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                }
            });

        }).execute();
    });

    asyncTest("Modules associated with nested suites shadow those of outer suites", 13, function () {

        var theEggsModule          = "The Eggs Module (suite)",
            shouldBeBoiled         = "should be boiled (spec)",
            shouldBeMoreBoiled     = "should be more boiled (spec)",
            shouldBeRound          = "should be round (spec)",
            shouldBeMoreRound      = "should be more round (spec)",
            theOmeletteModule      = "The Omelette Module (suite)",
            shouldTasteAmazing     = "should taste amazing (spec)",
            shouldTasteMoreAmazing = "should taste more amazing (spec)",
            shouldBeSalty          = "should be salty (spec)",
            shouldBeMoreSalty      = "should be salty (spec)",
            theBaconModule         = "The Bacon Module (suite)",
            shouldBeCrispy         = "should be crispy (spec)",
            shouldBeMoreCrispy     = "should be more crispy (spec)";

        suiteWatcher
        .onCompleted(theBaconModule, function (suite) {
            okSpec(suite, shouldBeMoreCrispy);
            okSpec(suite, shouldBeCrispy);
            okSuite(suite, theBaconModule);
        })
        .onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBeMoreSalty);
            okSpec(suite, shouldBeSalty);
            okSpec(suite, shouldTasteMoreAmazing);
            okSpec(suite, shouldTasteAmazing);
            okSuite(suite, theOmeletteModule);
        })
        .onCompleted(theEggsModule, function (suite) {
            okSpec(suite, shouldBeMoreRound);
            okSpec(suite, shouldBeRound);
            okSpec(suite, shouldBeMoreBoiled);
            okSpec(suite, shouldBeBoiled);
            okSuite(suite, theEggsModule);
            start();
        });

        // A Jasq suite which describes the 'Eggs' Module
        window.describe(theEggsModule, "eggs", function () {

            // This expectation refers to the Eggs Module
            window.it(shouldBeBoiled, function (module) {
                window.expect(module.isEggsModule).toBeTruthy();
            });
            window.it(shouldBeMoreBoiled, {
                expect: function (module) {
                    window.expect(module.isEggsModule).toBeTruthy();
                }
            });

            // A _nested_ jasq suite which describes the 'Omelette' Module
            window.describe(theOmeletteModule, "omelette", function () {

                // This expectation refers to the Omelette Module
                window.it(shouldTasteAmazing, function (module) {
                    window.expect(module.isOmeletteModule).toBeTruthy();
                });
                window.it(shouldTasteMoreAmazing, {
                    expect: function (module) {
                        window.expect(module.isOmeletteModule).toBeTruthy();
                    }
                });

                // A _nested_ _nested_ jasq suite which describes the 'Bacon' Module
                window.describe(theBaconModule, "bacon", function () {

                    // This expectation refers to the Bacon Module
                    window.it(shouldBeCrispy, function (module) {
                        window.expect(module.isBaconModule).toBeTruthy();
                    });
                    window.it(shouldBeMoreCrispy, {
                        expect: function (module) {
                            window.expect(module.isBaconModule).toBeTruthy();
                        }
                    });
                });

                // This expectation refers to the Omelette Module
                window.it(shouldBeSalty, function (module) {
                    window.expect(module.isOmeletteModule).toBeTruthy();
                });
                window.it(shouldBeMoreSalty, {
                    expect: function (module) {
                        window.expect(module.isOmeletteModule).toBeTruthy();
                    }
                });
            });

            // This expectation refers to the Eggs Module
            window.it(shouldBeRound, function (module) {
                window.expect(module.isEggsModule).toBeTruthy();
            });
            window.it(shouldBeMoreRound, {
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
                expect: function (module) {
                    window.expect(module.getEggs().isMocked).toBeTruthy(); // Mocked Eggs Module is injected into tested Module
                    window.expect(module.getBacon().isMocked).toBeFalsy(); // Tested Module uses original (non-mocked) Bacon dependency
                }
            });

        }).execute();
    });

    asyncTest("Mocked dependencies may be accessed through `dependencies`", 2, function () {

        var theOmeletteModule = "The Omelette Module",
            shouldTasteAmazing = "should taste amazing",
            shouldBeSalty = "should be salty";

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
                expect: function (module, deps) {
                    window.expect(deps.eggs).toBeTruthy();           // Eggs Module is available as a dependency
                    window.expect(deps.eggs.isMocked).toBeTruthy();  // Eggs Module is mocked
                    window.expect(deps.eggs).toBe(module.getEggs()); // Eggs Module is also injected into tested Module
                }
            });

            window.it(shouldBeSalty, {
                mock: {
                    eggs: { isMocked: true },
                    bacon: { isMocked: true }
                },
                expect: function (module, deps) {
                    window.expect(deps.eggs).toBeTruthy();           // Eggs Module is available as a dependency
                    window.expect(deps.eggs.isMocked).toBeTruthy();  // Eggs Module is mocked
                    window.expect(deps.eggs).toBe(module.getEggs()); // Eggs Module is also injected into tested Module
                    window.expect(deps.bacon).toBeTruthy();            // Bacon Module is available as a dependency
                    window.expect(deps.bacon.isMocked).toBeTruthy();   // Bacon Module is mocked
                    window.expect(deps.bacon).toBe(module.getBacon()); // Bacon Module is also injected into tested Module
                }
            });

        }).execute();
    });

    asyncTest("Non-mocked dependencies may be accessed through `dependencies`", 3, function () {

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

            window.it(shouldTasteAmazing, function (module, deps) {
                window.expect(deps.eggs.isEggsModule).toBeTruthy(); // Eggs Module is available as a dependency
                window.expect(deps.eggs.isMocked).toBeFalsy();      // Eggs Module is _not_ mocked
                window.expect(deps.eggs).toBe(module.getEggs());    // Eggs Module is the same as the one used by the Omelette Module
                window.expect(deps.bacon.isBaconModule).toBeTruthy();
                window.expect(deps.bacon.isMocked).toBeFalsy();
                window.expect(deps.bacon).toBe(module.getBacon());
            });

            window.it(shouldBeSalty, {
                mock: {
                    eggs: { isMocked: true }
                },
                expect: function (module, deps) {
                    window.expect(deps.eggs).toBeTruthy();           // Eggs Module is available as a dependency
                    window.expect(deps.eggs.isMocked).toBeTruthy();  // Eggs Module is mocked
                    window.expect(deps.eggs).toBe(module.getEggs()); // Eggs Module is also injected into tested Module
                    window.expect(deps.bacon).toBeTruthy();            // Bacon Module is available as a dependency
                    window.expect(deps.bacon.isMocked).toBeFalsy();    // Bacon Module is _not_ mocked
                    window.expect(deps.bacon).toBe(module.getBacon()); // Bacon Module is the same as the one used by the Omelette Module
                }
            });

        }).execute();
    });

    asyncTest("A module-defining function may be used to mock object-returning-modules", 2, function () {

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
                    eggs: function () {
                        return { isMocked: true };
                    }
                },
                expect: function (module, deps) {
                    window.expect(isStrictlyObject(deps.eggs)).toBeTruthy();
                    window.expect(deps.eggs.isMocked).toBeTruthy();
                    window.expect(deps.eggs).toBe(module.getEggs());
                }
            });

        }).execute();
    });

    asyncTest("A module-defining function may be used to mock function-returning-modules", 2, function () {

        var theOmeletteModule = "The Omelette Module",
            shouldBeEaten = "should be eaten";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBeEaten);
            okSuite(suite, theOmeletteModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldBeEaten, {
                mock: {
                    eat: function () {
                        var f = function () { return true; };
                        f.isMocked = true;
                        return f;
                    }
                },
                expect: function (module, deps) {
                    window.expect(isFunction(deps.eat)).toBeTruthy();
                    window.expect(deps.eat.isMocked).toBeTruthy();
                    window.expect(deps.eat).toBe(module.eat);
                }
            });

        }).execute();
    });

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
