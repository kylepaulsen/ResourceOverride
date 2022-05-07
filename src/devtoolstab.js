import {
    getUiElements,
    getTabResources,
    fadeOut,
    fadeIn,
    getNextGroupId,
    saveDataAndSync
} from "./util.js";
import { mainSuggest, requestHeadersSuggest, responseHeadersSuggest } from "./suggest.js";
import setupNetRequestRules from "./netRequestRules.js";
import { requestHeaders, responseHeaders } from "./headers.js";
import { tabGroupsInit, createDomainMarkup } from "./tabGroup.js";
import initOptions, { updateOptions } from "./options.js";

/* globals chrome */
const ui = getUiElements(document);

let allRuleErrors = {};

const saveRuleGroup = async (group, removedIds = []) => {
    const ruleGroups = (await chrome.storage.local.get({ ruleGroups: [] })).ruleGroups;
    const groupIndex = ruleGroups.findIndex(rGroup => rGroup.id === group.id);
    if (groupIndex > -1) {
        ruleGroups[groupIndex] = group;
    } else if (group.id) {
        ruleGroups.push(group);
    }
    await saveDataAndSync({ ruleGroups });

    const ruleErrors = await setupNetRequestRules(group, removedIds);
    allRuleErrors[group.id] = ruleErrors;
};

async function renderData() {
    ui.domainDefs.innerHTML = "";
    const ruleGroups = (await chrome.storage.local.get({ ruleGroups: [] })).ruleGroups;

    if (ruleGroups.length) {
        ruleGroups.forEach(async (group) => {
            const markup = await createDomainMarkup(group);
            ui.domainDefs.appendChild(markup);
        });
    } else {
        const newGroupData = {
            id: 1,
            name: "",
            rules: [{id: 1, type: "normalOverride"}],
            on: true,
        };
        const newGroup = await createDomainMarkup(newGroupData);
        ui.domainDefs.appendChild(newGroup);
        saveRuleGroup(newGroupData);
    }
    const isSuggestSupported = getTabResources((res) => {
        mainSuggest.fillOptions(res);
    });
    if (!isSuggestSupported) {
        mainSuggest.setShouldSuggest(false);
    }
}

const renderErrors = () => {
    document.querySelectorAll(".ruleContainer").forEach(el => {
        el.classList.remove("error");
        el.title = "";
    });
    Object.keys(allRuleErrors).forEach((groupId) => {
        const groupRuleErrors = allRuleErrors[groupId];
        Object.keys(groupRuleErrors).forEach((key) => {
            const rule = document.querySelector(`#r${key}`);
            rule.classList.add("error");
            rule.title = groupRuleErrors[key];
        });
    });
};

async function init() {
    tabGroupsInit(saveRuleGroup);
    mainSuggest.init();
    requestHeadersSuggest.init();
    responseHeadersSuggest.init();
    requestHeadersSuggest.fillOptions(requestHeaders);
    responseHeadersSuggest.fillOptions(responseHeaders);
    initOptions();
    updateOptions();

    ui.addDomainBtn.addEventListener("click", async () => {
        const ruleGroups = (await chrome.storage.local.get({ ruleGroups: [] })).ruleGroups;
        const id = getNextGroupId(ruleGroups);
        const newGroupData = {
            id,
            name: "",
            rules: [],
            on: true,
        };
        const newGroup = await createDomainMarkup(newGroupData);
        ui.domainDefs.appendChild(newGroup);
        saveRuleGroup(newGroupData);
    });

    ui.helpBtn.addEventListener("click", () => {
        ui.helpOverlay.style.display = ui.helpOverlay.style.display === "block" ? "none" : "block";
    });

    ui.helpCloseBtn.addEventListener("click", () => {
        ui.helpOverlay.style.display = "none";
    });

    if (!chrome.devtools) {
        const storage = await chrome.storage.local.get({ tabPageNotice: false });
        if (!storage.tabPageNotice) {
            ui.tabPageNotice.querySelector("a").addEventListener("click", (e) => {
                e.preventDefault();
                chrome.storage.local.set({ tabPageNotice: true });
                fadeOut(ui.tabPageNotice);
            });
            fadeIn(ui.tabPageNotice);
            setTimeout(function() {
                fadeOut(ui.tabPageNotice);
            }, 6000);
        }
    }

    const messageActions = {
        sync: () => {
            renderData();
        },
    };

    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        // util.debug('got message! action: ' + request.action);
        let sentResponse = false;
        const mySendResponse = (...args) => {
            sentResponse = true;
            sendResponse(...args);
        };
        const action = messageActions[request.action];
        if (action) {
            await action(request, sender, mySendResponse);
            if (!sentResponse) {
                sendResponse();
            }
            // !!!Important!!! Need to return true for sendResponse to work.
            return true;
        }
        console.error(`Message handler: No action named ${request.action}`);
    });

    chrome.storage.onChanged.addListener(async (changes) => {
        const optionChanged = Object.keys(changes).find(changeKey => changeKey.includes("option"));
        if (optionChanged) {
            updateOptions();
        }
    });

    if (navigator.userAgent.indexOf("Firefox") > -1 && !!chrome.devtools) {
        // Firefox is really broken with the "/" and "'" keys. They just dont work.
        // So try to fix them here.. wow.. just wow. I can't believe I'm fixing the ability to type.
        const brokenKeys = { "/": 1, "?": 1, "'": 1, '"': 1 };
        window.addEventListener("keydown", e => {
            const brokenKey = brokenKeys[e.key];
            const activeEl = document.activeElement;
            if (brokenKey && (activeEl.nodeName === "INPUT" || activeEl.nodeName === "TEXTAREA") &&
                activeEl.className !== "ace_text-input") {

                e.preventDefault();
                const start = activeEl.selectionStart;
                const end = activeEl.selectionEnd;
                activeEl.value = activeEl.value.substring(0, start) + e.key +
                    activeEl.value.substring(end, activeEl.value.length);
                activeEl.selectionStart = start + 1;
                activeEl.selectionEnd = start + 1;
            }
        });
    }

    await renderData();
    allRuleErrors = {};

    const ruleGroups = (await chrome.storage.local.get({ ruleGroups: [] })).ruleGroups;
    const ruleErrorsPairedWithGroup = await Promise.all(ruleGroups.map(
        (group) => setupNetRequestRules(group).then(ruleErrors => ({ group, ruleErrors }))
    ));
    ruleErrorsPairedWithGroup.forEach(ruleErrorWithGroup => {
        allRuleErrors[ruleErrorWithGroup.group.id] = ruleErrorWithGroup.ruleErrors;
        renderErrors();
    });
}

init();
