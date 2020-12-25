"use strict";

/* globals $, chrome */

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
    const offset = addBtn.offset();
    ui.addRuleDropdown.css({
        top: offset.top + 40 + "px",
        left: offset.left - 40 + "px"
    });

    const rect = ui.addRuleDropdown[0].getBoundingClientRect();
    if (rect.top + rect.height > window.innerHeight && offset.top - rect.height > 0) {
        ui.addRuleDropdown.css({
            top: offset.top - rect.height + "px",
            left: offset.left - 40 + "px"
        });
        ui.addRuleDropdown.addClass("reverse");
    } else {
        ui.addRuleDropdown.removeClass("reverse");
    }
}

function showRuleDropdown(addBtn, addRuleFunc, saveFunc) {
    if (ui.addRuleDropdown.is(":visible") && currentAddRuleFunc === addRuleFunc) {
        ui.addRuleDropdown.hide();
    } else {
        currentAddRuleBtn = addBtn;
        currentAddRuleFunc = addRuleFunc;
        currentSaveFunc = saveFunc;
        ui.addRuleDropdown.show();
        positionRuleDropdown(addBtn);
    }
}

function createSaveFunction(id) {
    return function() {
        const $domain = $("#" + id);
        const data = getDomainData($domain);
        chrome.runtime.sendMessage({action: "saveDomain", data: data});
        app.skipNextSync = true;
    };
}


const domainDataGetterMap = new Map([
    ["normalOverride", ($el) => {
        return {
            type: "normalOverride",
            match: $el.find(".matchInput").val(),
            replace: $el.find(".replaceInput").val(),
            on: $el.find(".onoffswitch")[0].isOn
        }
    }],
    ["fileOverride", ($el) => {
        return {
            type: "fileOverride",
            match: $el.find(".matchInput").val(),
            file: files[el.id] || "",
            fileId: el.id,
            on: $el.find(".onoffswitch")[0].isOn
        }
    }],
    ["fileInject", ($el) => {
        return {
            type: "fileInject",
            fileName: $el.find(".fileName").val(),
            file: files[el.id] || "",
            fileId: el.id,
            fileType: $el.find(".fileTypeSelect").val(),
            injectLocation: $el.find(".injectLocationSelect").val(),
            on: $el.find(".onoffswitch")[0].isOn
        }
    }],
    ["headerRule", ($el) => {
        return {
            type: "headerRule",
            match: $el.find(".matchInput").val(),
            requestRules: $el.find(".requestRules").data("rules") || "",
            responseRules: $el.find(".responseRules").data("rules") || "",
            on: $el.find(".onoffswitch")[0].isOn
        }
    }],
]);
function getDomainData(domain) {
    const rules = [];
    domain.find(".ruleContainer").each(function(idx, el) {
        const $el = $(el);
        for(let [cand, domainDataGetter] of domainDataGetterMap){
            if ($el.hasClass()) {
                rules.push(domainDataGetter($el));
                break;
            }
        }
    });

    return {
        id: domain[0].id,
        matchUrl: domain.find(".domainMatchInput").val(),
        rules: rules,
        on: domain.find(".onoffswitch")[0].isOn
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
    const overrideRulesContainer = domain.find(".overrideRules");
    const addRuleBtn = domain.find(".addRuleBtn");
    const domainMatchInput = domain.find(".domainMatchInput");
    const onOffBtn = domain.find(".onoffswitch");
    const deleteBtn = domain.find(".deleteBtn");
    const rules = savedData.rules || [];

    const id = savedData.id || getNextId($(".domainContainer"), "d");
    domain[0].id = id;
    const saveFunc = debounce(createSaveFunction(id), 700);

    if (rules.length) {
        rules.forEach(function(rule) {
            overrideRulesContainer.append(domainMarkupCreatorMap.get(rule.type)(rule, saveFunc));
        });
    }

    const mvRules = moveableRules(overrideRulesContainer[0], ".handle");
    mvRules.onMove(saveFunc);

    domainMatchInput.val(savedData.matchUrl || "");
    onOffBtn[0].isOn = savedData.on === false ? false : true;

    if (savedData.on === false) {
        domain.addClass("disabled");
    }

    const addRuleCallback = function(markup) {
        mvRules.assignHandleListener(markup.find(".handle")[0]);
        overrideRulesContainer.append(markup);
    };

    addRuleBtn.on("click", function() {
        showRuleDropdown(addRuleBtn, addRuleCallback, saveFunc);
    });

    domainMatchInput.on("keyup", saveFunc);
    onOffBtn.on("click change", function() {
        domain.toggleClass("disabled", !onOffBtn[0].isOn);
        saveFunc();
    });

    deleteBtn.on("click", function() {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        chrome.runtime.sendMessage({action: "deleteDomain", id: id});
        domain.css("transition", "none");
        domain.fadeOut(function() {
            domain.remove();
        });
        app.skipNextSync = true;
    });

    deleteBtn.on("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    return domain;
}

ui.addWebRuleBtn.on("click", function() {
    currentAddRuleFunc(createWebOverrideMarkup({}, currentSaveFunc));
});

ui.addFileRuleBtn.on("click", function() {
    currentAddRuleFunc(createFileOverrideMarkup({}, currentSaveFunc));
});

ui.addInjectRuleBtn.on("click", function() {
    currentAddRuleFunc(createFileInjectMarkup({}, currentSaveFunc));
});

ui.addHeaderRuleBtn.on("click", function() {
    currentAddRuleFunc(createHeaderRuleMarkup({}, currentSaveFunc));
});

$(window).on("resize", function() {
    if (currentAddRuleBtn) {
        positionRuleDropdown(currentAddRuleBtn);
    }
});

$(window).on("click", function(e) {
    const $target = $(e.target);
    if (!$target.hasClass("addRuleBtn") && e.target.id !== "addRuleDropdown") {
        ui.addRuleDropdown.hide();
    }
});

export {createDomainMarkup, getDomainData};
