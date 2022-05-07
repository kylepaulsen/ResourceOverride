import setupNetRequestRules from "./netRequestRules.js";
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
    debounce,
    deleteButtonIsSure,
    deleteButtonIsSureReset,
    getNextGroupId,
    saveDataAndSync
} from "./util.js";

/* globals chrome */

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
    return async (opts = {}) => {
        const domain = document.getElementById(`d${groupId}`);
        if (domain) {
            const data = getDomainData(domain);
            saveRuleGroup(data, opts.removeIds);
        } else {
            setupNetRequestRules({ rules: [] }, opts.removeIds);
            const ruleGroups = (await chrome.storage.local.get({ ruleGroups: [] })).ruleGroups;
            const newRuleGroups = ruleGroups.filter((g) => g.id !== opts.id);
            await saveDataAndSync({ ruleGroups: newRuleGroups });
        }
    };
}

export const createDomainMarkup = async (savedData) => {
    savedData = savedData || {};
    const domain = instanceTemplate(ui.domainTemplate);
    const overrideRulesContainer = domain.querySelector(".overrideRules");
    const addRuleBtn = domain.querySelector(".addRuleBtn");
    const domainMatchInput = domain.querySelector(".domainMatchInput");
    const onOffBtn = domain.querySelector(".onoffswitch-checkbox");
    const deleteBtn = domain.querySelector(".deleteBtn");
    const rules = savedData.rules || [];

    let id = savedData.id;
    if (!id) {
        const ruleGroups = (await chrome.storage.local.get({ ruleGroups: [] })).ruleGroups;
        id = getNextGroupId(ruleGroups);
    }
    domain.id = `d${id}`;
    addRuleBtn.dataset.gid = id;
    const saveFunc = debounce(createSaveFunction(id), 700);

    for (let idx = 0, len = rules.length; idx < len; idx++) {
        const rule = rules[idx];
        if (rule.type === "normalOverride") {
            const el = await createWebOverrideMarkup(rule, saveFunc);
            overrideRulesContainer.appendChild(el);
        } else if (rule.type === "fileOverride") {
            const el = await createFileOverrideMarkup(rule, saveFunc);
            overrideRulesContainer.appendChild(el);
        } else if (rule.type === "fileInject") {
            const el = await createFileInjectMarkup(rule, saveFunc);
            overrideRulesContainer.appendChild(el);
        } else if (rule.type === "headerRule") {
            const el = await createHeaderRuleMarkup(rule, saveFunc);
            overrideRulesContainer.appendChild(el);
        }
    }

    const mvRules = moveableRules(overrideRulesContainer, ".handle");
    mvRules.onMove(saveFunc);

    domainMatchInput.value = savedData.name || "";
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
        setTimeout(async () => {
            domain.remove();
            const ruleGroups = (await chrome.storage.local.get({ ruleGroups: [] })).ruleGroups;
            const ruleGroup = ruleGroups.find(g => g.id === id);
            if (ruleGroup) {
                const rules = ruleGroup.rules || [];
                chrome.storage.local.remove(rules.map(r => `f${r.id}`));
                saveFunc({ id, removeIds: rules.map(rule => rule.id) });
            }
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

    ui.addWebRuleBtn.addEventListener("click", async () => {
        const el = await createWebOverrideMarkup({}, currentSaveFunc);
        currentAddRuleFunc(el);
        createSaveFunction(currentAddRuleBtn.dataset.gid)();
    });

    ui.addFileRuleBtn.addEventListener("click", async () => {
        const el = await createFileOverrideMarkup({}, currentSaveFunc);
        currentAddRuleFunc(el);
        createSaveFunction(currentAddRuleBtn.dataset.gid)();
    });

    ui.addInjectRuleBtn.addEventListener("click", async () => {
        const el = await createFileInjectMarkup({}, currentSaveFunc);
        currentAddRuleFunc(el);
        createSaveFunction(currentAddRuleBtn.dataset.gid)();
    });

    ui.addHeaderRuleBtn.addEventListener("click", async () => {
        const el = await createHeaderRuleMarkup({}, currentSaveFunc);
        currentAddRuleFunc(el);
        createSaveFunction(currentAddRuleBtn.dataset.gid)();
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
