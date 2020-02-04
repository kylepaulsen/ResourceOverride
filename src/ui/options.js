(function() {
    "use strict";

    /* globals $, chrome */

    const app = window.app;
    const ui = app.ui;
    const util = app.util;

    $(window).on("click", function(e) {
        const $target = $(e.target);
        if (e.target.id === "optionsBtn") {
            ui.optionsPopOver.toggle();
            ui.helpOverlay.hide();
        } else {
            if ($target.closest("#optionsPopOver").length === 0) {
                ui.optionsPopOver.hide();
            }
        }
    });

    ui.showDevTools.on("click", function() {
        chrome.runtime.sendMessage({
            action: "setSetting",
            setting: "devTools",
            value: ui.showDevTools.prop("checked")
        });
    });

    ui.showSuggestions.on("click", function() {
        chrome.runtime.sendMessage({
            action: "setSetting",
            setting: "showSuggestions",
            value: ui.showSuggestions.prop("checked")
        });
        app.mainSuggest.setShouldSuggest(ui.showSuggestions.prop("checked"));
    });

    if (!util.isChrome()) {
        ui.showSuggestions.closest(".optionRow").remove();
    }

    ui.showLogs.on("click", function() {
        chrome.runtime.sendMessage({
            action: "setSetting",
            setting: "showLogs",
            value: ui.showLogs.prop("checked")
        });
    });

    ui.saveRulesLink.on("click", function(e) {
        e.preventDefault();
        const data = app.export();
        const json = JSON.stringify(data);
        const blob = new Blob([json], {type: "text/plain"});
        const downloadLink = document.createElement("a");
        downloadLink.download = "resource_override_rules.json";
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.click();
        ui.optionsPopOver.hide();
    });


    ui.loadRulesLink.on("click", function(e) {
        e.preventDefault();
        ui.loadRulesInput.click();
        ui.optionsPopOver.hide();
    });

    ui.loadRulesInput.on("change", function(e) {
        const reader = new FileReader();
        reader.onload = function() {
            const text = reader.result;
            try {
                const importedObj = JSON.parse(text);
                app.import(importedObj.data, importedObj.v);
            } catch (e) {
                util.showToast("Load Failed: Invalid JSON in file.");
            }
        };
        reader.readAsText(ui.loadRulesInput[0].files[0]);
        ui.loadRulesInput.val("");
    });

    chrome.runtime.sendMessage({
        action: "getSetting",
        setting: "devTools"
    }, function(data) {
        ui.showDevTools.prop("checked", data === "true");
    });

    chrome.runtime.sendMessage({
        action: "getSetting",
        setting: "showSuggestions"
    }, function(data) {
        const shouldSuggest = util.isChrome() && data !== "false";
        ui.showSuggestions.prop("checked", shouldSuggest);
        app.mainSuggest.setShouldSuggest(shouldSuggest);
    });

    chrome.runtime.sendMessage({
        action: "getSetting",
        setting: "showLogs"
    }, function(data) {
        ui.showLogs.prop("checked", data === "true");
    });

})();
