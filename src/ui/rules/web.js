"use strict";

import {removeEl} from "../microJQuery.js";

import {app, ui} from '../init.js';
import {instanceTemplate, makeFieldRequired, deleteButtonIsSure, deleteButtonIsSureReset} from '../util.js';
import {mainSuggest} from '../devtoolstab.js';

function createWebOverrideMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.overrideTemplate);
    const matchInput = override.getElementsByClassName("matchInput")[0];
    const replaceInput = override.getElementsByClassName("replaceInput")[0];
    const ruleOnOff = override.getElementsByClassName("onoffswitch")[0];
    const deleteBtn = override.getElementsByClassName("sym-btn")[0];

    matchInput.value = savedData.match || "";
    replaceInput.value = savedData.replace || "";
    makeFieldRequired(matchInput);
    makeFieldRequired(replaceInput);
    ruleOnOff.isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.classList.add("disabled");
    }

    deleteBtn.addEventListener("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.style.transition = "none"
        removeEl(override);
        saveFunc();
        app.skipNextSync = true;
    });

    deleteBtn.addEventListener("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    mainSuggest.init([matchInput]);

    matchInput.addEventListener("keyup", saveFunc);
    replaceInput.addEventListener("keyup", saveFunc);
    ruleOnOff.addEventListener("change", function() {
        override.classList.toggle("disabled", !ruleOnOff.isOn);
        saveFunc();
    });

    return override;
}

export {createWebOverrideMarkup};
