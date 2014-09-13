/*jshint browser:true */
/*global require, define, QUnit, test, asyncTest, ok, strictEqual, deepEqual, start, stop, throws, jasmine */
define(["helpers", "jasq"], function (helpers, jasq) {
  "use strict";

  var
    isFunction = helpers.isFunction,
    each = helpers.each,

    globalMethodNames = ["describe", "xdescribe", "it", "xit"],

    whenJasmineLoaded = function (onJasmineLoaded) {
      if (window.jasmine) { return onJasmineLoaded(); }
      require(["vendor/jasmine/jasmine.js"], function () { onJasmineLoaded(); });
    };

  ////////////////////////////////////
  ////////////////////////////////////

  // How jasq behaves when Jasmine not loaded
  QUnit.module("Environment (Jasmine not loaded)");

  test("jasmine globals (" + globalMethodNames.join(", ") + ") are not available", 4, function () {
    if (window.jasmine) { throw "This test requires that Jasmine hasn't loaded"; }

    each(globalMethodNames, function (methodName) {
      ok(!window[methodName], "'" + methodName + "' is not globally available");
    });
  });

  test("no jasmine globals (" + globalMethodNames.join(", ") + ") are exposed on jasq", 4, function () {
    if (window.jasmine) { throw "This test requires that Jasmine hasn't loaded"; }

    each(globalMethodNames, function (methodName) {
      ok(!jasq[methodName], "'" + methodName + "' is not exposed on jasq");
    });
  });

  test("attempting to apply/reset globals throws", 2, function () {
    if (window.jasmine) { throw "This test requires that Jasmine hasn't loaded"; }

    throws(function () { jasq.applyGlobals(); }, "attempting to apply globals throws");
    throws(function () { jasq.resetGlobals(); }, "attempting to reset globals throws");
  });

  ////////////////////////////////////
  ////////////////////////////////////

  // How jasq and its globals should be exported when loaded after Jasmine
  QUnit.module("Environment (Jasmine loaded)");

  asyncTest("applying will expose the jasq-version of Jasmine globals (globally and on jasq)", 12, function () {
    whenJasmineLoaded(function () {
      jasq.applyGlobals();

      each(globalMethodNames, function (methodName) {
        ok(isFunction(window[methodName]), "'" + methodName + "' is globally available ..");
        strictEqual(window[methodName].isJasq, true, ".. is jasq-version ..");
        strictEqual(jasq[methodName], window[methodName], ".. and is also exposed on jasq");
      });

      start();
    });
  });

  asyncTest("globals may be reset and re-applied", 16, function () {
      whenJasmineLoaded(function () {
        jasq.applyGlobals();

        jasq.resetGlobals();

        each(globalMethodNames, function (methodName) {
          ok(isFunction(window[methodName]), "after reset, '" + methodName + "' is globally available ..");
          ok(!window[methodName].isJasq, ".. and is not jasq-version");
        });

        jasq.applyGlobals();

        each(globalMethodNames, function (methodName) {
          ok(isFunction(window[methodName]), "after patch, '" + methodName + "' is globally available ..");
          strictEqual(window[methodName].isJasq, true, ".. and is jasq-version");
        });

        start();
      });
  });

});
