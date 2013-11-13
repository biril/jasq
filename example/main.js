// Configure require
require.config({
    baseUrl: "../test/testModules",
    paths: {
        squire: "../vendor/squire",
        jasq: "../../jasq"
    }
});

// Configure Jasmine
var jasmineEnv = jasmine.getEnv(),
    htmlReporter = new jasmine.HtmlReporter();
jasmineEnv.addReporter(htmlReporter);
jasmineEnv.specFilter = function (spec) {
    return htmlReporter.specFilter(spec);
};

// Require the spec and run suite once loaded
require(["../../example/spec"], function () {
    jasmineEnv.execute();
});