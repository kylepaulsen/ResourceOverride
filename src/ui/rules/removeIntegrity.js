
"use strict";

/* globals $ */

import {app, ui, capabilities} from '../init.js';
import {instanceTemplate, makeFieldRequired, deleteButtonIsSure, deleteButtonIsSureReset} from '../util.js';
import {mainSuggest} from '../devtoolstab.js';


// This is what shows up *outside* the header editor.
function createRemoveIntegrityMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.removeIntegrityTemplate);
    const matchInput = override.getElementsByClassName("matchInput")[0];
    const editBtn = override.getElementsByClassName("edit-btn")[0];
    const ruleOnOff = override.getElementsByClassName("onoffswitch")[0];
    const deleteBtn = override.getElementsByClassName("sym-btn")[0];

    matchInput.value = savedData.match || "";
    makeFieldRequired(matchInput);

    const updateHeaderInput = function(input, ruleStr) {
        input.value = decodeURIComponent(ruleStr.replace(/\;/g, "; "));
        input.title = decodeURIComponent(ruleStr.replace(/\;/g, "\n"));
        input.dataset.rules = ruleStr;
    };

    ruleOnOff.isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.classList.add("disabled");
    }

    mainSuggest.init([matchInput]);

    matchInput.addEventListener("keyup", saveFunc);

    deleteBtn.addEventListener("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.style.transition = "none";
        override.remove();
        saveFunc();
    });

    deleteBtn.addEventListener("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    ruleOnOff.addEventListener("change", function() {
        override.classList.toggle("disabled", !ruleOnOff.isOn);
        saveFunc();
    });

    return override;
}

function setRemoveIntegrityButtonCorrectState(){
    if(capabilities){
        if(!capabilities.realtimeRewriteSupported){
            ui.addRemoveIntegrityRuleBtn.className += "disabled " + ui.addRemoveIntegrityRuleBtn.className; // toDo: this addon needs serious redesign. Using CSS classes to store semantic info is inacceptable. We should use `dataset` property.
        }
    }
}

export {createRemoveIntegrityMarkup, setRemoveIntegrityButtonCorrectState};