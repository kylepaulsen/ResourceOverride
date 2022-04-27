import { exportData } from "./importExport.js";
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
const fileInjectTemplate = document.getElementById("fileInjectTemplate");

const createFileInjectMarkup = (savedData, saveFunc) => {
    savedData = savedData || {};
    saveFunc = saveFunc || (() => {});

    const override = instanceTemplate(fileInjectTemplate);
    const rid = savedData.id || getNextRuleId(exportData().data);
    override.id = `r${rid}`;
    const matchInput = override.querySelector(".matchInput");
    const fileName = override.querySelector(".fileName");
    const fileType = override.querySelector(".fileTypeSelect");
    const editBtn = override.querySelector(".edit-btn");
    const ruleOnOff = override.querySelector(".onoffswitch-checkbox");
    const deleteBtn = override.querySelector(".sym-btn");

    matchInput.value = savedData.match || "";
    makeFieldRequired(matchInput);
    fileName.value = savedData.fileName || "";
    fileType.value = savedData.fileType || "js";
    ruleOnOff.checked = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.classList.add("disabled");
    }

    editBtn.addEventListener("click", () => {
        openEditor(override.dataset.fileId, fileName.value, true, saveFunc);
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
            saveFunc();
        }, 300);
    });

    deleteBtn.addEventListener("mouseout", () => {
        deleteButtonIsSureReset(deleteBtn);
    });

    fileName.addEventListener("keyup", saveFunc);
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
    fileType.addEventListener("change", saveFunc);

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

export default createFileInjectMarkup;
