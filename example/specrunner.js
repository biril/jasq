/* jshint browser:true */
/* globals require:false, jasmineRequire:false */

(function () {

  "use strict";

  //// Configure require
  require.config({
    baseUrl: "../test/testModules",
    paths: {
      jasq: "../../jasq"
    }
  });

  //// Configure Jasmine. This is based on Jasmine's boot.js -
  ////  see https://github.com/pivotal/jasmine/blob/master/lib/jasmine-core/boot.js

  // Require Jasmine's core files. Specifically, this requires and attaches all of Jasmine's code
  //  to the `jasmine` reference
  window.jasmine = jasmineRequire.core(jasmineRequire);

  // Since this is being run in a browser and the results are to be rendered on a page,
  //  require the HTML-specific Jasmine code, injecting the same reference
  jasmineRequire.html(window.jasmine);

  // Create the Jasmine environment. This is used to run all specs in the project
  var env = window.jasmine.getEnv();

  // Build up the functions to be exposed as Jasmine's public interface
  var jasmineInterface = jasmineRequire.interface(window.jasmine, env);

  // Add Jasmine's public interface to window, so that the project may use it directly - for
  //  example, calling `describe` in specs instead `jasmine.getEnv().describe`
  for (var prop in jasmineInterface) {
    if (jasmineInterface.hasOwnProperty(prop)) {
      window[prop] = jasmineInterface[prop];
    }
  }

  // More browser specific code - wrap the query string in an object and to allow for
  //  getting/setting parameters from the runner user interface
  var queryString = new window.jasmine.QueryString({
    getWindowLocation: function() { return window.location; }
  });

  var catchingExceptions = queryString.getParam("catch");
  env.catchExceptions(typeof catchingExceptions === "undefined" ? true : catchingExceptions);

  // The `HtmlReporter` builds all of the HTML UI for the runner page. This reporter paints the
  //  dots, stars, and x's for specs, as well as all spec names and all failures (if any)
  var htmlReporter = new window.jasmine.HtmlReporter({
    env: env,
    onRaiseExceptionsClick: function() { queryString.setParam("catch", !env.catchingExceptions()); },
    getContainer: function() { return document.body; },
    createElement: function() { return document.createElement.apply(document, arguments); },
    createTextNode: function() { return document.createTextNode.apply(document, arguments); },
    timer: new window.jasmine.Timer()
  });
  env.addReporter(htmlReporter);

  // Filter which specs will be run by matching the start of the full name against the `spec`
  //  query param
  var specFilter = new window.jasmine.HtmlSpecFilter({
    filterString: function() { return queryString.getParam("spec"); }
  });

  env.specFilter = function(spec) {
    return specFilter.matches(spec.getFullName());
  };

  // Hack that allows timing functions to be overridden, if necessary. Certain browsers
  //  (Safari, IE8, phantomjs) require this hack
  window.setTimeout = window.setTimeout;
  window.setInterval = window.setInterval;
  window.clearTimeout = window.clearTimeout;
  window.clearInterval = window.clearInterval;

  //// Require the spec and run suite once loaded
  require(["../../example/spec"], function () {
    htmlReporter.initialize();
    window.jasmine.getEnv().execute();
  });

}());
