/*jshint browser:true */
/*global require, define, QUnit, test, asyncTest, ok, strictEqual, deepEqual, start, stop, throws, jasmine */
define(["jasq"], function (jasq) {
    "use strict";

    var
        isFunction = function (f) {
            return Object.prototype.toString.call(f) === "[object Function]";
        },

        each = function (array, iterator) {
            for (var i = 0, l = array.length; i < l; ++i) { iterator(array[i], i); }
        },

        globalMethodNames = ["describe", "xdescribe", "it", "xit"],

        whenJasmineLoaded = function (onJasmineLoaded) {
            if (window.jasmine) { return onJasmineLoaded(); }
            require(["vendor/jasmine/jasmine.js"], function () { onJasmineLoaded(); });
        };

    ////////////////////////////////////
    ////////////////////////////////////

    QUnit.module("Environment (Jasmine not loaded)");

    //
    test("jasmine globals (" + globalMethodNames.join(", ") + ") are not available", 4, function () {
        if (window.jasmine) { throw "This test requires that Jasmine hasn't loaded"; }

        each(globalMethodNames, function (methodName) {
            ok(!window[methodName], "'" + methodName + "' is not globally available");
        });
    });

    //
    test("no patched globals are exposed on jasq", 4, function () {
        if (window.jasmine) { throw "This test requires that Jasmine hasn't loaded"; }

        each(globalMethodNames, function (methodName) {
            ok(!jasq[methodName], "'" + methodName + "' is not exposed on jasq");
        });
    });

    //
    test("attempting to patch/reset globals throws", 2, function () {
        if (window.jasmine) { throw "This test requires that Jasmine hasn't loaded"; }

        throws(function () { jasq.patchGlobals(); }, "attempting to patch globals throws");
        throws(function () { jasq.resetGlobals(); }, "attempting to reset globals throws");
    });

    ////////////////////////////////////
    ////////////////////////////////////

    QUnit.module("Environment (Jasmine loaded)");

    //
    asyncTest("patching will expose the jasq-patched globals (globally and on jasq)", 12, function () {
        whenJasmineLoaded(function () {
            jasq.patchGlobals();

            each(globalMethodNames, function (methodName) {
                ok(isFunction(window[methodName]), "'" + methodName + "' is globally available ..");
                strictEqual(window[methodName].isJasq, true, ".. is jasq-patched ..");
                strictEqual(jasq[methodName], window[methodName], ".. and is also exposed on jasq");
            });

            start();
        });
    });

    //
    asyncTest("globals may be reset and re-patched", 16, function () {
        whenJasmineLoaded(function () {
            jasq.patchGlobals();

            jasq.resetGlobals();

            each(globalMethodNames, function (methodName) {
                ok(isFunction(window[methodName]), "after reset, '" + methodName + "' is globally available ..");
                ok(!window[methodName].isJasq, ".. and is not jasq-patched");
            });

            jasq.patchGlobals();

            each(globalMethodNames, function (methodName) {
                ok(isFunction(window[methodName]), "after patch, '" + methodName + "' is globally available ..");
                strictEqual(window[methodName].isJasq, true, ".. and is jasq-patched");
            });

            start();
        });
    });

});
