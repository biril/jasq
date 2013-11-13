/*jshint browser:true */
/*global require, define, QUnit, test, asyncTest, ok, strictEqual, deepEqual, start, stop, jasmine */
define(["jasq"], function (jasq) {
    "use strict";

    describe("The modA module", "modA", function () {

        // The module is passed to specs within the suite, as a parameter
        it("should have a value of 'A'", {
            expect: function (modA) {
                expect(modA.getValue()).toBe("A"); // Passes
            }
        });

        describe("its value", function () {

            // The module is also passed to specs within the nested suite
            it("should be 'A'", {
                expect: function (modA) {
                    expect(modA.getValue()).toBe("A"); // Passes
                }
            });
        });

        // This spec modifies modA
        it("should have a value of 'C' when tweaked", {
            expect: function (modA) {
                modA.getValue = function () {
                    return "C";
                };
                expect(modA.getValue()).toBe("C"); // Passes
            }
        });

        // This spec is passed the original, unmodified modA
        it("should have a value of 'A'", {
            expect: function (modA) {
                expect(modA.getValue()).toBe("A"); // Passes
            }
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

        // Mocked modB may be accessed through 'dependencies.mocks.modB'
        it("should expose modB's value", {
            mock: {
                modB: {} // Mocking with an empty object
            },
            expect: function (modA, dependencies) {
                dependencies.mocks.modB.getValue = function () {
                    return "D";
                };
                expect(modA.getModBValue()).toBe("D"); // Passes
            }
        });

        // Stored modB may be accessed through 'dependencies.store.modB'
        it("should delegate to modB to expose modB's value", {
            store: [
                "modB"
            ],
            expect: function (modA, dependencies) {
                spyOn(dependencies.store.modB, "getValue");
                modA.getModBValue();
                expect(dependencies.store.modB.getValue).toHaveBeenCalled(); // Passes
            }
        });

    });

});
