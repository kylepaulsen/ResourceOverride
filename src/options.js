import { mainSuggest } from "./suggest.js";
import { exportData, importData } from "./importExport.js";
import {
    getUiElements,
    showToast,
    isChrome,
} from "./util.js";

const initOptions = () => {
    const ui = getUiElements(document);

    window.addEventListener("click", (e) => {
        const target = e.target;
        if (target.id === "optionsBtn") {
            ui.optionsPopOver.style.display = ui.optionsPopOver.style.display === "block" ? "none" : "block";
            ui.helpOverlay.style.display = "none";
        } else {
            if (!target.closest("#optionsPopOver")) {
                ui.optionsPopOver.style.display = "none";
            }
        }
    });

    ui.showDevTools.addEventListener("click", () => {
        // chrome.runtime.sendMessage({
        //     action: "setSetting",
        //     setting: "devTools",
        //     value: ui.showDevTools.prop("checked")
        // });
    });

    ui.showSuggestions.addEventListener("click", () => {
        // chrome.runtime.sendMessage({
        //     action: "setSetting",
        //     setting: "showSuggestions",
        //     value: ui.showSuggestions.prop("checked")
        // });
        mainSuggest.setShouldSuggest(ui.showSuggestions.prop("checked"));
    });

    if (!isChrome()) {
        ui.showSuggestions.closest(".optionRow").remove();
    }

    ui.saveRulesLink.addEventListener("click", (e) => {
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


    ui.loadRulesLink.addEventListener("click", (e) => {
        e.preventDefault();
        ui.loadRulesInput.click();
        ui.optionsPopOver.style.display = "none";
    });

    ui.loadRulesInput.addEventListener("change", () => {
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
        reader.readAsText(ui.loadRulesInput.files[0]);
        ui.loadRulesInput.value = "";
    });

    // chrome.runtime.sendMessage({
    //     action: "getSetting",
    //     setting: "devTools"
    // }, function(data) {
    //     ui.showDevTools.prop("checked", data === "true");
    // });

    // chrome.runtime.sendMessage({
    //     action: "getSetting",
    //     setting: "showSuggestions"
    // }, function(data) {
    //     const shouldSuggest = isChrome() && data !== "false";
    //     ui.showSuggestions.prop("checked", shouldSuggest);
    //     app.mainSuggest.setShouldSuggest(shouldSuggest);
    // });

    // chrome.runtime.sendMessage({
    //     action: "getSetting",
    //     setting: "showLogs"
    // }, function(data) {
    //     ui.showLogs.prop("checked", data === "true");
    // });
};

export default initOptions;
