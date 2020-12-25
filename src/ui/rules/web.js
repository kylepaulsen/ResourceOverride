"use strict";

import {app, ui} from '../init.js';
import {instanceTemplate, makeFieldRequired, deleteButtonIsSure, deleteButtonIsSureReset} from '../util.js';
import {mainSuggest} from '../devtoolstab.js';

function createWebOverrideMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.overrideTemplate);
    const matchInput = override.find(".matchInput");
    const replaceInput = override.find(".replaceInput");
    const ruleOnOff = override.find(".onoffswitch");
    const deleteBtn = override.find(".sym-btn");

    matchInput.val(savedData.match || "");
    replaceInput.val(savedData.replace || "");
    makeFieldRequired(matchInput);
    makeFieldRequired(replaceInput);
    ruleOnOff[0].isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.addClass("disabled");
    }

    deleteBtn.on("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.css("transition", "none");
        override.fadeOut(function() {
            override.remove();
            saveFunc();
            app.skipNextSync = true;
        });
    });

    deleteBtn.on("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    mainSuggest.init(matchInput);

    matchInput.on("keyup", saveFunc);
    replaceInput.on("keyup", saveFunc);
    ruleOnOff.on("click change", function() {
        override.toggleClass("disabled", !ruleOnOff[0].isOn);
        saveFunc();
    });

    return override;
}

export {createWebOverrideMarkup};
