/*jshint browser:true */
/*global jasmineRequire:false, require:false */

(function () {

    "use strict";

    ////// Jasmine v >= 2.0.0 requires a bit of initialization:

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

    ////// Configure require and kick off test (for the latter, `require`-ing `test` is enough):

    require.config({
        baseUrl: "./testModules",
        paths: {
            jasq: "../../jasq",
            helpers: "../helpers"
        }
    })(["../test", "../test-example"]);

}());
