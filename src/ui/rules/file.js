"use strict";

/* globals $ */

import {removeEl} from "../microJQuery.js";

import {app, ui} from '../init.js';
import {files, mainSuggest} from '../devtoolstab.js';
import {instanceTemplate, makeFieldRequired, deleteButtonIsSureReset, getNextId, deleteButtonIsSure} from '../util.js';

function createFileOverrideMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.fileOverrideTemplate);
    const matchInput = override.getElementsByClassName("matchInput")[0];
    const editBtn = override.getElementsByClassName("edit-btn")[0];
    const ruleOnOff = override.getElementsByClassName("onoffswitch")[0];
    const deleteBtn = override.getElementsByClassName("sym-btn")[0];

    matchInput.value = savedData.match || "";
    makeFieldRequired(matchInput);
    ruleOnOff.isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.classList.add("disabled");
    }

    editBtn.addEventListener("click", function() {
        app.editor.open(override.id, matchInput.value, false, saveFunc);
    });

    deleteBtn.addEventListener("click", function() {
        if (!util.deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.style.transition = "none"
        removeEl(override);
        delete files[override.id];
        saveFunc();
    });

    deleteBtn.addEventListener("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    mainSuggest.init([matchInput]);

    matchInput.addEventListener("keyup", saveFunc);
    ruleOnOff.addEventListener("change", function() {
        override.classList.toggle("disabled", !ruleOnOff.isOn);
        saveFunc();
    });

    let id = savedData.fileId || getNextId(document.getElementsByClassName("ruleContainer"), "f");
    if (files[id]) {
        id = getNextId(document.getElementsByClassName("ruleContainer"), "f");
    }
    override.id = id;

    if (savedData.file) {
        files[id] = savedData.file;
    }

    return override;
}

export {createFileOverrideMarkup};
