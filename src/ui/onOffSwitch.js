(function() {
    "use strict";

    /* globals $ */

    const ui = window.app.ui;

    Object.defineProperty(HTMLElement.prototype, "isOn", {
        get: function() {
            const input = this.querySelector("input");
            if (input) {
                return input.checked;
            }
        },
        set: function(val) {
            const input = this.querySelector("input");
            if (input) {
                input.checked = !!val;
            }
        }
    });

    window.app.createOnOffSwitch = function() {
        return document.importNode(ui.onOffSwitchTemplate[0].content, true);
    };
})();
