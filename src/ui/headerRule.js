import { exportData } from "./importExport.js";
import { mainSuggest } from "./suggest.js";
import { openHeaderEditor, getHeaderEditRules } from "./headerEditor.js";
import {
    instanceTemplate,
    getNextRuleId,
    makeFieldRequired,
    deleteButtonIsSure,
    deleteButtonIsSureReset,
    fadeOut
} from "./util.js";

const headerRuleTemplate = document.getElementById("headerRuleTemplate");

// This is what shows up *outside* the header editor.
const createHeaderRuleMarkup = (savedData, saveFunc) => {
    savedData = savedData || {};
    saveFunc = saveFunc || (() => {});

    const override = instanceTemplate(headerRuleTemplate);
    const id = savedData.id || getNextRuleId(exportData().data);
    override.id = `r${id}`;
    const matchInput = override.querySelector(".matchInput");
    const requestRulesInput = override.querySelector(".requestRules");
    const responseRulesInput = override.querySelector(".responseRules");
    const editBtn = override.querySelector(".edit-btn");
    const ruleOnOff = override.querySelector(".onoffswitch-checkbox");
    const deleteBtn = override.querySelector(".sym-btn");

    matchInput.value = savedData.match || "";
    makeFieldRequired(matchInput);

    const updateHeaderInput = (input, ruleStr) => {
        input.value = decodeURIComponent(ruleStr.replace(/\;/g, "; "));
        input.setAttribute("title", decodeURIComponent(ruleStr.replace(/\;/g, "\n")));
        input.dataset.rules = ruleStr;
    };

    updateHeaderInput(requestRulesInput, savedData.requestRules || "");
    updateHeaderInput(responseRulesInput, savedData.responseRules || "");

    ruleOnOff.checked = savedData.on === false ? false : true;

    if (savedData.on === false) {
        override.classList.add("disabled");
    }

    const editorSaveFunc = () => {
        const rules = getHeaderEditRules();
        updateHeaderInput(requestRulesInput, rules.requestRules.join(";"));
        updateHeaderInput(responseRulesInput, rules.responseRules.join(";"));
        saveFunc();
    };

    const editFunc = () => {
        const reqStr = requestRulesInput.dataset.rules || "";
        const resStr = responseRulesInput.dataset.rules || "";
        openHeaderEditor(reqStr, resStr, matchInput.value, editorSaveFunc);
    };

    mainSuggest.init(matchInput);

    matchInput.addEventListener("keyup", saveFunc);

    override.addEventListener("click", (e) => {
        if (e.target.classList.contains("headerRuleInput")) {
            editFunc();
        }
    });
    editBtn.addEventListener("click", editFunc);

    deleteBtn.addEventListener("click", () => {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.style.transition = "none";
        fadeOut(override);
        setTimeout(() => {
            override.remove();
            saveFunc({ removeIds: [id] });
        }, 300);
    });

    deleteBtn.addEventListener("mouseout", () => {
        deleteButtonIsSureReset(deleteBtn);
    });

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

    return override;
};

export default createHeaderRuleMarkup;
