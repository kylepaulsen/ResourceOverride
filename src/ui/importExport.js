import { showToast, parseRuleId } from "./util.js";

const app = window.app;

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
                file: app.files[el.dataset.fileId] || "",
                fileId: el.dataset.fileId,
                on: el.querySelector(".onoffswitch-checkbox").checked
            });
        } else if (el.classList.contains("fileInject")) {
            rules.push({
                id: parseRuleId(el.id),
                type: "fileInject",
                match: el.querySelector(".matchInput").value,
                fileName: el.querySelector(".fileName").value,
                file: app.files[el.dataset.fileId] || "",
                fileId: el.dataset.fileId,
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
        id: domain.id,
        matchUrl: domain.querySelector(".domainMatchInput").value,
        rules: rules,
        on: domain.querySelector(".onoffswitch-checkbox").checked
    };
};

function checkRule(rule) {
    let valid = true;
    if (rule.type === "normalOverride") {
        valid = valid && rule.match !== undefined;
        valid = valid && rule.replace !== undefined;
        valid = valid && rule.on !== undefined;
    } else if (rule.type === "fileOverride") {
        valid = valid && rule.match !== undefined;
        valid = valid && rule.file !== undefined;
        valid = valid && (/^f[0-9]+$/).test(rule.fileId);
        valid = valid && rule.on !== undefined;
    } else if (rule.type === "fileInject") {
        valid = valid && rule.fileName !== undefined;
        valid = valid && rule.file !== undefined;
        valid = valid && (/^f[0-9]+$/).test(rule.fileId);
        valid = valid && rule.fileType !== undefined;
        valid = valid && rule.injectLocation !== undefined;
        valid = valid && rule.on !== undefined;
    } else if (rule.type === "headerRule") {
        valid = valid && rule.match !== undefined;
        valid = valid && rule.requestRules !== undefined;
        valid = valid && rule.responseRules !== undefined;
        valid = valid && rule.on !== undefined;
    }
    return valid;
}

function checkDomain(domain) {
    let valid = (/^d[0-9]+$/).test(domain.id);
    valid = valid && domain.matchUrl !== undefined;
    valid = valid && domain.on !== undefined;
    valid = valid && Array.isArray(domain.rules);
    valid = valid && domain.rules.every(checkRule);
    return valid;
}

// eslint-disable-next-line no-unused-vars
export const importData = (data, version) => {
    // check data first.
    if (Array.isArray(data) && data.every(checkDomain)) {
        // this will call the sync function so stuff will get re-rendered.
        // chrome.runtime.sendMessage({action: "import", data: data});
        showToast("Load Succeeded!");
    } else {
        showToast("Load Failed: Invalid Resource Override JSON.");
    }
};

export const exportData = () => {
    const allData = [];
    document.querySelectorAll(".domainContainer").forEach(domain => {
        allData.push(getDomainData(domain));
    });
    return {v: 2, data: allData};
};
