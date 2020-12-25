/* global match, matchReplace, browser */

import {capabilities} from "./init.js"
import {ruleDomains} from "./background.js"
import {logOnTab} from "./util.js"
import {extractMimeType} from "./extractMime.js"
import {removeIntegrity} from "./removeIntegrity.js"

const replaceContent = (requestId, mimeAndFile) => {
    console.log("requestId, mimeAndFile", requestId, mimeAndFile);
    if (browser.webRequest.filterResponseData) {
        // browsers that support filterResponseData
        browser.webRequest.filterResponseData(requestId).onstart = e => {
            console.log("Replacing content", requestId);
            const encoder = new TextEncoder();
            e.target.write(encoder.encode(mimeAndFile.file));
            e.target.disconnect();
        };
        return {
            responseHeaders: [{
                name: "Content-Type",
                value: mimeAndFile.mime
            }]
        };
    }

    // browsers that dont support filterResponseData
    return {
        // unescape is a easy solution to the utf-8 problem:
        // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa#Unicode_Strings
        redirectUrl: "data:" + mimeAndFile.mime + ";charset=UTF-8;base64," +
            btoa(unescape(encodeURIComponent(mimeAndFile.file)))
    };
};

function walkRules(details, tabUrl, callback){
    console.log("walkRules details, tabUrl", details, tabUrl);
    for (const key in ruleDomains) {
        const domainObj = ruleDomains[key];
        if (domainObj.on && match(domainObj.matchUrl, tabUrl).matched) {
            const rules = domainObj.rules || [];
            for (let x = 0, len = rules.length; x < len; ++x) {
                const ruleObj = rules[x];
                if (ruleObj.on) {
                    return callback(ruleObj, details);
                }
            }
            logOnTab(details.tabId, "No override match for: " + details.url);
        } else {
            logOnTab(details.tabId, "Rule is off or tab URL does not match: " + domainObj.matchUrl);
        }
    }
}

function bodyCallback(ruleObj, details){
    if (ruleObj.type === "removeIntegrity" && match(ruleObj.match, details.url).matched) {
        return removeIntegrity(details);
    }
}

export function handleBody(details, tabUrl) {
    walkRules(details, tabUrl, bodyCallback);
}

function headersCallback(ruleObj, details){
    console.log("headersCallback ruleObj, details", ruleObj, details);
    const requestUrl = details.url, tabId = details.tabId;
    if (ruleObj.type === "normalOverride") {
        const matchedObj = match(ruleObj.match, requestUrl);
        const newUrl = matchReplace(matchedObj, ruleObj.replace, requestUrl);
        if (matchedObj.matched) {
            logOnTab(tabId, "URL Override Matched: " + requestUrl +
                "   to:   " + newUrl + "   match url: " + ruleObj.match, true);
            if (requestUrl !== newUrl) {
                return {redirectUrl: newUrl};
            } else {
                // allow redirections to the original url (aka do nothing).
                // This allows for "redirect all of these except this."
                return;
            }
        }
    } else if (ruleObj.type === "fileOverride" &&
        match(ruleObj.match, requestUrl).matched) {

        logOnTab(tabId, "File Override Matched: " + requestUrl + "   match url: " +
            ruleObj.match, true);

        const mimeAndFile = extractMimeType(requestUrl, ruleObj.file);
        return replaceContent(details.requestId, mimeAndFile);
    } else if (ruleObj.type === "removeIntegrity" && match(ruleObj.match, requestUrl).matched) {
        removeIntegrity(details);
    }
}

export function handleRequest(details, tabUrl) {
    walkRules(details, tabUrl, headersCallback);
};
