import { exportData, importData } from "./importExport.js";
import {
    getUiElements,
    showToast,
} from "./util.js";

/* global chrome */

const app = window.app;

export const updateOptions = async () => {
    document.getElementById("showDevTools").checked = app.settings.optionDevTools;
};

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

    ui.showDevTools.addEventListener("click", async () => {
        chrome.storage.local.set({
            optionDevTools: ui.showDevTools.checked,
        });
    });

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
};

export default initOptions;
