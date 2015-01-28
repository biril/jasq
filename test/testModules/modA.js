/*global define:false, setTimeout:true */

// Module A
define(["modB"], function (modB) {
  "use strict";

  return {
    getValue: function () {
      return "A";
    },
    getValueAfterAWhile: function (cb) {
      setTimeout(function () {
        cb("A");
      }, 100);
    },
    getModBValue: function () {
      return modB.getValue();
    }
  };
});
