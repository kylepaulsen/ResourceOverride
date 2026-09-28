import {
    getUiElements,
    getTabResources,
    fadeOut,
    fadeIn,
    getNextGroupId,
    saveDataAndSync
} from "./util.js";
import { mainSuggest, requestHeadersSuggest, responseHeadersSuggest } from "./suggest.js";
import setupNetRequestRules, { setupAllNetRequestRules } from "./netRequestRules.js";
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

    // The group's position decides its priority relative to the other groups, so a
    // single-group edit has to be told where the group sits.
    const position = {
        groupIndex: ruleGroups.findIndex(rGroup => rGroup.id === group.id),
        groupCount: ruleGroups.length
    };
    const ruleErrors = await setupNetRequestRules(group, removedIds, {}, position);
    allRuleErrors[group.id] = ruleErrors;
};

// Draws every stored rule group and returns the groups it rendered, so the
// caller does not have to read storage a second time.
async function renderData() {
    const ruleGroups = (await chrome.storage.local.get({ ruleGroups: [] })).ruleGroups;
    // Build off-document and insert the whole list in one mutation. Appending
    // each group on its own forced a layout per group.
    const fragment = document.createDocumentFragment();

    if (ruleGroups.length) {
        // Render in order: a plain forEach with async callbacks resumes out of order.
        for (const group of ruleGroups) {
            const markup = await createDomainMarkup(group);
            fragment.appendChild(markup);
        }
    } else {
        const newGroupData = {
            id: 1,
            name: "",
            rules: [{id: 1, type: "normalOverride"}],
            on: true,
        };
        const newGroup = await createDomainMarkup(newGroupData);
        fragment.appendChild(newGroup);
        await saveRuleGroup(newGroupData);
        ruleGroups.push(newGroupData);
    }

    ui.domainDefs.innerHTML = "";
    ui.domainDefs.appendChild(fragment);

    const isSuggestSupported = getTabResources((res) => {
        mainSuggest.fillOptions(res);
    });
    if (!isSuggestSupported) {
        mainSuggest.setShouldSuggest(false);
    }

    return ruleGroups;
}

// Re-renders the rule list and re-applies every dynamic declarativeNetRequest rule.
// Needed after the storage was replaced from the outside, e.g. by an import.
//
// Rendering is async, so a second call arriving mid-render would otherwise start
// another pass on top of the first. Overlapping calls are coalesced instead, with
// the in-flight promise covering one extra pass when something changed meanwhile.
let refreshInFlight = null;
let refreshPending = false;

async function refreshAllRules() {
    if (refreshInFlight) {
        // Something changed while a pass was running: request one more pass and let
        // the in-flight promise cover it.
        refreshPending = true;
        await refreshInFlight;
        // The in-flight pass resolved with the errors it had collected; once it has
        // settled allRuleErrors holds the final set for the caller.
        return allRuleErrors;
    }
    refreshInFlight = (async () => {
        do {
            refreshPending = false;
            // renderData returns the groups it just drew, so no second storage read.
            const ruleGroups = await renderData();
            // One batched API call for every group instead of one call per group.
            allRuleErrors = await setupAllNetRequestRules(ruleGroups);
            renderErrors();
        } while (refreshPending);
    })();
    try {
        await refreshInFlight;
    } finally {
        refreshInFlight = null;
    }
    // Returned so callers can report how many rules Chrome refused to register.
    return allRuleErrors;
}

const renderErrors = () => {
    document.querySelectorAll(".ruleContainer").forEach(el => {
        el.classList.remove("error");
        el.title = "";
    });
    Object.keys(allRuleErrors).forEach((groupId) => {
        const groupRuleErrors = allRuleErrors[groupId];
        Object.keys(groupRuleErrors).forEach((key) => {
            // A rule can be flagged and then removed before the next render, so the
            // element may no longer exist.
            const rule = document.getElementById(`r${key}`);
            if (rule) {
                rule.classList.add("error");
                rule.title = groupRuleErrors[key];
            }
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
    initOptions(refreshAllRules);
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
            refreshAllRules();
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

    await refreshAllRules();
}

init();
