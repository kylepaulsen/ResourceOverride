"use strict";

/* globals $ */

import {app, ui} from './init.js';
import {createHeaderEditorRuleMarkup} from './rules/header.js';

let saveFunc;

function getRule(el) {
    const operation = el.getElementsByClassName("operationSelect")[0].value;
    const headerName = encodeURIComponent(el.getElementsByClassName("headerName")[0].value || "");
    const headerValue = encodeURIComponent(el.getElementsByClassName("headerValue")[0].value || "");
    let nextRule;
    if (headerName) {
        if (operation === "set") {
            nextRule = "set ";
            nextRule += headerName + ": ";
            nextRule += headerValue;
        } else {
            nextRule = "remove ";
            nextRule += headerName;
        }
    }
    return nextRule;
}

function getHeaderEditRules() {
    const reqRules = [];
    const resRules = [];
    const requestRules = ui.headerRequestRulesContainer.getElementsByClassName("headerEditorRule");
    const responseRules = ui.headerResponseRulesContainer.getElementsByClassName("headerEditorRule");

    [...requestRules].forEach(function(el) {
        const rule = getRule(el);
        if (rule) {
            reqRules.push(rule);
        }
    });
    [...responseRules].forEach(function(el) {
        const rule = getRule(el);
        if (rule) {
            resRules.push(rule);
        }
    });
    return {
        requestRules: reqRules,
        responseRules: resRules
    };
}

function parseHeaderDataStr(headerDataStr) {
    const ans = [];
    const rules = headerDataStr.split(";");
    rules.forEach(function(rule) {
        const ruleParts = rule.split(": ");
        if (ruleParts[0].indexOf("set") === 0) {
            if (ruleParts.length === 2) {
                ans.push({
                    operation: "set",
                    header: decodeURIComponent(ruleParts[0].substring(4)),
                    value: decodeURIComponent(ruleParts[1])
                });
            }
        } else if (ruleParts[0].indexOf("remove") === 0) {
            ans.push({
                operation: "remove",
                header: decodeURIComponent(ruleParts[0].substring(7))
            });
        }
    });
    return ans;
}

function openHeaderEditor(requestHeaderDataStr, responseHeaderDataStr, matchRule, saveFunction) {
    saveFunc = saveFunction;
    const requestHeadersData = parseHeaderDataStr(requestHeaderDataStr);
    const responseHeadersData = parseHeaderDataStr(responseHeaderDataStr);
    ui.headerRequestRulesContainer.innerHTML= "";
    ui.headerResponseRulesContainer.innerHTML= "";
    requestHeadersData.forEach(function(data) {
        ui.headerRequestRulesContainer.appendChild(createHeaderEditorRuleMarkup(data, saveFunc, "request"));
    });
    responseHeadersData.forEach(function(data) {
        ui.headerResponseRulesContainer.appendChild(createHeaderEditorRuleMarkup(data, saveFunc, "response"));
    });
    ui.headerMatchContainer.textContent = matchRule || "<Not defined yet>";
    ui.headerRuleOverlay.style.display = "flex"
    ui.body.style.overflow = "hidden"
}

ui.closeHeaderRuleEditorBtn.addEventListener("click", function() {
    ui.headerRuleOverlay.style.display = "none";
    ui.body.style.overflow = "auto"
});

ui.addRequestHeaderBtn.addEventListener("click", function() {
    ui.headerRequestRulesContainer.appendChild(createHeaderEditorRuleMarkup(undefined, saveFunc, "request"));
});

ui.addResponseHeaderBtn.addEventListener("click", function() {
    ui.headerResponseRulesContainer.appendChild(createHeaderEditorRuleMarkup(undefined, saveFunc, "response"));
});

const resPresets = {
    cors: [{
        operation: "set",
        header: "Access-Control-Allow-Origin",
        value: "*"
    }],
    noInline: [{
        operation: "set",
        header: "Content-Security-Policy",
        value: "script-src * 'nonce-ResourceOverride'"
    }],
    allowFrames: [{
        operation: "remove",
        header: "X-Frame-Options"
    }],
    allowContent: [{
        operation: "remove",
        header: "Content-Security-Policy"
    }, {
        operation: "remove",
        header: "X-Content-Security-Policy"
    }]
};

ui.headerPresetsSelect.addEventListener("change", function() {
    const presetName = ui.headerPresetsSelect.value;
    const presets = resPresets[presetName];
    ui.headerPresetsSelect.value = "";
    if (presets) {
        // Right now only response presets are allowed.
        presets.forEach(function(preset) {
            const markup = createHeaderEditorRuleMarkup(preset, saveFunc, "response");
            ui.headerResponseRulesContainer.appendChild(markup);
        });
        saveFunc();
    }
});

export const headerEditor = {
    open: openHeaderEditor,
    getRules: getHeaderEditRules
};
