/*jshint browser:true */
/*global define, QUnit, asyncTest, start, jasmine */
define(["helpers", "jasq"], function (helpers) {
  "use strict";

  var
    okSpec       = helpers.okSpec,
    suiteWatcher = helpers.startSuiteWatcher(jasmine);

  ////////////////////////////////////
  ////////////////////////////////////

  // Validate the examples in README
  QUnit.module("Example");

  asyncTest("`modA` is available to specs within the suite", 1, function () {

    var
      theModAModule = "The modA module (suite)",
      shouldHaveAValueOfA = "should have a value of 'A' (spec)";

    suiteWatcher.onCompleted(theModAModule, function (suite) {
      okSpec(suite, shouldHaveAValueOfA);
      start();
    });

    window.describe(theModAModule, "modA", function () {

      // The module is passed to specs within the suite, as a parameter
      window.it(shouldHaveAValueOfA, function (modA) {
        window.expect(modA.getValue()).toBe("A"); // Passes
      });

    }).execute();
  });

  asyncTest("`modA` is available to specs within nested suites", 1, function () {

    var
      theModAModule = "The modA module (suite)",
      itsValue = "its value (nested suite)",
      shouldBeA = "should be 'A' (spec)";

    suiteWatcher.onCompleted([theModAModule, itsValue], function (suite) {
      okSpec(suite, shouldBeA);
    });
    suiteWatcher.onCompleted(theModAModule, function (/* suite */) {
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

  asyncTest("`modA`'s state is not persisted across specs", 2, function () {

    var
      theModAModule = "The modA module (suite)",
      shouldHaveAValueOfCWhenTweaked = "should have a value of 'C' when tweaked (spec)",
      shouldHaveAValueOfA = "should have a value of 'A' (spec)";

    suiteWatcher.onCompleted(theModAModule, function (suite) {
      okSpec(suite, shouldHaveAValueOfA);
      okSpec(suite, shouldHaveAValueOfCWhenTweaked);
      start();
    });

    window.describe(theModAModule, "modA", function () {

      // This spec modifies modA
      window.it(shouldHaveAValueOfCWhenTweaked, function (modA) {
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

  asyncTest("`modA`'s dependencies may be mocked", 1, function () {

    var
      theModAModule = "The modA module (suite)",
      shouldExposeModBsValue = "should expose modB's value (spec)";

    suiteWatcher.onCompleted(theModAModule, function (suite) {
      okSpec(suite, shouldExposeModBsValue);
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

  asyncTest("Mocked dependencies may be accessed through `dependencies`", 1, function () {

    var
      theModAModule = "The modA module (suite)",
      shouldExposeModBsValue = "should expose modB's value (spec)";

    suiteWatcher.onCompleted(theModAModule, function (suite) {
      okSpec(suite, shouldExposeModBsValue);
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

  asyncTest("Non-mocked dependencies may be accessed through `dependencies`", 1, function () {

    var
      theModAModule = "The modA module (suite)",
      shouldDelegateToModB = "should delegate to modB to expose modB's value (spec)";

    suiteWatcher.onCompleted(theModAModule, function (suite) {
      okSpec(suite, shouldDelegateToModB);
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

  asyncTest("Dependencies may be mocked at the suite level", 3, function () {

    var
      theModAModule = "The modA module (suite)",
      shouldExposeModBsValue = "should expose modB's value (spec)",
      shouldNotCacheModBsValue = "should not cache modB's value (spec)",
      shouldExposeModBsValueAgain = "should expose modB's value - again (spec)";

    suiteWatcher.onCompleted(theModAModule, function (suite) {
      okSpec(suite, shouldExposeModBsValueAgain);
      okSpec(suite, shouldNotCacheModBsValue);
      okSpec(suite, shouldExposeModBsValue);
      start();
    });

    window.describe(theModAModule, {
      moduleName: "modA",
      mock: function () {

        // Define a mock for ModB
        return {
          modB: {
            getValue: function () {
              return "C";
            }
          }
        };
      },
      specify: function () {

        // modA will use the mocked version of modB
        window.it(shouldExposeModBsValue, function (modA) {
          window.expect(modA.getModBValue()).toBe("C"); // Passes
        });

        // This spec modifies the mocked modB
        window.it(shouldNotCacheModBsValue, function (modA, dependencies) {
          dependencies.modB.getValue = function () {
            return "D";
          };
          window.expect(modA.getModBValue()).toBe("D"); // Passes
        });

        // modA will use the mocked version of modB, unmodified
        window.it(shouldExposeModBsValueAgain, function (modA) {
          window.expect(modA.getModBValue()).toBe("C"); // Passes
        });
      }

    }).execute();
  });

  asyncTest("Mocked dependencies defined on spec override those defined on suite", 1, function () {

    var
      theModAModule = "The modA module (suite)",
      shouldExposeModBsValue = "should expose modB's value (spec)";

    suiteWatcher.onCompleted(theModAModule, function (suite) {
      okSpec(suite, shouldExposeModBsValue);
      start();
    });

    window.describe(theModAModule, {
      moduleName: "modA",
      mock: function () {

        // Define a mock for ModB
        return {
          modB: {
            getValue: function () {
                return "C";
            }
          }
        };
      },
      specify: function () {

        // Redefine the modB mock - modA will use the redefined version
        window.it(shouldExposeModBsValue, {
          mock: {
            modB: {
              getValue: function () {
                return "D";
              }
            }
          },
          expect: function (modA) {
            window.expect(modA.getModBValue()).toBe("D"); // Passes
          }
        });
      }

    }).execute();
  });

  asyncTest("Jasmine `done` is available to async specs that are associated with a module", 1, function () {

    var
      theModAModule = "The modA module (suite)",
      shouldHaveValueAAfterAWhile = "should have value A, after a while (spec)";

    suiteWatcher.onCompleted(theModAModule, function (suite) {
      okSpec(suite, shouldHaveValueAAfterAWhile);
      start();
    });

    // If spec is associated with a module access 'done' as the third argument
    window.describe(theModAModule, "modA", function () {

      window.it(shouldHaveValueAAfterAWhile, function (modA, dependencies, done) {
        modA.getValueAfterAWhile(function (value) {
          window.expect(value).toBe("A"); // Passes
          done(); // Invoked to start the spec
        });
      });

    }).execute();
  });

  asyncTest("Jasmine `done` is available to async specs that aren't associated with a module", 0, function () {

    // Otherwise access 'done' as the first (and only) argument
    window.describe("Something", function () {

      window.it("should happen after a while", function (done) {
        setTimeout(function () {
          done(); // Invoked to start the spec
        }, 100);
      });

    }).execute(function () { start(); });
  });

});
