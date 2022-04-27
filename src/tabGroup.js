import setupNetRequestRules from "./netRequestRules.js";
import { mainStorage } from "./mainStorage.js";
import { getDomainData } from "./importExport.js";
import createWebOverrideMarkup from "./webRule.js";
import createFileOverrideMarkup from "./fileRule.js";
import createFileInjectMarkup from "./injectRule.js";
import createHeaderRuleMarkup from "./headerRule.js";
import moveableRules from "./moveableRules.js";
import {
    getUiElements,
    fadeOut,
    instanceTemplate,
    getNextId,
    debounce,
    deleteButtonIsSure,
    deleteButtonIsSureReset
} from "./util.js";

let ui;
let saveRuleGroup;

let currentAddRuleBtn;
let currentAddRuleFunc;
let currentSaveFunc;

function positionRuleDropdown(addBtn) {
    ui.addRuleDropdown.style.top = (addBtn.offsetTop + 40) + "px";
    ui.addRuleDropdown.style.left = (addBtn.offsetLeft - 40) + "px";

    const rect = ui.addRuleDropdown.getBoundingClientRect();
    if (rect.top + rect.height > window.innerHeight && addBtn.offsetTop - rect.height > 0) {
        ui.addRuleDropdown.style.top = (addBtn.offsetTop - rect.height) + "px";
        ui.addRuleDropdown.style.left = (addBtn.offsetLeft - 40) + "px";
        ui.addRuleDropdown.classList.add("reverse");
    } else {
        ui.addRuleDropdown.classList.remove("reverse");
    }
}

function showRuleDropdown(addBtn, addRuleFunc, saveFunc) {
    if (ui.addRuleDropdown.style.display !== "none" && currentAddRuleFunc === addRuleFunc) {
        ui.addRuleDropdown.style.display = "none";
    } else {
        currentAddRuleBtn = addBtn;
        currentAddRuleFunc = addRuleFunc;
        currentSaveFunc = saveFunc;
        ui.addRuleDropdown.style.display = "block";
        positionRuleDropdown(addBtn);
    }
}

function createSaveFunction(groupId) {
    return (opts = {}) => {
        const domain = document.getElementById(groupId);
        if (domain) {
            const data = getDomainData(domain);
            saveRuleGroup(data, opts.removeIds);
        } else {
            setupNetRequestRules({ rules: [] }, opts.removeIds);
            mainStorage.delete(groupId);
        }
    };
}

export const createDomainMarkup = (savedData) => {
    savedData = savedData || {};
    const domain = instanceTemplate(ui.domainTemplate);
    const overrideRulesContainer = domain.querySelector(".overrideRules");
    const addRuleBtn = domain.querySelector(".addRuleBtn");
    const domainMatchInput = domain.querySelector(".domainMatchInput");
    const onOffBtn = domain.querySelector(".onoffswitch-checkbox");
    const deleteBtn = domain.querySelector(".deleteBtn");
    const rules = savedData.rules || [];

    const id = savedData.id || getNextId(document.querySelectorAll(".domainContainer"), "d");
    domain.id = id;
    const saveFunc = debounce(createSaveFunction(id), 700);

    rules.forEach((rule) => {
        if (rule.type === "normalOverride") {
            overrideRulesContainer.appendChild(createWebOverrideMarkup(rule, saveFunc));
        } else if (rule.type === "fileOverride") {
            overrideRulesContainer.appendChild(createFileOverrideMarkup(rule, saveFunc));
        } else if (rule.type === "fileInject") {
            overrideRulesContainer.appendChild(createFileInjectMarkup(rule, saveFunc));
        } else if (rule.type === "headerRule") {
            overrideRulesContainer.appendChild(createHeaderRuleMarkup(rule, saveFunc));
        }
    });

    const mvRules = moveableRules(overrideRulesContainer, ".handle");
    mvRules.onMove(saveFunc);

    domainMatchInput.value = savedData.matchUrl || "";
    onOffBtn.checked = savedData.on === false ? false : true;

    if (savedData.on === false) {
        domain.classList.add("disabled");
    }

    const addRuleCallback = (markup) => {
        mvRules.assignHandleListener(markup.querySelector(".handle"));
        overrideRulesContainer.appendChild(markup);
    };

    addRuleBtn.addEventListener("click", () => {
        showRuleDropdown(addRuleBtn, addRuleCallback, saveFunc);
    });

    domainMatchInput.addEventListener("keyup", saveFunc);

    const changeOnOffSwitch = () => {
        if (onOffBtn.checked) {
            domain.classList.remove("disabled");
        } else {
            domain.classList.add("disabled");
        }
        saveFunc();
    };
    onOffBtn.addEventListener("click", changeOnOffSwitch);
    onOffBtn.addEventListener("change", changeOnOffSwitch);

    deleteBtn.addEventListener("click", () => {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        fadeOut(domain);
        setTimeout(() => {
            domain.remove();
            const rules = savedData.rules || [];
            saveFunc({ removeIds: rules.map(rule => rule.id) });
        }, 300);
    });

    deleteBtn.addEventListener("mouseout", function() {
        deleteButtonIsSureReset(deleteBtn);
    });

    return domain;
};

export const tabGroupsInit = (saveRuleGroupFunc) => {
    ui = getUiElements(document);
    saveRuleGroup = saveRuleGroupFunc;

    ui.addWebRuleBtn.addEventListener("click", () => {
        currentAddRuleFunc(createWebOverrideMarkup({}, currentSaveFunc));
    });

    ui.addFileRuleBtn.addEventListener("click", () => {
        currentAddRuleFunc(createFileOverrideMarkup({}, currentSaveFunc));
    });

    ui.addInjectRuleBtn.addEventListener("click", () => {
        currentAddRuleFunc(createFileInjectMarkup({}, currentSaveFunc));
    });

    ui.addHeaderRuleBtn.addEventListener("click", () => {
        currentAddRuleFunc(createHeaderRuleMarkup({}, currentSaveFunc));
    });

    window.addEventListener("resize", () => {
        if (currentAddRuleBtn) {
            positionRuleDropdown(currentAddRuleBtn);
        }
    });

    window.addEventListener("click", (e) => {
        const target = e.target;
        if (!target.classList.contains("addRuleBtn") && target.id !== "addRuleDropdown") {
            ui.addRuleDropdown.style.display = "none";
        }
    });
};
