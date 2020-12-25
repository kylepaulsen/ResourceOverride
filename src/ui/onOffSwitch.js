
"use strict";

/* globals $ */

import {app, ui} from './init.js';

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

export function createOnOffSwitch() {
    return document.importNode(ui.onOffSwitchTemplate[0].content, true);
};
