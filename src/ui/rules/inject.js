"use strict";

/* globals $ */

import {removeEl} from "../microJQuery.js";

import {app, ui} from '../init.js';
import {files} from '../devtoolstab.js';
import {getNextId, instanceTemplate, deleteButtonIsSure, deleteButtonIsSureReset} from '../util.js';

function createFileInjectMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.fileInjectTemplate);
    const fileName = override.getElementsByClassName("fileName")[0];
    const injectLocation = override.getElementsByClassName("injectLocationSelect")[0];
    const fileType = override.getElementsByClassName("fileTypeSelect")[0];
    const editBtn = override.getElementsByClassName("edit-btn")[0];
    const ruleOnOff = override.getElementsByClassName("onoffswitch")[0];
    const deleteBtn = override.getElementsByClassName("sym-btn")[0];

    fileName.value = savedData.fileName || "";
    injectLocation.value = savedData.injectLocation || "head";
    fileType.value = savedData.fileType || "js";
    ruleOnOff.isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.classList.add("disabled");
    }

    editBtn.addEventListener("click", function() {
        app.editor.open(override.id, fileName.value, true, saveFunc);
    });

    deleteBtn.addEventListener("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
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

    fileName.addEventListener("keyup", saveFunc);
    ruleOnOff.addEventListener("change", function() {
        override.classList.toggle("disabled", !ruleOnOff.isOn);
        saveFunc();
    });
    injectLocation.addEventListener("change", saveFunc);
    fileType.addEventListener("change", saveFunc);

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

export {createFileInjectMarkup};
