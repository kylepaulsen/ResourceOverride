import { exportData } from "./importExport.js";
import { mainSuggest } from "./suggest.js";
import { openEditor } from "./editor.js";
import {
    instanceTemplate,
    getNextRuleId,
    getNextFileId,
    makeFieldRequired,
    deleteButtonIsSure,
    deleteButtonIsSureReset,
    fadeOut
} from "./util.js";

const app = window.app;
const fileOverrideTemplate = document.getElementById("fileOverrideTemplate");

const createFileOverrideMarkup = (savedData, saveFunc) => {
    savedData = savedData || {};
    saveFunc = saveFunc || (() => {});

    const override = instanceTemplate(fileOverrideTemplate);
    const rid = savedData.id || getNextRuleId(exportData().data);
    override.id = `r${rid}`;
    const matchInput = override.querySelector(".matchInput");
    const editBtn = override.querySelector(".edit-btn");
    const ruleOnOff = override.querySelector(".onoffswitch-checkbox");
    const deleteBtn = override.querySelector(".sym-btn");

    matchInput.value = savedData.match || "";
    makeFieldRequired(matchInput);
    ruleOnOff.checked = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.classList.add("disabled");
    }

    editBtn.addEventListener("click", () => {
        openEditor(override.dataset.fileId, matchInput.value, false, saveFunc);
    });

    deleteBtn.addEventListener("click", () => {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }

        override.style.transition = "none";
        fadeOut(override);
        setTimeout(() => {
            override.remove();
            delete app.files[override.id];
            saveFunc({ removeIds: [rid] });
        }, 300);
    });

    deleteBtn.addEventListener("mouseout", () => {
        deleteButtonIsSureReset(deleteBtn);
    });

    mainSuggest.init(matchInput);

    matchInput.addEventListener("keyup", saveFunc);
    const changeOnOffSwitch = () => {
        if (ruleOnOff.checked) {
            override.classList.remove("disabled");
        } else {
            override.classList.add("disabled");
        }
        saveFunc();
    };
    ruleOnOff.addEventListener("click", changeOnOffSwitch);
    ruleOnOff.addEventListener("change", changeOnOffSwitch);

    const allRuleContainers = document.querySelectorAll(".ruleContainer");
    let id = savedData.fileId || getNextFileId(allRuleContainers);
    if (app.files[id]) {
        id = getNextFileId(allRuleContainers);
    }
    override.dataset.fileId = id;

    if (savedData.file) {
        app.files[id] = savedData.file;
    }

    return override;
};

export default createFileOverrideMarkup;
