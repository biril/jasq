/*global define:false */

// The omelette module
define(["eggs", "bacon", "eat"], function (eggs, bacon, eat) {
    "use strict";

    return {
        isOmeletteModule: true,
        isMocked: false,

        getEggs: function () { return eggs; },
        getBacon: function () { return bacon; },
        eat: eat
    };
});