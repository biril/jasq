/*global define, describe, it, expect, spyOn */
define(["jasq"], function (jasq) {
  "use strict";

  describe("The modA module", "modA", function () {

    // The module is passed to specs within the suite, as a parameter
    it("should have a value of 'A'", function (modA) {
      expect(modA.getValue()).toBe("A"); // Passes
    });

    describe("its value", function () {

      // The module is also passed to specs within the nested suite
      it("should be 'A'", function (modA) {
        expect(modA.getValue()).toBe("A"); // Passes
      });
    });

    // This spec modifies modA
    it("should have a value of 'C' when tweaked", function (modA) {
      modA.getValue = function () {
        return "C";
      };
      expect(modA.getValue()).toBe("C"); // Passes
    });

    // This spec is passed the original, unmodified modA
    it("should have a value of 'A'", function (modA) {
      expect(modA.getValue()).toBe("A"); // Passes
    });

    // Define a mock for modB
    var mockB = {
      getValue: function () {
        return "C";
      }
    };

    // modA will use the mocked version of modB
    it("should expose modB's value", {
      mock: {
        modB: mockB
      },
      expect: function (modA) {
        expect(modA.getModBValue()).toBe("C"); // Passes
      }
    });

    // Mocked modB may be accessed through 'dependencies.modB'
    it("should expose modB's value", {
      mock: {
        modB: {} // Mocking with an empty object
      },
      expect: function (modA, dependencies) {
        dependencies.modB.getValue = function () {
          return "D";
        };
        expect(modA.getModBValue()).toBe("D"); // Passes
      }
    });

    // Non-mocked modB may be accessed through 'dependencies.modB'
    it("should delegate to modB to expose modB's value", {
      expect: function (modA, dependencies) {
        spyOn(dependencies.modB, "getValue");
        modA.getModBValue();
        expect(dependencies.modB.getValue).toHaveBeenCalled(); // Passes
      }
    });

  });

});
