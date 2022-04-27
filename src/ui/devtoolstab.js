import { getUiElements, getTabResources, sendSyncMessage } from "./util.js";
import { mainSuggest, requestHeadersSuggest, responseHeadersSuggest } from "./suggest.js";
import setupNetRequestRules from "./netRequestRules.js";
import { mainStorage } from "./mainStorage.js";
import { requestHeaders, responseHeaders } from "./headers.js";
import { tabGroupsInit, createDomainMarkup } from "./tabGroup.js";
import initOptions from "./options.js";

/* globals chrome */
const app = window.app;
const ui = getUiElements(document);

const saveRuleGroup = (group, removedIds = []) => {
    mainStorage.put(group)
        .then(sendSyncMessage)
        .catch(() => {}) // sending the sync message can just fail randomly. I have no idea why.
        .then(() => setupNetRequestRules(group, removedIds))
        .then((ruleErrors) => {
            app.ruleErrors[group.id] = ruleErrors;
            renderErrors();
        });
};

async function renderData() {
    app.files = {};
    ui.domainDefs.innerHTML = "";
    app.ruleGroups = await mainStorage.getAll();

    if (app.ruleGroups.length) {
        app.ruleGroups.forEach((group) => {
            const markup = createDomainMarkup(group);
            ui.domainDefs.appendChild(markup);
        });
    } else {
        const newGroupData = {
            id: "d1",
            matchUrl: "",
            rules: [{id: 1, type: "normalOverride"}],
            on: true,
        };
        const newGroup = createDomainMarkup(newGroupData);
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
    Object.keys(app.ruleErrors).forEach((groupId) => {
        const groupRuleErrors = app.ruleErrors[groupId];
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

    // app.ruleGroups = await app.mainStorage.getAll();

    ui.addDomainBtn.addEventListener("click", () => {
        const newDomain = createDomainMarkup();
        ui.domainDefs.appendChild(newDomain);
        // chrome.runtime.sendMessage({action: "saveDomain", data: app.getDomainData(newDomain)});
        // app.skipNextSync = true;
    });

    ui.helpBtn.addEventListener("click", () => {
        ui.helpOverlay.style.display = ui.helpOverlay.style.display === "block" ? "none" : "block";
    });

    ui.helpCloseBtn.addEventListener("click", () => {
        ui.helpOverlay.style.display = "none";
    });

    if (!chrome.devtools) {
        ui.showSuggestions.style.display = "none";
        ui.showSuggestionsText.style.display = "none";
        // chrome.runtime.sendMessage({
        //     action: "getSetting",
        //     setting: "tabPageNotice"
        // }, function(data) {

        //     if (data !== "true") {
        //         ui.tabPageNotice.find("a").addEventListener("click", function(e) {
        //             e.preventDefault();
        //             chrome.runtime.sendMessage({
        //                 action: "setSetting",
        //                 setting: "tabPageNotice",
        //                 value: "true"
        //             });
        //             ui.tabPageNotice.fadeOut();
        //         });
        //         ui.tabPageNotice.fadeIn();
        //         setTimeout(function() {
        //             ui.tabPageNotice.fadeOut();
        //         }, 6000);
        //     }
        // });
    }

    const messageActions = {
        sync: () => {
            renderData();
        }
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // util.debug('got message! action: ' + request.action);
        const action = messageActions[request.action];
        if (action) {
            action(request, sender, sendResponse);
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
    app.ruleErrors = {};
    const ruleErrorsPairedWithGroup = await Promise.all(app.ruleGroups.map(
        (group) => setupNetRequestRules(group).then(ruleErrors => ({ group, ruleErrors }))
    ));
    ruleErrorsPairedWithGroup.forEach(ruleErrorWithGroup => {
        app.ruleErrors[ruleErrorWithGroup.group.id] = ruleErrorWithGroup.ruleErrors;
        renderErrors();
    });
}

init();
