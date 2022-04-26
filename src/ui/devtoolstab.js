(function() {
    "use strict";

    /* globals chrome, globMatchToDNRRegex */

    const app = window.app;
    const ui = app.ui;
    const util = app.util;

    app.mainSuggest = app.suggest();
    app.requestHeadersSuggest = app.suggest();
    app.responseHeadersSuggest = app.suggest();
    app.files = {};
    app.skipNextSync = false;

    app.ruleGroups = [];
    app.ruleErrors = {};

    app.sendSyncMessage = () => chrome.runtime.sendMessage({ action: "sync" });

    const transformMatchReplace = (match = "", replace = "") => {
        const trimMatch = match.trim();
        if (trimMatch.length > 2 && trimMatch[0] === "/" && trimMatch[trimMatch.length - 1] === "/") {
            // the match string has the "regex mode" characters, so dont do transform.
            return {
                match: trimMatch.substring(1, trimMatch.length - 1),
                replace
            };
        }
        const result = globMatchToDNRRegex(match, replace);
        result.match = `^${result.match}$`;
        return result;
    };

    const allResourceTypes = ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object",
        "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"];

    app.setupNetRequestRules = (group, deletedRuleIds = [], ruleErrors = {}) => {
        const allRuleIds = [];
        const ruleIdToRule = {};
        const rules = group.rules || [];
        rules.forEach(rule => {
            ruleIdToRule[rule.id] = rule;
            allRuleIds.push(rule.id);
        });
        const removeRuleIds = allRuleIds.concat(deletedRuleIds);
        const newRules = [];
        if (group.on) {
            rules.forEach((rule, idx) => {
                const priority = 10 + rules.length - idx;
                if (rule.on && !ruleErrors[rule.id]) {
                    if (rule.type === "normalOverride" && rule.match && rule.replace) {
                        const transformedMatchReplace = transformMatchReplace(rule.match, rule.replace);
                        newRules.push({
                            id: rule.id,
                            priority,
                            action: {
                                type: "redirect",
                                redirect: {
                                    regexSubstitution: transformedMatchReplace.replace
                                }
                            },
                            condition: {
                                resourceTypes: allResourceTypes,
                                regexFilter: transformedMatchReplace.match
                            }
                        });
                    } else if (rule.type === "fileOverride" && rule.match) {
                        const mimeAndFile = app.extractMimeType(rule.match, rule.file);
                        const transformedMatchReplace = transformMatchReplace(rule.match, "");
                        newRules.push({
                            id: rule.id,
                            priority,
                            action: {
                                type: "redirect",
                                redirect: {
                                    url: "data:" + mimeAndFile.mime + ";charset=UTF-8;base64," +
                                    btoa(unescape(encodeURIComponent(mimeAndFile.file || "")))
                                }
                            },
                            condition: {
                                resourceTypes: allResourceTypes,
                                regexFilter: transformedMatchReplace.match
                            }
                        });
                    } else if (rule.type === "headerRule" && rule.match) {
                        const transformedMatchReplace = transformMatchReplace(rule.match, "");
                        const requestHeaders = util.parseHeaderDataStr(rule.requestRules || "");
                        const responseHeaders = util.parseHeaderDataStr(rule.responseRules || "");
                        const action = { type: "modifyHeaders" };
                        if (requestHeaders.length) {
                            action.requestHeaders = requestHeaders;
                        }
                        if (responseHeaders.length) {
                            action.responseHeaders = responseHeaders;
                        }
                        if (action.requestHeaders || action.responseHeaders) {
                            newRules.push({
                                id: rule.id,
                                priority,
                                action,
                                condition: {
                                    resourceTypes: allResourceTypes,
                                    regexFilter: transformedMatchReplace.match
                                }
                            });
                        }
                    }
                }
            });
        }
        return chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds,
            addRules: newRules
        }).then(() => ruleErrors).catch(e => {
            console.error("FAILED TO UPDATE RULES!", e);
            const messageParts = e.message?.split?.("Rule with id ");
            if (messageParts && messageParts.length > 1) {
                const badId = parseInt(messageParts[1]);
                let errorMessage = e.message;
                if (errorMessage.includes("regexSubstitution")) {
                    errorMessage =
                        "The \"To\" field has incorrect syntax or is referencing an undefined capture group.";
                } else if (errorMessage.includes("regexFilter")) {
                    if (ruleIdToRule[badId].type === "headerRule") {
                        errorMessage = "The \"For\" field has incorrect syntax.";
                    } else {
                        errorMessage = "The \"From\" field has incorrect syntax.";
                    }
                }
                ruleErrors[badId] = errorMessage;
                return app.setupNetRequestRules(group, deletedRuleIds, ruleErrors);
            }
        });
    };

    app.saveRuleGroup = (group, removedIds = []) => {
        app.mainStorage.put(group)
            .then(app.sendSyncMessage)
            .catch(() => {}) // sending the sync message can just fail randomly. I have no idea why.
            .then(() => app.setupNetRequestRules(group, removedIds))
            .then((ruleErrors) => {
                app.ruleErrors[group.id] = ruleErrors;
                renderErrors();
            });
    };

    async function renderData() {
        app.files = {};
        ui.domainDefs.children().remove();
        app.ruleGroups = await app.mainStorage.getAll();
        console.log(app.ruleGroups);
        if (app.ruleGroups.length) {
            app.ruleGroups.forEach(function(group) {
                const markup = app.createDomainMarkup(group);
                ui.domainDefs.append(markup);
            });
        } else {
            const newGroupData = {
                id: "d1",
                matchUrl: "",
                rules: [{id: 1, type: "normalOverride"}],
                on: true,
            };
            const newGroup = app.createDomainMarkup(newGroupData);
            ui.domainDefs.append(newGroup);
            app.saveRuleGroup(newGroupData);
        }
        util.getTabResources(function(res) {
            app.mainSuggest.fillOptions(res);
        });
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
        app.mainSuggest.init();
        app.requestHeadersSuggest.init();
        app.responseHeadersSuggest.init();
        app.requestHeadersSuggest.fillOptions(app.headersLists.requestHeaders);
        app.responseHeadersSuggest.fillOptions(app.headersLists.responseHeaders);

        // app.ruleGroups = await app.mainStorage.getAll();

        ui.addDomainBtn.on("click", function() {
            const newDomain = app.createDomainMarkup();
            ui.domainDefs.append(newDomain);
            // chrome.runtime.sendMessage({action: "saveDomain", data: app.getDomainData(newDomain)});
            app.skipNextSync = true;
        });

        ui.helpBtn.on("click", function() {
            ui.helpOverlay.toggle();
        });

        ui.helpCloseBtn.on("click", function() {
            ui.helpOverlay.hide();
        });

        if (!chrome.devtools) {
            ui.showSuggestions.hide();
            ui.showSuggestionsText.hide();
            // chrome.runtime.sendMessage({
            //     action: "getSetting",
            //     setting: "tabPageNotice"
            // }, function(data) {

            //     if (data !== "true") {
            //         ui.tabPageNotice.find("a").on("click", function(e) {
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
            (group) => app.setupNetRequestRules(group).then(ruleErrors => ({ group, ruleErrors }))
        ));
        ruleErrorsPairedWithGroup.forEach(ruleErrorWithGroup => {
            app.ruleErrors[ruleErrorWithGroup.group.id] = ruleErrorWithGroup.ruleErrors;
            renderErrors();
        });
    }

    init();

})();
