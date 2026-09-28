import { showToast, parseRuleId, getNextRuleId, getNextGroupId, saveDataAndSync } from "./util.js";

/* global chrome */

export const getDomainData = (domain) => {
    const rules = [];
    domain.querySelectorAll(".ruleContainer").forEach((el) => {
        if (el.classList.contains("normalOverride")) {
            rules.push({
                id: parseRuleId(el.id),
                type: "normalOverride",
                match: el.querySelector(".matchInput").value,
                replace: el.querySelector(".replaceInput").value,
                on: el.querySelector(".onoffswitch-checkbox").checked
            });
        } else if (el.classList.contains("fileOverride")) {
            rules.push({
                id: parseRuleId(el.id),
                type: "fileOverride",
                match: el.querySelector(".matchInput").value,
                on: el.querySelector(".onoffswitch-checkbox").checked
            });
        } else if (el.classList.contains("fileInject")) {
            rules.push({
                id: parseRuleId(el.id),
                type: "fileInject",
                match: el.querySelector(".matchInput").value,
                fileName: el.querySelector(".fileName").value,
                fileType: el.querySelector(".fileTypeSelect").value,
                on: el.querySelector(".onoffswitch-checkbox").checked
            });
        } else if (el.classList.contains("headerRule")) {
            rules.push({
                id: parseRuleId(el.id),
                type: "headerRule",
                match: el.querySelector(".matchInput").value,
                requestRules: el.querySelector(".requestRules").dataset.rules || "",
                responseRules: el.querySelector(".responseRules").dataset.rules || "",
                on: el.querySelector(".onoffswitch-checkbox").checked
            });
        }
    });

    return {
        id: parseInt(domain.id.substring(1), 10),
        name: domain.querySelector(".domainMatchInput").value,
        rules: rules,
        on: domain.querySelector(".onoffswitch-checkbox").checked
    };
};

const checkObject = (obj, requiredFields = [], customTests = {}) => {
    requiredFields.forEach(requiredField => {
        const val = obj[requiredField];
        const customTest = customTests[requiredField] || (() => true);
        if (val === undefined || !customTest(val)) {
            throw new Error(`Invalid field: ${requiredField}`);
        }
    });
    return true;
};

const copyFields = (to, from, fields) => {
    fields.forEach(field => {
        to[field] = from[field];
    });
};

// Rule groups used to call this field "matchUrl". Accept both spellings so that
// imports and previously stored data keep working after the rename to "name".
const getRuleGroupName = (ruleGroup) => ruleGroup.name !== undefined ? ruleGroup.name : ruleGroup.matchUrl;

const versionedImports = {
    v1: (data, existingRuleGroups = []) => {
        const ruleGroupFields = ['on', 'rules'];
        checkObject({ data }, ['data'], {
            data: val => Array.isArray(val) && val.every(group => checkObject(group, ruleGroupFields, {
                rules: val => Array.isArray(val) && val.every(rule => {
                    if (rule.type === "normalOverride") {
                        return checkObject(rule, ['type', 'match', 'replace', 'on']);
                    } else if (rule.type === "fileOverride") {
                        return checkObject(rule, ['type', 'match', 'file', 'on']);
                    } else if (rule.type === "fileInject") {
                        return checkObject(rule, ['type', 'fileName', 'file', 'fileType', 'on'], {
                            fileType: val => ['js', 'css'].includes(val)
                        });
                    } else if (rule.type === "headerRule") {
                        return checkObject(rule, ['type', 'match', 'requestRules', 'responseRules', 'on']);
                    } else {
                        throw new Error('Invalid rule type: ' + rule.type);
                    }
                })
            }))
        });

        const ruleGroups = existingRuleGroups.slice();
        const dataToStore = { ruleGroups };
        let nextRuleId = getNextRuleId(existingRuleGroups);
        let nextGroupId = getNextGroupId(ruleGroups);

        data.forEach(ruleGroup => {
            const rules = [];
            ruleGroup.rules.forEach(rule => {
                const importedRule = { id: nextRuleId++ };
                if (rule.type === "normalOverride") {
                    copyFields(importedRule, rule, ["type", "match", "replace", "on"]);
                } else if (rule.type === "fileOverride") {
                    copyFields(importedRule, rule, ["type", "match", "on"]);
                    dataToStore[`f${importedRule.id}`] = rule.file;
                } else if (rule.type === "fileInject") {
                    copyFields(importedRule, rule, ["type", "match", "fileName", "fileType", "on"]);
                    dataToStore[`f${importedRule.id}`] = rule.file;
                } else if (rule.type === "headerRule") {
                    copyFields(importedRule, rule, ["type", "match", "requestRules", "responseRules", "on"]);
                }
                rules.push(importedRule);
            });
            ruleGroups.push({
                id: nextGroupId++,
                name: getRuleGroupName(ruleGroup) || "",
                rules,
                on: ruleGroup.on
            });
        });

        return saveDataAndSync(dataToStore);
    },
    v2: (data, existingRuleGroups = []) => {
        const ruleGroupFields = ['on', 'rules'];
        checkObject({ data }, ['data'], {
            data: val => Array.isArray(val) && val.every(group => checkObject(group, ruleGroupFields, {
                rules: val => Array.isArray(val) && val.every(rule => {
                    if (rule.type === "normalOverride") {
                        return checkObject(rule, ['type', 'match', 'replace', 'on']);
                    } else if (rule.type === "fileOverride") {
                        return checkObject(rule, ['type', 'match', 'file', 'on']);
                    } else if (rule.type === "fileInject") {
                        return checkObject(rule, ['type', 'match', 'file', 'fileName', 'fileType', 'on'], {
                            fileType: val => ['js', 'css'].includes(val)
                        });
                    } else if (rule.type === "headerRule") {
                        return checkObject(rule, ['type', 'match', 'requestRules', 'responseRules', 'on']);
                    } else {
                        throw new Error('Invalid rule type: ' + rule.type);
                    }
                })
            }))
        });

        const ruleGroups = existingRuleGroups.slice();
        const dataToStore = { ruleGroups };
        let nextRuleId = getNextRuleId(existingRuleGroups);
        let nextGroupId = getNextGroupId(ruleGroups);

        data.forEach(ruleGroup => {
            const rules = [];
            ruleGroup.rules.forEach(rule => {
                const importedRule = { id: nextRuleId++ };
                if (rule.type === "normalOverride") {
                    copyFields(importedRule, rule, ["type", "match", "replace", "on"]);
                } else if (rule.type === "fileOverride") {
                    copyFields(importedRule, rule, ["type", "match", "on"]);
                    dataToStore[`f${importedRule.id}`] = rule.file;
                } else if (rule.type === "fileInject") {
                    copyFields(importedRule, rule, ["type", "match", "fileName", "fileType", "on"]);
                    dataToStore[`f${importedRule.id}`] = rule.file;
                } else if (rule.type === "headerRule") {
                    copyFields(importedRule, rule, ["type", "match", "requestRules", "responseRules", "on"]);
                }
                rules.push(importedRule);
            });
            ruleGroups.push({
                id: nextGroupId++,
                name: getRuleGroupName(ruleGroup) || "",
                rules,
                on: ruleGroup.on
            });
        });

        return saveDataAndSync(dataToStore);
    },
};

// Returns true when the data was imported, false when it was rejected. The caller
// can use that to know whether it needs to re-render and re-apply the DNR rules.
export const importData = async (data, version) => {
    const importFunc = versionedImports[`v${version}`];
    if (!importFunc) {
        showToast("Load Failed: Invalid format version.");
        return false;
    }
    if (data === undefined) {
        showToast("Load Failed: Invalid Resource Override JSON.");
        return false;
    }
    const existingData = await chrome.storage.local.get({ ruleGroups: [] });
    try {
        await importFunc(data, existingData.ruleGroups);
        showToast("Load Succeeded!");
        return true;
    } catch (e) {
        console.error(e);
        showToast("Load Failed: Invalid Resource Override JSON.");
        return false;
    }
};

export const exportData = async () => {
    const existingData = await chrome.storage.local.get({ ruleGroups: [] });
    const data = await Promise.all(existingData.ruleGroups.map(async ruleGroup => {
        const fileIds = {};
        let hasFileRule = false;
        ruleGroup.rules.forEach(rule => {
            if (rule.type === "fileOverride" || rule.type === "fileInject") {
                fileIds[`f${rule.id}`] = "";
                hasFileRule = true;
            }
        });
        let files = {};
        if (hasFileRule) {
            files = await chrome.storage.local.get(fileIds);
        }
        const exportedRules = ruleGroup.rules.map(rule => {
            const exportedRule = { ...rule };
            if (rule.type === "fileOverride" || rule.type === "fileInject") {
                exportedRule.file = files[`f${rule.id}`];
            }
            return exportedRule;
        });
        return {
            id: ruleGroup.id,
            name: getRuleGroupName(ruleGroup) || "",
            rules: exportedRules,
            on: ruleGroup.on
        };
    }));

    return { v: 2, data };
};
