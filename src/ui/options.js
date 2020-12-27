"use strict";

/* globals $, chrome */

import {removeEl} from "./microJQuery.js";

import {app, ui} from './init.js';
import {isChrome, showToast} from './util.js';
import {mainSuggest} from './devtoolstab.js';
import {importData, exportData} from './importExport.js';

window.addEventListener("click", function(e) {
    const target = e.target;
    if (e.target.id === "optionsBtn") {
        ui.optionsPopOver.style.display = (ui.optionsPopOver.style.display ? "block" : "none");
        ui.helpOverlay.style.display = "none";
    } else {
        if (!target.closest("#optionsPopOver")) {
            ui.optionsPopOver.style.display = "none";
        }
    }
});

ui.showDevTools.addEventListener("click", function() {
    chrome.runtime.sendMessage({
        action: "setSetting",
        setting: "devTools",
        value: ui.showDevTools.checked
    });
});

ui.showSuggestions.addEventListener("click", function() {
    chrome.runtime.sendMessage({
        action: "setSetting",
        setting: "showSuggestions",
        value: ui.showSuggestions.checked
    });
    mainSuggest.setShouldSuggest(ui.showSuggestions.checked);
});

if (!isChrome()) {
    removeEl(ui.showSuggestions.closest(".optionRow"));
}

ui.showLogs.addEventListener("click", function() {
    chrome.runtime.sendMessage({
        action: "setSetting",
        setting: "showLogs",
        value: ui.showLogs.checked
    });
});

ui.saveRulesLink.addEventListener("click", function(e) {
    e.preventDefault();
    const data = exportData();
    const json = JSON.stringify(data);
    const blob = new Blob([json], {type: "text/plain"});
    const downloadLink = document.createElement("a");
    downloadLink.download = "resource_override_rules.json";
    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.click();
    ui.optionsPopOver.style.display = "none";
});


ui.loadRulesLink.addEventListener("click", function(e) {
    e.preventDefault();
    ui.loadRulesInput.click();
    ui.optionsPopOver.style.display = "none";
});

ui.loadRulesInput.addEventListener("change", function(e) {
    const reader = new FileReader();
    reader.onload = function() {
        const text = reader.result;
        try {
            const importedObj = JSON.parse(text);
            importData(importedObj.data, importedObj.v);
        } catch (e) {
            showToast("Load Failed: Invalid JSON in file.");
        }
    };
    reader.readAsText(ui.loadRulesInput[0].files[0]);
    ui.loadRulesInput.value = "";
});

chrome.runtime.sendMessage({
    action: "getSetting",
    setting: "devTools"
}, function(data) {
    ui.showDevTools.checked = data === "true";
});

chrome.runtime.sendMessage({
    action: "getSetting",
    setting: "showSuggestions"
}, function(data) {
    const shouldSuggest = isChrome() && data !== "false";
    ui.showSuggestions.checked = shouldSuggest;
    mainSuggest.setShouldSuggest(shouldSuggest);
});

chrome.runtime.sendMessage({
    action: "getSetting",
    setting: "showLogs"
}, function(data) {
    ui.showLogs.checked = data === "true";
});
