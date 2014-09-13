/*global define:false */

// Module A
define(["modB"], function (modB) {
  "use strict";

  return {
    getValue: function () {
      return "A";
    },
    getModBValue: function () {
      return modB.getValue();
    }
  };
});