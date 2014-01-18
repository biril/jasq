/*global define:false */

// The omelette module
define(["eggs", "bacon", "eat"], function (eggs, bacon, eat) {
    "use strict";

    return {
        isOmelette: true,
        isMocked: false,

        getEggs: function () { return eggs; },
        getBacon: function () { return bacon; },
        eat: eat
    };
});