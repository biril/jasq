/*jshint browser:true */
/*global require, define, QUnit, test, asyncTest, ok, strictEqual, deepEqual, start, stop, jasmine */
define(["helpers", "jasq"], function (helpers, jasq) {
  "use strict";

  var
    isFunction       = helpers.isFunction,
    isStrictlyObject = helpers.isStrictlyObject,
    each             = helpers.each,
    find             = helpers.find,

    okSpec       = helpers.okSpec,
    okSuite      = helpers.okSuite,
    suiteWatcher = helpers.startSuiteWatcher(jasmine),

    globalMethodNames = ["describe", "xdescribe", "it", "xit"],
    jasmineTimeoutInterval = jasmine.DEFAULT_TIMEOUT_INTERVAL;

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

  asyncTest("Suite executes", 1, function () {

    var
      theThing = "The thing (suite)",
      shouldDoSomething = "should do something (spec)";

    suiteWatcher.onCompleted(theThing, function (suite) {
      okSpec(suite, shouldDoSomething);
      start();
    });

    // A plain Jasmine suite which describes 'The thing'
    window.describe(theThing, function () {
      window.it(shouldDoSomething, function () {
        // .. expectations ..
      });

    }).execute();
  });

  asyncTest("Suites execute", 2, function () {

    var
      theThingSuite,
      theThing          = "The thing (suite)",
      shouldDoSomething = "should do something (spec)",

      theHappeningSuite,
      theHappening      = "The happening (suite)",
      shouldHappen      = "should happen (spec)",

      isDoneTheThing, isDoneTheHappening,
      startIfDone = function () {
        if (isDoneTheThing && isDoneTheHappening) {
          start();
        }
      };

    suiteWatcher
      .onCompleted(theThing, function (suite) {
        okSpec(suite, shouldDoSomething);
        isDoneTheThing = true;
        startIfDone();
      })
      .onCompleted(theHappening, function (suite) {
        okSpec(suite, shouldHappen);
        isDoneTheHappening = true;
        startIfDone();
      });

    //
    theThingSuite = window.describe(theThing, function () {
      window.it(shouldDoSomething, function () {
        // .. expectations ..
      });
    });

    //
    theHappeningSuite = window.describe(theHappening, function () {
      window.it(shouldHappen, function () {
        // .. expectations ..
      });
    });

    jasmine.getEnv().execute([theHappeningSuite.id, theThingSuite.id]);

  });

  asyncTest("Suites with same paths execute", 2, function () {

    var
      theThingSuite,
      theThing          = "The thing (suite)",
      shouldDoSomething = "should do something (spec)",

      theThingAgainSuite,

      isDoneThing, isDoneThingAgain,
      startIfDone = function () {
        if (isDoneThing && isDoneThingAgain) {
          start();
        }
      };

    //
    theThingSuite = window.describe(theThing, function () {
      window.it(shouldDoSomething, function () {
        ok(isDoneThing = true, 'First suite executed');
        startIfDone();
      });
    });

    //
    theThingAgainSuite = window.describe(theThing, function () {
      window.it(shouldDoSomething, function () {
        ok(isDoneThingAgain = true, 'Second suite executed');
        startIfDone();
      });
    });

    jasmine.getEnv().execute([theThingAgainSuite.id, theThingSuite.id]);

  });

  asyncTest("Specs may be disabled", 2, function () {

    var
      theThing           = "The thing (suite)",
      shouldBlahBlah     = "should blah blah - this should run (spec)",
      shouldBlahBlahBlah = "should blah blah - this should not run (spec)",
      isSecondSpecExecuted = false;

    suiteWatcher.onCompleted(theThing, function (suite) {
      ok(!isSecondSpecExecuted, 'Disabled spec (xit) did not execute');
      okSpec(suite, shouldBlahBlah);
      start();
    });

    // A plain Jasmine suite which describes 'The thing'
    window.describe(theThing, function () {
      window.it(shouldBlahBlah, function () {
        // .. expectations ..
      });
      window.xit(shouldBlahBlahBlah, function () {
        // .. expectations ..
        isSecondSpecExecuted = true; // Should not run
      });

    }).execute();
  });

  asyncTest("Suites may be disabled", 1, function () {

    var isSuiteExecuted;

    // A plain Jasmine suite which describes 'The thing'
    window.xdescribe("The thing (suite)", function () {
      window.it('should explode (spec)', function () {
        isSuiteExecuted = true;
      });

    }).execute(function () {
      ok(!isSuiteExecuted, "Disabled suite (xdescribe) did not execute");
      start();
    });
  });

  asyncTest("Synchronous specs receive no arguments", 2, function () {

    var
      theOmeletteModule      = "The Omelette Module (suite)",
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

  asyncTest("Asynchronous specs receive done argument", 2, function () {

    var
      theOmeletteModule      = "The Omelette Module (suite)",
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
        window.setTimeout(function () {
          done(); // Done asynchronously
        }, 10);
      });

      window.it(shouldTasteMoreAmazing, {
        expect: function (done) {
          window.expect(isFunction(done)).toBeTruthy();
          done(); // Done synchronously
        }
      });

    }).execute();
  });

  asyncTest("Asynchronous specs time out", 4, function () {

    var
      theOmeletteModule  = "The Omelette Module (suite)",
      shouldTasteAmazing = "should taste amazing (spec)",
      shouldTasteAwesome = "should taste awesome (spec)";

    suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
      var
        jasmineTimeoutMessage = "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
        shouldTasteAmazingSpec,
        shouldTasteAwesomeSpec;

      shouldTasteAmazingSpec = find(suite.specs, function (spec) {
        return spec.description === shouldTasteAmazing;
      });
      shouldTasteAwesomeSpec = find(suite.specs, function (spec) {
        return spec.description === shouldTasteAwesome;
      });

      strictEqual(shouldTasteAwesomeSpec.status, "failed", shouldTasteAwesome + " failed ..");
      strictEqual(shouldTasteAwesomeSpec.failedExpectations[0].message, jasmineTimeoutMessage,
        ".. with message " + jasmineTimeoutMessage);

      strictEqual(shouldTasteAmazingSpec.status, "failed", shouldTasteAmazing + " failed ..");
      strictEqual(shouldTasteAmazingSpec.failedExpectations[0].message, jasmineTimeoutMessage,
        ".. with message " + jasmineTimeoutMessage);

      start();
    });

    // A plain suite which includes a jasq-spec
    window.describe(theOmeletteModule, function () {

      window.beforeEach(function () { jasmine.DEFAULT_TIMEOUT_INTERVAL = 10; });
      window.afterEach(function ()  { jasmine.DEFAULT_TIMEOUT_INTERVAL = jasmineTimeoutInterval; });

      window.it(shouldTasteAmazing, function (done) {
        // Never invokes `done`
      });

      window.it(shouldTasteAwesome, {
        expect: function (done) {
          // Never invokes `done`
        }
      });

    }).execute();
  });

  ////////////////////////////////////
  ////////////////////////////////////

  // Behaviour of spec-suites that are associated with Modules
  QUnit.module("Suites with Mod");

  asyncTest("Suites execute", 2, function () {

    var
      theOmeletteModuleSuite,
      theOmeletteModule = "The Omelette Module (suite)",
      shouldDoSomething = "should do something (spec)",

      theOmeletteModuleAgainSuite,
      theOmeletteModuleAgain = "The Omelette Module again (suite)",
      shouldDoSomethingElse  = "should do something else (spec)",

      isDoneOmelette, isDoneOmeletteAgain,
      startIfDone = function () {
        if (isDoneOmelette && isDoneOmeletteAgain) {
          start();
        }
      };

    suiteWatcher
      .onCompleted(theOmeletteModule, function (suite) {
        okSpec(suite, shouldDoSomething);
        isDoneOmelette = true;
        startIfDone();
      })
      .onCompleted(theOmeletteModuleAgain, function (suite) {
        okSpec(suite, shouldDoSomethingElse);
        isDoneOmeletteAgain = true;
        startIfDone();
      });

    //
    theOmeletteModuleSuite = window.describe(theOmeletteModule, "omelette", function () {
      window.it(shouldDoSomething, function () {
        // .. expectations ..
      });
    });

    //
    theOmeletteModuleAgainSuite = window.describe(theOmeletteModuleAgain, "omelette", function () {
      window.it(shouldDoSomethingElse, function () {
        // .. expectations ..
      });
    });

    jasmine.getEnv().execute([theOmeletteModuleAgainSuite.id, theOmeletteModuleSuite.id]);

  });

  asyncTest("Suites with same paths execute", 2, function () {

    var
      theOmeletteModuleSuite,
      theOmeletteModule = "The Omelette Module (suite)",
      shouldDoSomething = "should do something (spec)",

      theOmeletteModuleAgainSuite,

      isDoneOmelette, isDoneOmeletteAgain,
      startIfDone = function () {
        if (isDoneOmelette && isDoneOmeletteAgain) {
          start();
        }
      };

    //
    theOmeletteModuleSuite = window.describe(theOmeletteModule, "omelette", function () {
      window.it(shouldDoSomething, function () {
        ok(isDoneOmelette = true, 'First suite executed');
        startIfDone();
      });
    });

    //
    theOmeletteModuleAgainSuite = window.describe(theOmeletteModule, "omelette", function () {
      window.it(shouldDoSomething, function () {
        ok(isDoneOmeletteAgain = true, 'Second suite executed');
        startIfDone();
      });
    });

    jasmine.getEnv().execute([theOmeletteModuleAgainSuite.id, theOmeletteModuleSuite.id]);

  });

  asyncTest("Module is available to specs within the suite", 2, function () {

    var
      theOmeletteModule      = "The Omelette Module (suite)",
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

    var
      theOmeletteModule                      = "The Omelette Module (suite)",
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

        // A _twice nested_ jasq suite (which would describe the 'Omelette' Module in terms
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

      var
        theEggsModule                          = "The Eggs Module (suite)",
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

  asyncTest("Modules associated with nested suites shadow those of outer suites (when interleaved with nested suites that don\'t)", 10, function () {

      var
        theEggsModule                          = "The Eggs Module (suite)",
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
        theBaconModule                = "The Bacon Module (suite)",
        shouldBePassedToSpecsTNested  = "should be passed to specs (spec)",
        shouldBePassedToSpecsTNested2 = "should be passed to specs defined with spec-config (spec)";

      suiteWatcher
      .onCompleted([theEggsModule, inTermsOfSomeBehaviour, theBaconModule], function (suite) {
        okSpec(suite, shouldBePassedToSpecsTNested2);
        okSpec(suite, shouldBePassedToSpecsTNested);
      })
      .onCompleted([theEggsModule, inTermsOfSomeBehaviour], function (suite) {
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

          // A _nested_ non-jasq suite - it refers to 'Eggs' Module since as it doesn't provide
          //  a suite-config that would override the module associated with the parent suite
          window.describe(inTermsOfSomeBehaviour, function () {

            window.it(shouldBePassedToSpecsNested, function () {
              // .. expectations ..
            });
            window.it(shouldBePassedToSpecsNested2, {
              expect: function () {
                // .. expectations ..
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

            // This expectation refers to the 'Eggs' Module
            window.it(shouldBePassedToSpecsNestedAfterTNestedSuite, function () {
              // .. expectations ..
            });
            window.it(shouldBePassedToSpecsNestedAfterTNestedSuite2, {
              expect: function () {
                // .. expectations ..
              }
            });
          });

          // This expectation refers to the 'Eggs' Module
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

  asyncTest("Modules may be associated with nested suites within disabled suites", 5, function () {

      var
        theEggsModule                          = "The Eggs Module (suite)",
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
      // The bacon suite will never execute. Looks like, this is Jasmine behaviour for suites
      //  nested within disabled suites
      // .onCompleted([theEggsModule, theOmeletteModule, theBaconModule], function (suite) {
      //   okSpec(suite, shouldBePassedToSpecsTNested2);
      //   okSpec(suite, shouldBePassedToSpecsTNested);
      // })
      .onCompleted([theEggsModule, theOmeletteModule], function (suite) {
        strictEqual(suite.specs.length, 0, "No specs executed as part of " + suite.path.join(" "));
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
          window.xdescribe(theOmeletteModule, "omelette", function () {

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
                // .. will never excute
              });
              window.it(shouldBePassedToSpecsTNested2, {
                expect: function (bacon) {
                  // .. will never excute
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

  asyncTest("Asynchronous specs receive done argument", 2, function () {

    var
      theOmeletteModule      = "The Omelette Module (suite)",
      shouldTasteAmazing     = "should taste amazing (spec)",
      shouldTasteMoreAmazing = "should taste more amazing (spec)";

    suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
      okSpec(suite, shouldTasteMoreAmazing);
      okSpec(suite, shouldTasteAmazing);
      start();
    });

    // A plain suite which includes a jasq-spec
    window.describe(theOmeletteModule, "omelette", function () {

      window.it(shouldTasteAmazing, function (omelette, deps, done) {
        window.expect(isFunction(done)).toBeTruthy();
        window.setTimeout(function () {
          done(); // Done asynchronously
        }, 10);
      });

      window.it(shouldTasteMoreAmazing, {
        expect: function (omelette, deps, done) {
          window.expect(isFunction(done)).toBeTruthy();
          done(); // Done synchronously
        }
      });

    }).execute();
  });

  asyncTest("Asynchronous specs of nested suites receive done argument", 3, function () {

    var
      theEggsModule = "The Eggs Module (suite)",

      theOmeletteModule     = "The Omelette Module (suite)",
      someOmeletteSpecAsync = "should blah blah, omelette, async (spec)",

      theBaconModule     = "The Bacon Module (suite)",
      someBaconSpecAsync = "should blah blah, bacon, async (spec)",

      theThing               = "The thing (suite)",
      shouldDoSomethingAsync = "should do something, async (spec)";

    suiteWatcher
    .onCompleted([theEggsModule, theOmeletteModule, theThing], function (suite) {
      okSpec(suite, shouldDoSomethingAsync);
    })
    .onCompleted([theEggsModule, theOmeletteModule, theBaconModule], function (suite) {
      okSpec(suite, someBaconSpecAsync);
    })
    .onCompleted([theEggsModule, theOmeletteModule], function (suite) {
      okSpec(suite, someOmeletteSpecAsync);
    })
    .onCompleted(theEggsModule, function (suite) {
      start();
    });

    // A Jasq suite which describes the 'Eggs' Module
    window.describe(theEggsModule, "eggs", function () {

      // A _nested_ jasq suite which describes the 'Omelette' Module
      window.describe(theOmeletteModule, "omelette", function () {

        // This _async_ expectation refers to the Omelette Module
        window.it(someOmeletteSpecAsync, function (omelette, deps, done) {
          window.expect(isFunction(done)).toBeTruthy();
          window.setTimeout(function () {
            done(); // Done asynchronously
          }, 10);

        });

        // A _nested_ _nested_ jasq suite which describes the 'Bacon' Module
        window.describe(theBaconModule, "bacon", function () {

          // This _async_ expectation refers to the Bacon Module
          window.it(someBaconSpecAsync, function (bacon, deps, done) {
            window.expect(isFunction(done)).toBeTruthy();
            done(); // Done synchronously
          });
        });

        // A _nested_ _nested_ plain suite which
        window.describe(theThing, function () {

          //
          window.it(shouldDoSomethingAsync, function (__, ___, done) {
            window.expect(isFunction(done)).toBeTruthy();
            window.setTimeout(function () {
              done(); // Done asynchronously
            }, 10);
          });
        });

      });

    }).execute();
  });

  asyncTest("Asynchronous specs time out", 4, function () {

    var
      theOmeletteModule  = "The Omelette Module (suite)",
      shouldTasteAmazing = "should taste amazing (spec)",
      shouldTasteAwesome = "should taste awesome (spec)";

    suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
      var
        jasmineTimeoutMessage = "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
        shouldTasteAmazingSpec,
        shouldTasteAwesomeSpec;

      shouldTasteAmazingSpec = find(suite.specs, function (spec) {
        return spec.description === shouldTasteAmazing;
      });
      shouldTasteAwesomeSpec = find(suite.specs, function (spec) {
        return spec.description === shouldTasteAwesome;
      });

      strictEqual(shouldTasteAwesomeSpec.status, "failed", shouldTasteAwesome + " failed ..");
      strictEqual(shouldTasteAwesomeSpec.failedExpectations[0].message, jasmineTimeoutMessage,
        ".. with message " + jasmineTimeoutMessage);

      strictEqual(shouldTasteAmazingSpec.status, "failed", shouldTasteAmazing + " failed ..");
      strictEqual(shouldTasteAmazingSpec.failedExpectations[0].message, jasmineTimeoutMessage,
        ".. with message " + jasmineTimeoutMessage);

      start();
    });

    // A plain suite which includes a jasq-spec
    window.describe(theOmeletteModule, "omelette", function () {

      window.beforeEach(function () { jasmine.DEFAULT_TIMEOUT_INTERVAL = 10; });
      window.afterEach(function ()  { jasmine.DEFAULT_TIMEOUT_INTERVAL = jasmineTimeoutInterval; });

      window.it(shouldTasteAmazing, function (omelette, deps, done) {
        // Never invokes `done`
      });

      window.it(shouldTasteAwesome, {
        expect: function (omelette, deps, done) {
          // Never invokes `done`
        }
      });

    }).execute();
  });

  asyncTest("Module's state is not persisted across specs", 2, function () {

    var
      theOmeletteModule                   = "The Omelette Module (suite)",
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

    var
      theOmeletteModule           = "The Omelette Module (suite)",
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

    var
      theOmeletteModule           = "The Omelette Module (suite)",
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

    var
      theOmeletteModule                   = "The Omelette Module (suite)",
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

    var
      theOmeletteModule               = "The Omelette Module (suite)",
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

    var
      theOmeletteModule                    = "The Omelette Module (suite)",
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

    var
      theOmeletteModule                  = "The Omelette Module (suite)",
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

  asyncTest("Module dependencies' state is not persisted across specs", 2, function () {

    var
      theOmeletteModule                      = "The Omelette Module (suite)",
      depShouldHaveStateModified             = "its dependency should have its state potentially modified in specs (spec)",
      depShouldNotHaveModifiedStatePersisted = "its dependency should not have modified state persisted from previous specs (spec)";

    suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
      okSpec(suite, depShouldNotHaveModifiedStatePersisted);
      okSpec(suite, depShouldHaveStateModified);
      start();
    });

    // A Jasq suite which describes the 'Omelette' module
    window.describe(theOmeletteModule, "omelette", function () {

      window.it(depShouldHaveStateModified, function (omelette, deps) {
        deps.eggs.isEaten = true;
        window.expect(deps.eggs.isEaten).toBe(true);
      });

      window.it(depShouldNotHaveModifiedStatePersisted, function (omelette, deps) {
        window.expect(deps.eggs.isEaten).toBeUndefined();
      });

    }).execute();
  });

  asyncTest("A module-defining function may be used to mock object-returning-modules", 1, function () {

    var
      theOmeletteModule        = "The Omelette Module (suite)",
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

    var
      theOmeletteModule        = "The Omelette Module (suite)",
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

    var
      theOmeletteModule  = "The Omelette Module (suite)",
      shouldBlahBlah     = "should blah blah - this should run (spec)",
      shouldBlahBlahBlah = "should blah blah - this should not run (spec)",
      isSecondSpecExecuted = false;

    suiteWatcher.onCompleted(theOmeletteModule, function (suite) {
      okSpec(suite, shouldBlahBlah);
      ok(!isSecondSpecExecuted, "Disabled spec (xit) did not execute");
      start();
    });

    // A Jasmine suite which describes the 'Omelette' module
    window.describe(theOmeletteModule, "omelette", function () {
      window.it(shouldBlahBlah, {
        expect: function () {
          // This spec should run ..
        }
      });
      window.xit(shouldBlahBlahBlah, {
        expect: function () {
          // .. while this spec shouldn't
          isSecondSpecExecuted = true;
        }
      });

    }).execute();
  });

  asyncTest("Suites may be disabled", 1, function () {

      var isSuiteExecuted;

      // A plain Jasmine suite which describes the 'Omelette' Module
      window.xdescribe("The Omelette Module (suite)", "omelette", function () {
          window.it("should explode", {
              expect: function () {
                  // This spec should not run ..
                  isSuiteExecuted = true;
              }
          });
          window.xit("should self desctruct", {
              expect: function () {
                  // .. and this spec shouldn't run either
                  isSuiteExecuted = true;
              }
          });

      }).execute(function () {
          ok(!isSuiteExecuted, "Disabled suite (xdescribe) did not execute");
        start();
      });
  });
});
