/*jshint browser:true */
/*global QUnit:false, jasmineRequire:false, require:false */

(function () {

  "use strict";

  ////// {{ Jasmine v >= 2.0.0 requires a bit of initialization -
  //////  based on Jasmine's boot.js - see
  //////   https://github.com/pivotal/jasmine/blob/master/lib/jasmine-core/boot.js

  // Require Jasmine's core files. Specifically, this requires and attaches all of Jasmine's code
  //  to the `jasmine` reference
  window.jasmine = jasmineRequire.core(jasmineRequire);

  // Create the Jasmine environment. This is used to run all specs in a project
  var env = window.jasmine.getEnv();

  // Build up the functions that will be exposed as the Jasmine public interface
  var jasmineInterface = jasmineRequire.interface(window.jasmine, env);

  // Expose jasmineInterface on global object
  for (var prop in jasmineInterface) {
    if (jasmineInterface.hasOwnProperty(prop)) {
      window[prop] = jasmineInterface[prop];
    }
  }

  ////// }}

  // Configure require and kick off tests
  require.config({
    baseUrl: "./testModules",
    paths: {
      jasq: "../../jasq",
      helpers: "../helpers"
    }
  })(["../test", "../test-example"], function () {

    // `QUnit.start` _after_ loading the test suite(s). `QUnit.load` is also necessary as some
    //  page elements (e.g. the modules-dropdown) will not render correctly unless the test
    //  suites (that actually define the modules) load first. Note that all this assumes a
    //  preceding `QUnit.config.autostart = false` - which needs to be set _after_ the qunit
    //  script tag and _before_ the requirejs script tag. QUnit's non-integration with
    //  requirejs is depressing to say the least
    QUnit.load();
    QUnit.start();
  });

}());
