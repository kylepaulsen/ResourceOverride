"use strict";

/* globals $ */

import {app, ui} from '../init.js';
import {instanceTemplate, makeFieldRequired, deleteButtonIsSure, deleteButtonIsSureReset} from '../util.js';
import {mainSuggest, requestHeadersSuggest, responseHeadersSuggest} from '../devtoolstab.js';
import {headerEditor} from '../headerEditor.js';

// This is what shows up *outside* the header editor.
function createHeaderRuleMarkup(savedData, saveFunc) {
    savedData = savedData || {};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.headerRuleTemplate);
    const matchInput = override.find(".matchInput");
    const requestRulesInput = override.find(".requestRules");
    const responseRulesInput = override.find(".responseRules");
    const editBtn = override.find(".edit-btn");
    const ruleOnOff = override.find(".onoffswitch");
    const deleteBtn = override.find(".sym-btn");

    matchInput.val(savedData.match || "");
    makeFieldRequired(matchInput);

    const updateHeaderInput = function(input, ruleStr) {
        input.val(decodeURIComponent(ruleStr.replace(/\;/g, "; ")));
        input.attr("title", decodeURIComponent(ruleStr.replace(/\;/g, "\n")));
        input.data("rules", ruleStr);
    };

    updateHeaderInput(requestRulesInput, savedData.requestRules || "");
    updateHeaderInput(responseRulesInput, savedData.responseRules || "");

    ruleOnOff[0].isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.addClass("disabled");
    }

    const editorSaveFunc = function() {
        const rules = headerEditor.getRules();
        updateHeaderInput(requestRulesInput, rules.requestRules.join(";"));
        updateHeaderInput(responseRulesInput, rules.responseRules.join(";"));
        saveFunc();
    };

    const editFunc = function() {
        const reqStr = requestRulesInput.data("rules") || "";
        const resStr = responseRulesInput.data("rules") || "";
        headerEditor.open(reqStr, resStr, matchInput.val(), editorSaveFunc);
    };

    mainSuggest.init(matchInput);

    matchInput.on("keyup", saveFunc);

    override.on("click", function(e) {
        if ($(e.target).hasClass("headerRuleInput")) {
            editFunc();
        }
    });
    editBtn.on("click", editFunc);

    deleteBtn.on("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.css("transition", "none");
        override.fadeOut(function() {
            override.remove();
            saveFunc();
        });
    });

    deleteBtn.on("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    ruleOnOff.on("click change", function() {
        override.toggleClass("disabled", !ruleOnOff[0].isOn);
        saveFunc();
    });

    return override;
}

// This is a header rule that shows up *inside* the editor.
function createHeaderEditorRuleMarkup(savedData, saveFunc, type) {
    savedData = savedData || {operation: "set"};
    saveFunc = saveFunc || function() {};

    const override = instanceTemplate(ui.headerEditorRuleTemplate);
    const operation = override.find(".operationSelect");
    const headerName = override.find(".headerName");
    const headerValue = override.find(".headerValue");
    const deleteBtn = override.find(".sym-btn");

    operation.val(savedData.operation);
    headerName.val(savedData.header);
    headerValue.val(savedData.value || "");

    if (savedData.operation === "remove") {
        headerValue[0].disabled = true;
    }

    operation.on("change", function() {
        if (operation.val() === "remove") {
            headerValue.val("");
            headerValue[0].disabled = true;
        } else {
            headerValue[0].disabled = false;
        }
        saveFunc();
    });
    headerName.on("keyup", saveFunc);
    headerValue.on("keyup", saveFunc);

    deleteBtn.on("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.css("transition", "none");
        override.fadeOut(function() {
            override.remove();
            saveFunc();
        });
    });

    deleteBtn.on("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    if (type === "request") {
        requestHeadersSuggest.init(headerName, false, true);
    } else {
        responseHeadersSuggest.init(headerName, false, true);
    }

    return override;
}

export {createHeaderRuleMarkup, createHeaderEditorRuleMarkup};
