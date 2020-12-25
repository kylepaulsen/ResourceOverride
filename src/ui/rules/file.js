"use strict";

/* globals $ */

import {app, ui} from '../init.js';
import {files, mainSuggest} from '../devtoolstab.js';
import {instanceTemplate, makeFieldRequired, deleteButtonIsSureReset, getNextId, deleteButtonIsSure} from '../util.js';

function createFileOverrideMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.fileOverrideTemplate);
    const matchInput = override.find(".matchInput");
    const editBtn = override.find(".edit-btn");
    const ruleOnOff = override.find(".onoffswitch");
    const deleteBtn = override.find(".sym-btn");

    matchInput.val(savedData.match || "");
    makeFieldRequired(matchInput);
    ruleOnOff[0].isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.addClass("disabled");
    }

    editBtn.on("click", function() {
        app.editor.open(override[0].id, matchInput.val(), false, saveFunc);
    });

    deleteBtn.on("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.css("transition", "none");
        override.fadeOut(function() {
            override.remove();
            delete files[override[0].id];
            saveFunc();
        });
    });

    deleteBtn.on("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    mainSuggest.init(matchInput);

    matchInput.on("keyup", saveFunc);
    ruleOnOff.on("click change", function() {
        override.toggleClass("disabled", !ruleOnOff[0].isOn);
        saveFunc();
    });

    let id = savedData.fileId || getNextId($(".ruleContainer"), "f");
    if (files[id]) {
        id = getNextId($(".ruleContainer"), "f");
    }
    override[0].id = id;

    if (savedData.file) {
        files[id] = savedData.file;
    }

    return override;
}

export {createFileOverrideMarkup};
