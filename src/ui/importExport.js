"use strict";

/* globals $, chrome */

import {app} from './init.js';
import {getDomainData} from './tabGroup.js';
import {showToast} from './util.js';

const checkRulesMap = new Map([
    ["normalOverride", (rule) => {
        return (rule.match !== undefined && rule.replace !== undefined && rule.on !== undefined);
    }],
    ["fileOverride", (rule) => {
        return (rule.match !== undefined && rule.file !== undefined && (/^f[0-9]+$/).test(rule.fileId) && rule.on !== undefined);
    }],
    ["fileInject", (rule) => {
        return (rule.fileName !== undefined && rule.file !== undefined && (/^f[0-9]+$/).test(rule.fileId) && rule.fileType !== undefined && rule.injectLocation !== undefined && rule.on !== undefined);
    }],
    ["headerRule", (rule) => {
        return (rule.match !== undefined && rule.requestRules !== undefined && rule.responseRules !== undefined && rule.on !== undefined);
    }],
]);


function checkRule(rule) {
    return checkRulesMap.get(rule.type)(rule);
}

function checkDomain(domain) {
    let valid = (/^d[0-9]+$/).test(domain.id);
    valid = valid && domain.matchUrl !== undefined;
    valid = valid && domain.on !== undefined;
    valid = valid && $.isArray(domain.rules);
    valid = valid && domain.rules.every(checkRule);
    return valid;
}

export function importData(data, version) {
    // check data first.
    if ($.isArray(data) && data.every(checkDomain)) {
        // this will call the sync function so stuff will get re-rendered.
        chrome.runtime.sendMessage({action: "import", data: data});
        showToast("Load Succeeded!");
    } else {
        showToast("Load Failed: Invalid Resource Override JSON.");
    }
}

export function exportData() {
    const allData = [];
    $(".domainContainer").each(function(idx, domain) {
        allData.push(getDomainData($(domain)));
    });
    return {v: 1, data: allData};
}
