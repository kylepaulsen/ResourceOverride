import { exportData, importData } from "./importExport.js";
import { clearAllRuleData } from "./clearAll.js";
import { countRuleErrors } from "./netRequestRules.js";
import {
    getUiElements,
    showToast,
    showLoading,
    hideLoading,
} from "./util.js";

/* global chrome */

export const updateOptions = async () => {
    const options = await chrome.storage.local.get({ optionDevTools: true });
    document.getElementById("showDevTools").checked = options.optionDevTools;
};

// onRulesChanged is called after the stored rules were replaced from the outside
// (import or clear all), so the caller can re-render and re-apply the DNR rules.
const initOptions = (onRulesChanged) => {
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

    ui.saveRulesLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const data = await exportData();
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

    // Clearing everything is destructive, so the first click only arms the link
    // (mirroring the "Sure?" behavior of the rule delete buttons).
    let clearArmed = false;
    const resetClearLink = () => {
        clearArmed = false;
        ui.clearAllLink.textContent = "Clear All Rules";
        ui.clearAllLink.style.color = "";
        ui.clearAllLink.style.fontWeight = "";
    };

    ui.clearAllLink.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!clearArmed) {
            clearArmed = true;
            ui.clearAllLink.textContent = "Sure? Click again";
            ui.clearAllLink.style.color = "#ff0000";
            ui.clearAllLink.style.fontWeight = "bold";
            return;
        }
        resetClearLink();
        await showLoading("Clearing rules...");
        try {
            const removedKeys = await clearAllRuleData();
            if (onRulesChanged) {
                await onRulesChanged();
            }
            showToast(removedKeys.length ? "All rules cleared." : "Nothing to clear.");
        } finally {
            hideLoading();
        }
    });

    ui.clearAllLink.addEventListener("mouseout", resetClearLink);

    ui.loadRulesInput.addEventListener("change", () => {
        const reader = new FileReader();
        reader.onload = async function() {
            const text = reader.result;
            let importedObj;
            try {
                importedObj = JSON.parse(text);
            } catch (e) {
                showToast("Load Failed: Invalid JSON in file.");
                return;
            }
            // "data" is the historical key; older v1 exports also used it.
            const importedData = importedObj.data !== undefined ? importedObj.data : importedObj.ruleGroups;
            // Awaiting showLoading lets the overlay paint before the heavy work below
            // starts blocking the main thread.
            await showLoading("Loading rules...");
            try {
                const imported = await importData(importedData, importedObj.v);
                if (imported && onRulesChanged) {
                    const ruleErrors = await onRulesChanged();
                    // Chrome refuses rule sets larger than its regex rule ceiling. Say
                    // so instead of leaving the user with a cheerful success message.
                    const rejected = countRuleErrors(ruleErrors);
                    if (rejected) {
                        showToast(`${rejected} rule(s) were not applied. Hover the highlighted rules for details.`);
                    }
                }
            } finally {
                hideLoading();
            }
        };
        reader.readAsText(ui.loadRulesInput.files[0]);
        ui.loadRulesInput.value = "";
    });
};

export default initOptions;
