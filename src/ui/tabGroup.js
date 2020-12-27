"use strict";

/* globals $, chrome */

import {removeEl} from "./microJQuery.js";

import {app, ui} from './init.js';
import {files} from './devtoolstab.js';
import {instanceTemplate, debounce, deleteButtonIsSure, deleteButtonIsSureReset, getNextId} from './util.js';
import {moveableRules} from './moveableRules.js';

import {createWebOverrideMarkup} from './rules/web.js';
import {createFileOverrideMarkup} from './rules/file.js';
import {createFileInjectMarkup} from './rules/inject.js';
import {createHeaderRuleMarkup} from './rules/header.js';

let currentAddRuleBtn;
let currentAddRuleFunc;
let currentSaveFunc;

function positionRuleDropdown(addBtn) {
    const offset = addBtn.getBoundingClientRect();
    ui.addRuleDropdown.style.top = offset.top + 40 + "px";
    ui.addRuleDropdown.style.left = offset.left - 40 + "px";

    const rect = ui.addRuleDropdown.getBoundingClientRect();
    if (rect.top + rect.height > window.innerHeight && offset.top - rect.height > 0) {
        ui.addRuleDropdown.style.top = offset.top - rect.height + "px";
        ui.addRuleDropdown.style.left = offset.left - 40 + "px";
        ui.addRuleDropdown.classList.add("reverse");
    } else {
        ui.addRuleDropdown.classList.remove("reverse");
    }
}

function showRuleDropdown(addBtn, addRuleFunc, saveFunc) {
    if (ui.addRuleDropdown.style.display != "none" && currentAddRuleFunc === addRuleFunc) {
        ui.addRuleDropdown.style.display = "none";
    } else {
        ui.addRuleDropdown.style.display = "block";
        currentAddRuleBtn = addBtn;
        currentAddRuleFunc = addRuleFunc;
        currentSaveFunc = saveFunc;
        positionRuleDropdown(addBtn);
    }
}

function createSaveFunction(id) {
    return function() {
        const domain = document.getElementById(id);
        const data = getDomainData(domain);
        chrome.runtime.sendMessage({action: "saveDomain", data: data});
        app.skipNextSync = true;
    };
}


const domainDataGetterMap = new Map([
    ["normalOverride", (el) => {
        return {
            type: "normalOverride",
            match: el.getElementsByClassName("matchInput")[0].value,
            replace: el.getElementsByClassName("replaceInput")[0].value,
            on: el.getElementsByClassName("onoffswitch")[0].isOn
        }
    }],
    ["fileOverride", (el) => {
        return {
            type: "fileOverride",
            match: el.getElementsByClassName("matchInput")[0].value,
            file: files[el.id] || "",
            fileId: el.id,
            on: el.getElementsByClassName("onoffswitch")[0].isOn
        }
    }],
    ["fileInject", (el) => {
        return {
            type: "fileInject",
            fileName: el.getElementsByClassName("fileName")[0].value,
            file: files[el.id] || "",
            fileId: el.id,
            fileType: el.getElementsByClassName("fileTypeSelect")[0].value,
            injectLocation: el.getElementsByClassName("injectLocationSelect")[0].value,
            on: el.getElementsByClassName("onoffswitch")[0].isOn
        }
    }],
    ["headerRule", (el) => {
        return {
            type: "headerRule",
            match: el.getElementsByClassName("matchInput")[0].value,
            requestRules: el.getElementsByClassName("requestRules")[0].dataset.rules || "",
            responseRules: el.getElementsByClassName("responseRules")[0].dataset.rules || "",
            on: el.getElementsByClassName("onoffswitch")[0].isOn
        }
    }],
]);
function getDomainData(domain) {
    const rules = [];
    [...domain.getElementsByClassName("ruleContainer")].forEach(function(el) {
        for(let [cand, domainDataGetter] of domainDataGetterMap){
            if (el.classList.contains(cand)) {
                rules.push(domainDataGetter(el));
                break;
            }
        }
    });

    return {
        id: domain.id,
        matchUrl: domain.getElementsByClassName("domainMatchInput")[0].value,
        rules: rules,
        on: domain.getElementsByClassName("onoffswitch")[0].isOn
    };
}

let domainMarkupCreatorMap = new Map([
    ["normalOverride", createWebOverrideMarkup],
    ["fileOverride", createFileOverrideMarkup],
    ["fileInject", createFileInjectMarkup],
    ["headerRule", createHeaderRuleMarkup],
]);

function createDomainMarkup(savedData) {
    savedData = savedData || {};
    const domain = instanceTemplate(ui.domainTemplate);
    const overrideRulesContainer = domain.getElementsByClassName("overrideRules")[0];
    const addRuleBtn = domain.getElementsByClassName("addRuleBtn")[0];
    const domainMatchInput = domain.getElementsByClassName("domainMatchInput")[0];
    const onOffBtn = domain.getElementsByClassName("onoffswitch")[0];
    const deleteBtn = domain.getElementsByClassName("deleteBtn")[0];
    const rules = savedData.rules || [];

    const id = savedData.id || util.getNextId(document.getElementsByClassName("domainContainer"), "d");
    domain.id = id;
    const saveFunc = debounce(createSaveFunction(id), 700);

    if (rules.length) {
        rules.forEach(function(rule) {
            overrideRulesContainer.appendChild(domainMarkupCreatorMap.get(rule.type)(rule, saveFunc));
        });
    }

    const mvRules = moveableRules(overrideRulesContainer, ".handle");
    mvRules.onMove(saveFunc);

    domainMatchInput.value = savedData.matchUrl || "";
    onOffBtn.isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        domain.classList.add("disabled");
    }

    const addRuleCallback = function(markup) {
        mvRules.assignHandleListener(markup.getElementsByClassName("handle")[0]);
        overrideRulesContainer.appendChild(markup);
    };

    addRuleBtn.addEventListener("click", function() {
        showRuleDropdown(addRuleBtn, addRuleCallback, saveFunc);
    });

    domainMatchInput.addEventListener("keyup", saveFunc);
    onOffBtn.addEventListener("change", function() {
        domain.classList.toggle("disabled", !onOffBtn.isOn);
        saveFunc();
    });

    deleteBtn.addEventListener("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        chrome.runtime.sendMessage({action: "deleteDomain", id: id});
        domain.style.transition = "none";
        removeEl(domain);
        app.skipNextSync = true;
    });

    deleteBtn.addEventListener("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    return domain;
}

ui.addWebRuleBtn.addEventListener("click", function() {
    currentAddRuleFunc(createWebOverrideMarkup({}, currentSaveFunc));
});

ui.addFileRuleBtn.addEventListener("click", function() {
    currentAddRuleFunc(createFileOverrideMarkup({}, currentSaveFunc));
});

ui.addInjectRuleBtn.addEventListener("click", function() {
    currentAddRuleFunc(createFileInjectMarkup({}, currentSaveFunc));
});

ui.addHeaderRuleBtn.addEventListener("click", function() {
    currentAddRuleFunc(createHeaderRuleMarkup({}, currentSaveFunc));
});

window.addEventListener("resize", function() {
    if (currentAddRuleBtn) {
        positionRuleDropdown(currentAddRuleBtn);
    }
}, false);

window.addEventListener("click", function(e) {
    if (!e.target.classList.contains("addRuleBtn") && e.target.id !== "addRuleDropdown") {
        ui.addRuleDropdown.style.display = "none";
    }
}, false);

export {createDomainMarkup, getDomainData, currentAddRuleFunc};
