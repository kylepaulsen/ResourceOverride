/* globals chrome, unescape, match */
import {capabilities} from "./init.js"
import {simpleError} from "./util.js"
import {extractMimeType} from "./extractMime.js"
import {mainStorage} from "./mainStorage.js"
import {requestIdTracker} from "./requestIdTracker.js"
import {tabUrlTracker} from "./tabUrlTracker.js"
import {handleRequest} from "./requestHandling.js"
import {makeHeaderHandler} from "./headerHandling.js"

export let ruleDomains = {};
export let syncFunctions = [];

// Called when the user clicks on the browser action icon.
chrome.browserAction.onClicked.addListener(function() {
    // open or focus options page.
    const optionsUrl = chrome.runtime.getURL("src/ui/devtoolstab.html");
    chrome.tabs.query({}, function(extensionTabs) {
        let found = false;
        for (let i = 0, len = extensionTabs.length; i < len; i++) {
            if (optionsUrl === extensionTabs[i].url) {
                found = true;
                chrome.tabs.update(extensionTabs[i].id, {selected: true});
                break;
            }
        }
        if (found === false) {
            chrome.tabs.create({url: optionsUrl});
        }
    });
});

const syncAllInstances = function() {
    // Doing this weird dance because I cant figure out how to
    // send data from this script to the dev tools script.
    // Nothing seems to work (even the examples!).
    syncFunctions.forEach(function(fn) {
        try {
            fn();
        } catch (e) { /**/ }
    });
    syncFunctions = [];
};

const messageEventsProcessors = new Map([
    ["saveDomain", (request, sender) => {
        mainStorage.put(request.data)
            .then(syncAllInstances)
            .catch(simpleError);
        ruleDomains[request.data.id] = request.data;
    }],
    ["getDomains", (request, sender) => {
        return mainStorage.getAll().then(function(domains) {
            return domains || [];
        });
    }],
    ["deleteDomain", (request, sender) => {
        mainStorage.delete(request.id)
            .then(syncAllInstances)
            .catch(simpleError);
        delete ruleDomains[request.id];
    }],
    ["import", (request, sender) => {
        let maxId = 0;
        for (const id in ruleDomains) {
            maxId = Math.max(maxId, parseInt(id.substring(1)));
        }
        maxId++;
        Promise.all(request.data.map(function(domainData) {
            // dont overwrite any pre-existing domains.
            domainData.id = "d" + maxId++;
            ruleDomains[domainData.id] = domainData;
            return mainStorage.put(domainData);
        }))
        .then(syncAllInstances)
        .catch(simpleError);
    }],
    ["makeGetRequest", (request, sender) => {
        return fetch(request.url, {"headers": {"Origin": null}, "referrer": "no-referrer"}).then(e=>e.text());
    }],
    ["setSetting", (request, sender) => {
        localStorage[request.setting] = request.value;
    }],
    ["getSetting", (request, sender) => {
        return Promise.resolve(localStorage[request.setting]);
    }],
    ["syncMe", (request, sender) => {
        return new Promise((resolve, reject) => {
            syncFunctions.push(resolve);
        });
    }],
    ["match", (request, sender) => {
        return Promise.resolve(match(request.domainUrl, request.windowUrl).matched);
    }],
    ["extractMimeType", (request, sender) => {
        return Promise.resolve(extractMimeType(request.fileName, request.file));
    }],
    ["getCapabilities", () => {return Promise.resolve(capabilities);}],
]);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    return messageEventsProcessors.get(request.action)(request, sender);
});


function processOnlyTabTrackedURIs(details, callback){
    if (details.tabId > -1) {
        let tabUrl = tabUrlTracker.getUrlFromId(details.tabId);
        if (details.type === "main_frame") {
            // a new tab must have just been created.
            tabUrl = details.url;
        }
        if (tabUrl) {
            return callback(details, tabUrl);
        }
    }
}


chrome.webRequest.onBeforeRequest.addListener(function(details) {
    processOnlyTabTrackedURIs(details, (details, tabUrl) => {
        if (!requestIdTracker.has(details.requestId)) {
            const result = handleRequest(details, tabUrl);
            if (result) {
                // make sure we don't try to redirect again.
                requestIdTracker.push(details.requestId);
            }
            return result;
        }
    });
}, {
    urls: ["<all_urls>"]
}, ["blocking"]);

const responseHeadersHandler = makeHeaderHandler("response");
chrome.webRequest.onHeadersReceived.addListener((details) => {
    responseHeadersHandler(details);
    //processOnlyTabTrackedURIs(details, handleBody);
    handleBody(details, tabUrlTracker.getUrlFromId(details.tabId));
}, {
    urls: ["<all_urls>"]
}, ["blocking", "responseHeaders"]);

chrome.webRequest.onBeforeSendHeaders.addListener(makeHeaderHandler("request"), {
    urls: ["<all_urls>"]
}, ["blocking", "requestHeaders"]);

//init settings
if (localStorage.devTools === undefined) {
    localStorage.devTools = "true";
}
if (localStorage.showSuggestions === undefined) {
    localStorage.showSuggestions = "true";
}
if (localStorage.showLogs === undefined) {
    localStorage.showLogs = "false";
}

// init domain storage
mainStorage.getAll().then(function(domains) {
    if (domains) {
        domains.forEach(function(domainObj) {
            ruleDomains[domainObj.id] = domainObj;
        });
    }
}).catch(simpleError);

