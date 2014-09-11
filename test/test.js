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

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // A collection of QUnit test-suites that define and execute Jasmine spec-suites. After the
    //  Jasmine spec-suite completes, QUnit assertions are made on the results to validate that
    //  Jasmine expectations were fulfilled. In practice:
    //
    //  * QUnit test defines Jasmine suite (with specs / expectations / nested suites)
    //  * `suiteWatcher.onCompleted` is invoked to register a specific post-completion processor
    //    for each defined Jasmine suite. The processor's purpose is performing any necessary
    //    assertions to check whether the Jasmine suite in question executed successfully. If it
    //    didn't, the test fails
    //  * Jasmine suite is `.execute()`d
    //
    // Note that all specs (`it`), defined in the context of a Module-associated Jasmine suite are
    //  async by design and this forces the enclosing QUnit tests to also be async. Post-completion
    //  processors always `.start()` them
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////
    ////////////////////////////////////

    // How jasq and its globals should be exported
    QUnit.module("Export");

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

    // Behaviour of spec-suites that are not associated with Modules
    QUnit.module("Suites without Mod");

    asyncTest("Suites execute", 1, function () {

        var theThing = "The thing (suite)",
            shouldDoSomething = "should do something (spec)";

        suiteWatcher.onCompleted(theThing, function (suite) {
            okSpec(suite, shouldDoSomething);
            start();
        });

        // A plain Jasmine suite which describes 'The thing'
        window.describe(theThing, function () {
            window.it(shouldDoSomething, function () {
                // .. expectations ..
                window.expect(true).toBeTruthy();
            });
        }).execute();
    });

    asyncTest("Specs may be disabled", 2, function () {

        var theThing = "The thing (suite)",
            shouldDoSomething = "should do something (spec)",
            isSecondSpecExecuted = false;

        suiteWatcher.onCompleted(theThing, function (suite) {
            ok(!isSecondSpecExecuted, 'disabled spec (xit) did not execute');
            okSpec(suite, shouldDoSomething);
            start();
        });

        // A plain Jasmine suite which describes 'The thing'
        window.describe(theThing, function () {
            window.it(shouldDoSomething, function () {
                // .. expectations ..
                window.expect(true).toBeTruthy();
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
            window.it('should explode (spec)', function () {
                isSuiteExecuted = true;
            });

        }).execute();

        // Give it a sec - expect the suite not to have run
        window.setTimeout(function () {
            strictEqual(isSuiteExecuted, false, "disabled suite (xdescribe) did not execute");
            start();
        }, 300);
    });

    asyncTest("Specs receive no arguments when enclosed in suite that doesn't define a module", 2, function () {

        var theOmeletteModule      = "The Omelette Module (suite)",
            shouldTasteAmazing     = "should taste amazing (spec)",
            shouldTasteMoreAmazing = "should taste more amazing (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldTasteMoreAmazing);
            okSpec(suite, shouldTasteAmazing);
            start();
        });

        // A plain suite which includes a jasq-spec
        window.describe(theOmeletteModule, function () {

            window.it(shouldTasteAmazing, function () {
                window.expect(arguments[0]).toBeUndefined();
            });

            window.it(shouldTasteMoreAmazing, {
                expect: function () {
                    window.expect(arguments[0]).toBeUndefined();
                }
            });

        }).execute();
    });

    asyncTest("Specs receive done argument when enclosed in suite that doesn't define a module", 2, function () {

        var theOmeletteModule      = "The Omelette Module (suite)",
            shouldTasteAmazing     = "should taste amazing (spec)",
            shouldTasteMoreAmazing = "should taste more amazing (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldTasteMoreAmazing);
            okSpec(suite, shouldTasteAmazing);
            start();
        });

        // A plain suite which includes a jasq-spec
        window.describe(theOmeletteModule, function () {

            window.it(shouldTasteAmazing, function (done) {
                window.expect(isFunction(done)).toBeTruthy();
                done();
            });

            window.it(shouldTasteMoreAmazing, {
                expect: function (done) {
                    window.expect(isFunction(done)).toBeTruthy();
                    done();
                }
            });

        }).execute();
    });

    ////////////////////////////////////
    ////////////////////////////////////

    // Behaviour of spec-suites that are associated with Modules
    QUnit.module("Suites with Mod");

    asyncTest("Module is available to specs within the suite", 2, function () {

        var theOmeletteModule      = "The Omelette Module (suite)",
            shouldBePassedToSpecs  = "should be passed to specs (spec)",
            shouldBePassedToSpecs2 = "should be passed to specs defined with spec-config (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBePassedToSpecs2);
            okSpec(suite, shouldBePassedToSpecs);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldBePassedToSpecs, function (omelette) {
                window.expect(omelette.isOmelette).toBeTruthy();
            });
            window.it(shouldBePassedToSpecs2, {
                expect: function (omelette) {
                    window.expect(omelette.isOmelette).toBeTruthy();
                }
            });

        }).execute();
    });

    asyncTest("Module is available to specs within nested suites", 10, function () {

        var theOmeletteModule                      = "The Omelette Module (suite)",
            shouldBePassedToSpecs                  = "should be passed to specs (spec)",
            shouldBePassedToSpecs2                 = "should be passed to specs defined with spec-config (spec)",
            shouldBePassedToSpecsAfterNestedSuite  = "should be passed to specs, after nested suite executes (spec)",
            shouldBePassedToSpecsAfterNestedSuite2 = "should be passed to specs defined with spec-config, after nested suite executes (spec)",

            //
            inTermsOfSomeBehaviour                        = "in terms of some behaviour (suite)",
            shouldBePassedToSpecsNested                   = "should be passed to specs (spec)",
            shouldBePassedToSpecsNested2                  = "should be passed to specs defined with spec-config (spec)",
            shouldBePassedToSpecsNestedAfterTNestedSuite  = "should be passed to specs, after twice nested suite executes (spec)",
            shouldBePassedToSpecsNestedAfterTNestedSuite2 = "should be passed to specs defined with spec-config, after twice nested suite executes (spec)",

            //
            whichCanBeFurtherSpecialized  = "which can be further specialized (suite)",
            shouldBePassedToSpecsTNested  = "should be passed to specs (spec)",
            shouldBePassedToSpecsTNested2 = "should be passed to specs defined with spec-config (spec)";

        suiteWatcher
        .onCompleted([theOmeletteModule, inTermsOfSomeBehaviour, whichCanBeFurtherSpecialized], function (suite) {
            okSpec(suite, shouldBePassedToSpecsTNested2);
            okSpec(suite, shouldBePassedToSpecsTNested);
        })
        .onCompleted([theOmeletteModule, inTermsOfSomeBehaviour], function (suite) {
            okSpec(suite, shouldBePassedToSpecsNestedAfterTNestedSuite2);
            okSpec(suite, shouldBePassedToSpecsNestedAfterTNestedSuite);
            okSpec(suite, shouldBePassedToSpecsNested2);
            okSpec(suite, shouldBePassedToSpecsNested);
        })
        .onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBePassedToSpecsAfterNestedSuite2);
            okSpec(suite, shouldBePassedToSpecsAfterNestedSuite);
            okSpec(suite, shouldBePassedToSpecs2);
            okSpec(suite, shouldBePassedToSpecs);
            start();
        });

        // A Jasq suite which describes the 'Omelette' Module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldBePassedToSpecs, function (omelette) {
                window.expect(omelette.isOmelette).toBeTruthy();
            });
            window.it(shouldBePassedToSpecs2, {
                expect: function (omelette) {
                    window.expect(omelette.isOmelette).toBeTruthy();
                }
            });

            // A _nested_ jasq suite (which would describe the 'Omelette' Module in terms of some
            //  specific (imaginary in this case) behaviour)
            window.describe(inTermsOfSomeBehaviour, function () {

                window.it(shouldBePassedToSpecsNested, function (omelette) {
                    window.expect(omelette.isOmelette).toBeTruthy();
                });
                window.it(shouldBePassedToSpecsNested2, {
                    expect: function (omelette) {
                        window.expect(omelette.isOmelette).toBeTruthy();
                    }
                });

                // A _twice nested_ jasq suite (which woudl describe the 'Omelette' Module in terms
                //  of some specific (imaginary in this case) sub-behaviour)
                window.describe(whichCanBeFurtherSpecialized, function () {

                    window.it(shouldBePassedToSpecsTNested, function (omelette) {
                        window.expect(omelette.isOmelette).toBeTruthy();
                    });
                    window.it(shouldBePassedToSpecsTNested2, {
                        expect: function (omelette) {
                            window.expect(omelette.isOmelette).toBeTruthy();
                        }
                    });
                });

                window.it(shouldBePassedToSpecsNestedAfterTNestedSuite, function (omelette) {
                    window.expect(omelette.isOmelette).toBeTruthy();
                });
                window.it(shouldBePassedToSpecsNestedAfterTNestedSuite2, {
                    expect: function (omelette) {
                        window.expect(omelette.isOmelette).toBeTruthy();
                    }
                });
            });

            window.it(shouldBePassedToSpecsAfterNestedSuite, function (omelette) {
                window.expect(omelette.isOmelette).toBeTruthy();
            });
            window.it(shouldBePassedToSpecsAfterNestedSuite2, {
                expect: function (omelette) {
                    window.expect(omelette.isOmelette).toBeTruthy();
                }
            });

        }).execute();
    });

    asyncTest("Modules associated with nested suites shadow those of outer suites", 10, function () {

        var theEggsModule                          = "The Eggs Module (suite)",
            shouldBePassedToSpecs                  = "should be passed to specs (spec)",
            shouldBePassedToSpecs2                 = "should be passed to specs defined with spec-config (spec)",
            shouldBePassedToSpecsAfterNestedSuite  = "should be passed to specs, after nested suite executes (spec)",
            shouldBePassedToSpecsAfterNestedSuite2 = "should be passed to specs defined with spec-config, after nested suite executes (spec)",

            //
            theOmeletteModule                             = "The Omelette Module (suite)",
            shouldBePassedToSpecsNested                   = "should be passed to specs (spec)",
            shouldBePassedToSpecsNested2                  = "should be passed to specs defined with spec-config (spec)",
            shouldBePassedToSpecsNestedAfterTNestedSuite  = "should be passed to specs, after twice nested suite executes (spec)",
            shouldBePassedToSpecsNestedAfterTNestedSuite2 = "should be passed to specs defined with spec-config, after twice nested suite executes (spec)",

            //
            theBaconModule                = "The Bacon Module (suite)",
            shouldBePassedToSpecsTNested  = "should be passed to specs (spec)",
            shouldBePassedToSpecsTNested2 = "should be passed to specs defined with spec-config (spec)";

        suiteWatcher
        .onCompleted([theEggsModule, theOmeletteModule, theBaconModule], function (suite) {
            okSpec(suite, shouldBePassedToSpecsTNested2);
            okSpec(suite, shouldBePassedToSpecsTNested);
        })
        .onCompleted([theEggsModule, theOmeletteModule], function (suite) {
            okSpec(suite, shouldBePassedToSpecsNestedAfterTNestedSuite2);
            okSpec(suite, shouldBePassedToSpecsNestedAfterTNestedSuite);
            okSpec(suite, shouldBePassedToSpecsNested2);
            okSpec(suite, shouldBePassedToSpecsNested);
        })
        .onCompleted(theEggsModule, function (suite) {
            okSpec(suite, shouldBePassedToSpecsAfterNestedSuite2);
            okSpec(suite, shouldBePassedToSpecsAfterNestedSuite);
            okSpec(suite, shouldBePassedToSpecs2);
            okSpec(suite, shouldBePassedToSpecs);
            start();
        });

        // A Jasq suite which describes the 'Eggs' Module
        window.describe(theEggsModule, "eggs", function () {

            // This expectation refers to the Eggs Module
            window.it(shouldBePassedToSpecs, function (eggs) {
                window.expect(eggs.isEggs).toBeTruthy();
            });
            window.it(shouldBePassedToSpecs2, {
                expect: function (eggs) {
                    window.expect(eggs.isEggs).toBeTruthy();
                }
            });

            // A _nested_ jasq suite which describes the 'Omelette' Module
            window.describe(theOmeletteModule, "omelette", function () {

                // This expectation refers to the Omelette Module
                window.it(shouldBePassedToSpecsNested, function (omelette) {
                    window.expect(omelette.isOmelette).toBeTruthy();
                });
                window.it(shouldBePassedToSpecsNested2, {
                    expect: function (omelette) {
                        window.expect(omelette.isOmelette).toBeTruthy();
                    }
                });

                // A _nested_ _nested_ jasq suite which describes the 'Bacon' Module
                window.describe(theBaconModule, "bacon", function () {

                    // This expectation refers to the Bacon Module
                    window.it(shouldBePassedToSpecsTNested, function (bacon) {
                        window.expect(bacon.isBacon).toBeTruthy();
                    });
                    window.it(shouldBePassedToSpecsTNested2, {
                        expect: function (bacon) {
                            window.expect(bacon.isBacon).toBeTruthy();
                        }
                    });
                });

                // This expectation refers to the Omelette Module
                window.it(shouldBePassedToSpecsNestedAfterTNestedSuite, function (omelette) {
                    window.expect(omelette.isOmelette).toBeTruthy();
                });
                window.it(shouldBePassedToSpecsNestedAfterTNestedSuite2, {
                    expect: function (omelette) {
                        window.expect(omelette.isOmelette).toBeTruthy();
                    }
                });
            });

            // This expectation refers to the Eggs Module
            window.it(shouldBePassedToSpecsAfterNestedSuite, function (eggs) {
                window.expect(eggs.isEggs).toBeTruthy();
            });
            window.it(shouldBePassedToSpecsAfterNestedSuite2, {
                expect: function (eggs) {
                    window.expect(eggs.isEggs).toBeTruthy();
                }
            });

        }).execute();
    });

    asyncTest("Module's state is not persisted across specs", 2, function () {

        var theOmeletteModule                   = "The Omelette Module (suite)",
            shouldHaveStateModified             = "should have its state potentially modified in specs (spec)",
            shouldNotHaveModifiedStatePersisted = "should not have modified state persisted from previous specs (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldNotHaveModifiedStatePersisted);
            okSpec(suite, shouldHaveStateModified);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldHaveStateModified, function (omelette) {
                omelette.isEaten = true;
                window.expect(omelette.isEaten).toBe(true);
            });

            window.it(shouldNotHaveModifiedStatePersisted, function (omelette) {
                window.expect(omelette.isEaten).toBeUndefined();
            });

        }).execute();
    });

    asyncTest("Mocked dependencies are injected into tested module (mocks defined on suite)", 1, function () {

        var theOmeletteModule           = "The Omelette Module (suite)",
            shouldUseInjectedEggsModule = "should use the injected Eggs Module istead of its original dependency (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldUseInjectedEggsModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, {
            moduleName: "omelette",
            mock: function () {
                return {
                    eggs: { isMocked: true }
                };
            },
            specify: function () {
                window.it(shouldUseInjectedEggsModule, function (omelette) {
                    window.expect(omelette.getEggs().isMocked).toBeTruthy(); // Mocked Eggs Module is injected into tested Module
                    window.expect(omelette.getBacon().isMocked).toBeFalsy(); // Tested Module uses original (non-mocked) Bacon dependency
                });
            }

        }).execute();
    });

    asyncTest("Mocked dependencies are injected into tested module (mocks defined on spec)", 1, function () {

        var theOmeletteModule           = "The Omelette Module (suite)",
            shouldUseInjectedEggsModule = "should use the injected Eggs Module istead of its original dependency (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldUseInjectedEggsModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldUseInjectedEggsModule, {
                mock: {
                    eggs: { isMocked: true }
                },
                expect: function (omelette) {
                    window.expect(omelette.getEggs().isMocked).toBeTruthy(); // Mocked Eggs Module is injected into tested Module
                    window.expect(omelette.getBacon().isMocked).toBeFalsy(); // Tested Module uses original (non-mocked) Bacon dependency
                }
            });

        }).execute();
    });

    asyncTest("Mocked dependencies may be accessed through `dependencies` (mocks defined on suite)", 1, function () {

        var theOmeletteModule                   = "The Omelette Module (suite)",
            shouldExposedSameMockedDependencies = "should use the same mocked dependencies as those in `dependencies` (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldExposedSameMockedDependencies);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, {
            moduleName: "omelette",
            mock: function () {
                return {
                    eggs: { isMocked: true },
                    bacon: { isMocked: true }
                };
            },
            specify: function () {
                window.it(shouldExposedSameMockedDependencies, function (omelette, deps) {
                    window.expect(deps.eggs).toBeTruthy();             // Eggs Module is available as a dependency
                    window.expect(deps.eggs.isMocked).toBeTruthy();    // Eggs Module is mocked
                    window.expect(deps.eggs).toBe(omelette.getEggs()); // Eggs Module is also injected into tested Module

                    window.expect(deps.bacon).toBeTruthy();              // Bacon Module is available as a dependency
                    window.expect(deps.bacon.isMocked).toBeTruthy();     // Bacon Module is mocked
                    window.expect(deps.bacon).toBe(omelette.getBacon()); // Bacon Module is also injected into tested Module
                });
            }

        }).execute();
    });

    asyncTest("Mocked dependencies may be accessed through `dependencies` (mocks defined on spec)", 1, function () {

        var theOmeletteModule               = "The Omelette Module (suite)",
            shouldUseSameMockedDependencies = "should use the same mocked dependencies as those in `dependencies` (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldUseSameMockedDependencies);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldUseSameMockedDependencies, {
                mock: {
                    eggs: { isMocked: true },
                    bacon: { isMocked: true }
                },
                expect: function (omelette, deps) {
                    window.expect(deps.eggs).toBeTruthy();             // Eggs Module is available as a dependency
                    window.expect(deps.eggs.isMocked).toBeTruthy();    // Eggs Module is mocked
                    window.expect(deps.eggs).toBe(omelette.getEggs()); // Eggs Module is also injected into tested Module

                    window.expect(deps.bacon).toBeTruthy();              // Bacon Module is available as a dependency
                    window.expect(deps.bacon.isMocked).toBeTruthy();     // Bacon Module is mocked
                    window.expect(deps.bacon).toBe(omelette.getBacon()); // Bacon Module is also injected into tested Module
                }
            });

        }).execute();
    });

    asyncTest("Mocked dependencies defined on spec override those defined on suite", 1, function () {

        var theOmeletteModule                    = "The Omelette Module (suite)",
            shouldUseOverridenMockedDependencies = "should use overriden mocked dependencies (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldUseOverridenMockedDependencies);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, {
            moduleName: "omelette",
            mock: function () {
                return {
                    eggs: {
                        isMocked: true,
                        isDefinedOnSuite: true
                    },
                    bacon: {
                        isMocked: true,
                        isDefinedOnSuite: true
                    }
                };
            },
            specify: function () {
                window.it(shouldUseOverridenMockedDependencies, {
                    mock: {
                        eggs: { isDefinedOnSuite: false }
                    },
                    expect: function (omelette, deps) {
                        window.expect(deps.eggs).toBe(omelette.getEggs());
                        window.expect(deps.eggs.isDefinedOnSuite).toBe(false);

                        window.expect(deps.bacon).toBe(omelette.getBacon());
                        window.expect(deps.bacon.isDefinedOnSuite).toBe(true);
                    }
                });
            }

        }).execute();
    });

    asyncTest("Non-mocked dependencies may be accessed through `dependencies`", 1, function () {

        var theOmeletteModule                  = "The Omelette Module (suite)",
            shouldUseSameNonMockedDependencies = "should use the same non-mocked dependencies as those in `dependencies` (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldUseSameNonMockedDependencies);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldUseSameNonMockedDependencies, {
                mock: {
                    eggs: { isMocked: true }
                },
                expect: function (omelette, deps) {
                    window.expect(deps.bacon).toBeTruthy();              // Bacon Module is available as a dependency
                    window.expect(deps.bacon.isMocked).toBeFalsy();      // Bacon Module is _not_ mocked
                    window.expect(deps.bacon).toBe(omelette.getBacon()); // Bacon Module is the same as the one used by the Omelette Module
                }
            });

        }).execute();
    });

    asyncTest("A module-defining function may be used to mock object-returning-modules", 1, function () {

        var theOmeletteModule        = "The Omelette Module (suite)",
            shouldUseTheMockedModule = "should use the mocked Module (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldUseTheMockedModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldUseTheMockedModule, {
                mock: {
                    eggs: function () {
                        return { isMocked: true };
                    }
                },
                expect: function (omelette, deps) {
                    window.expect(isStrictlyObject(deps.eggs)).toBeTruthy();
                    window.expect(deps.eggs.isMocked).toBeTruthy();
                    window.expect(deps.eggs).toBe(omelette.getEggs());
                }
            });

        }).execute();
    });

    asyncTest("A module-defining function may be used to mock function-returning-modules", 1, function () {

        var theOmeletteModule        = "The Omelette Module (suite)",
            shouldUseTheMockedModule = "should use the mocked Module (spec)";

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldUseTheMockedModule);
            start();
        });

        // A Jasq suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {

            window.it(shouldUseTheMockedModule, {
                mock: {
                    eat: function () {
                        var f = function () { return true; };
                        f.isMocked = true;
                        return f;
                    }
                },
                expect: function (omelette, deps) {
                    window.expect(isFunction(deps.eat)).toBeTruthy();
                    window.expect(deps.eat.isMocked).toBeTruthy();
                    window.expect(deps.eat).toBe(omelette.eat);
                }
            });

        }).execute();
    });

    asyncTest("Specs may be disabled", 2, function () {

        var theOmeletteModule  = "The Omelette Module (suite)",
            shouldBlahBlah     = "should blah blah - this should run (spec)",
            shouldBlahBlahBlah = "should blah blah - this should not run (spec)",
            disabledSpecRun    = false;

        suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
            okSpec(suite, shouldBlahBlah);
            ok(!disabledSpecRun, "disabled spec did not execute");
            start();
        });

        // A Jasmine suite which describes the 'Omelette' module
        window.describe(theOmeletteModule, "omelette", function () {
            window.it(shouldBlahBlah, {
                expect: function () {
                    // This spec should run ..
                    window.expect(1).toBe(1);
                }
            });
            window.xit(shouldBlahBlahBlah, {
                expect: function () {
                    // .. while this spec shouldn't
                    disabledSpecRun = true;
                }
            });

        }).execute();
    });

    asyncTest("Suites may be disabled", 1, function () {

        var firstSpecRun, secondSpecRun;

        // A plain Jasmine suite which describes the 'Omelette' Module
        window.xdescribe("The Omelette Module (suite)", "omelette", function () {
            window.it("should explode", {
                expect: function () {
                    // This spec should not run ..
                    firstSpecRun = true;
                }
            });
            window.xit("should self desctruct", {
                expect: function () {
                    // .. and this spec shouldn't run either
                    secondSpecRun = true;
                }
            });
        }).execute();

        // Give it a sec - expect the suite not to have run
        window.setTimeout(function () {
            ok(!firstSpecRun && !secondSpecRun, "disabled suite did not execute");
            start();
        }, 300);
    });

    asyncTest("Specs may be asynchronous", 5, function () {

        var theEggsModule      = "The Eggs Module (suite)",
            someEggsSpec       = "should blah blah, eggs, sync (spec)",
            someOtherEggsSpec  = "should blah blah blah, eggs, sync (spec)",

            theOmeletteModule     = "The Omelette Module (suite)",
            someOmeletteSpecAsync = "should blah blah, omelette, async (spec)",
            someOtherOmeletteSpec = "should blah blah blah, omelette, sync (spec)",

            theBaconModule     = "The Bacon Module (suite)",
            someBaconSpecAsync = "should blah blah, bacon, async (spec)";

        suiteWatcher
        .onCompleted([theEggsModule, theOmeletteModule, theBaconModule], function (suite) {
            okSpec(suite, someBaconSpecAsync);
        })
        .onCompleted([theEggsModule, theOmeletteModule], function (suite) {
            okSpec(suite, someOtherOmeletteSpec);
            okSpec(suite, someOmeletteSpecAsync);
        })
        .onCompleted(theEggsModule, function (suite) {
            okSpec(suite, someOtherEggsSpec);
            okSpec(suite, someEggsSpec);
            start();
        });

        // A Jasq suite which describes the 'Eggs' Module
        window.describe(theEggsModule, "eggs", function () {

            // This _sync_ expectation refers to the Eggs Module
            window.it(someEggsSpec, function () {
                //
                var x;
            });

            // A _nested_ jasq suite which describes the 'Omelette' Module
            window.describe(theOmeletteModule, "omelette", function () {

                // This _async_ expectation refers to the Omelette Module
                window.it(someOmeletteSpecAsync, function (omelette, deps, done) {

                    window.setTimeout(function () {
                        done();
                    }, 300);

                });

                // A _nested_ _nested_ jasq suite which describes the 'Bacon' Module
                window.describe(theBaconModule, "bacon", function () {

                    // This _async_ expectation refers to the Bacon Module
                    window.it(someBaconSpecAsync, function (bacon, deps, done) {

                        window.setTimeout(function () {
                            done();
                        }, 150);

                    });
                });

                // This expectation refers to the Omelette Module
                window.it(someOtherOmeletteSpec, function () {
                    //
                });
            });

            // This expectation refers to the Eggs Module
            window.it(someOtherEggsSpec, function () {
                //
            });

        }).execute();
    });
});
