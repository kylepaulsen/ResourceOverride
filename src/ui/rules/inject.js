"use strict";

/* globals $ */

import {app, ui} from '../init.js';
import {files} from '../devtoolstab.js';
import {getNextId, instanceTemplate, deleteButtonIsSure, deleteButtonIsSureReset} from '../util.js';

function createFileInjectMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.fileInjectTemplate);
    const fileName = override.find(".fileName");
    const injectLocation = override.find(".injectLocationSelect");
    const fileType = override.find(".fileTypeSelect");
    const editBtn = override.find(".edit-btn");
    const ruleOnOff = override.find(".onoffswitch");
    const deleteBtn = override.find(".sym-btn");

    fileName.val(savedData.fileName || "");
    injectLocation.val(savedData.injectLocation || "head");
    fileType.val(savedData.fileType || "js");
    ruleOnOff[0].isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.addClass("disabled");
    }

    editBtn.on("click", function() {
        app.editor.open(override[0].id, fileName.val(), true, saveFunc);
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

    fileName.on("keyup", saveFunc);
    ruleOnOff.on("click change", function() {
        override.toggleClass("disabled", !ruleOnOff[0].isOn);
        saveFunc();
    });
    injectLocation.on("change", saveFunc);
    fileType.on("change", saveFunc);

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

export {createFileInjectMarkup};
