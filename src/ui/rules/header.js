"use strict";

/* globals $ */

import {removeEl} from "../microJQuery.js";

import {app, ui} from '../init.js';
import {instanceTemplate, makeFieldRequired, deleteButtonIsSure, deleteButtonIsSureReset} from '../util.js';
import {mainSuggest, requestHeadersSuggest, responseHeadersSuggest} from '../devtoolstab.js';
import {headerEditor} from '../headerEditor.js';

// This is what shows up *outside* the header editor.
function createHeaderRuleMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = util.instanceTemplate(ui.headerRuleTemplate);
    const matchInput = override.getElementsByClassName("matchInput")[0];
    const requestRulesInput = override.getElementsByClassName("requestRules")[0];
    const responseRulesInput = override.getElementsByClassName("responseRules")[0];
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

    updateHeaderInput(requestRulesInput, savedData.requestRules || "");
    updateHeaderInput(responseRulesInput, savedData.responseRules || "");

    ruleOnOff.isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.classList.add("disabled");
    }

    const editorSaveFunc = function() {
        const rules = headerEditor.getRules();
        updateHeaderInput(requestRulesInput, rules.requestRules.join(";"));
        updateHeaderInput(responseRulesInput, rules.responseRules.join(";"));
        saveFunc();
    };

    const editFunc = function() {
        const reqStr = requestRulesInput.dataset.rules || "";
        const resStr = responseRulesInput.dataset.rules || "";
        headerEditor.open(reqStr, resStr, matchInput.value, editorSaveFunc);
    };

    mainSuggest.init([matchInput]);

    matchInput.addEventListener("keyup", saveFunc);

    override.addEventListener("click", function(e) {
        if (e.target.classList.contains("headerRuleInput")) {
            editFunc();
        }
    });
    editBtn.addEventListener("click", editFunc);

    deleteBtn.addEventListener("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.style.transition = "none"
        removeEl(override);
        saveFunc();
    });

    deleteBtn.addEventListener("mouseout", function() {
        util.deleteButtonIsSureReset(deleteBtn);
    });

    ruleOnOff.addEventListener("change", function() {
        override.classList.toggle("disabled", !ruleOnOff.isOn);
        saveFunc();
    });

    return override;
}

// This is a header rule that shows up *inside* the editor.
function createHeaderEditorRuleMarkup(savedData, saveFunc, type) {
    savedData = savedData || {operation: "set"};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.headerEditorRuleTemplate);
    const operation = override.getElementsByClassName("operationSelect")[0];
    const headerName = override.getElementsByClassName("headerName")[0];
    const headerValue = override.getElementsByClassName("headerValue")[0];
    const deleteBtn = override.getElementsByClassName("sym-btn")[0];

    operation.value = savedData.operation;
    headerName.value = savedData.header || "";
    headerValue.value = savedData.value || "";

    if (savedData.operation === "remove") {
        headerValue.disabled = true;
    }

    operation.addEventListener("change", function() {
        if (operation.value === "remove") {
            headerValue.value = "";
            headerValue.disabled = true;
        } else {
            headerValue.disabled = false;
        }
        saveFunc();
    });
    headerName.addEventListener("keyup", saveFunc);
    headerValue.addEventListener("keyup", saveFunc);

    deleteBtn.addEventListener("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.style.transition = "none"
        removeEl(override);
        saveFunc();
    });

    deleteBtn.addEventListener("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    if (type === "request") {
        requestHeadersSuggest.init([headerName], false, true);
    } else {
        responseHeadersSuggest.init([headerName], false, true);
    }

    return override;
}

export {createHeaderRuleMarkup, createHeaderEditorRuleMarkup};
