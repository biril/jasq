/*global define:false */

// The omelette module
define(["eggs", "bacon"], function (eggs, bacon) {
    "use strict";
    return {
        isOmeletteModule: true,
        isMocked: false,

        getEggs: function () { return eggs; },
        getBacon: function () { return bacon; }
    };
});