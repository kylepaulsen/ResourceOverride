/* globals chrome */
import mainStorage from "./mainStorage.js";

const simpleError = (err) => {
    if (err.stack) {
        console.error("=== Printing Stack ===");
        console.error(err.stack);
    }
    console.error(err);
};

let allRuleGroups = [];
mainStorage.getAll().then(function(domains) {
    allRuleGroups = domains || [];
}).catch(simpleError);


const actions = {
    getStorage: (request, sender, sendResponse) => {
        mainStorage.getAll().then(function(domains) {
            allRuleGroups = domains || [];
            sendResponse(allRuleGroups);
        }).catch(simpleError);
        // !!!Important!!! Need to return true for sendResponse to work.
        return true;
    },
    sync: () => {
        mainStorage.getAll().then(function(domains) {
            allRuleGroups = domains || [];
        }).catch(simpleError);
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("BG ON MESSAGE!", request);
    const action = actions[request.action];
    if (action) {
        return action(request, sender, sendResponse);
    }
    console.error(`BG message handler: No action named ${request.action}`);
});

chrome.action.onClicked.addListener(function() {
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

console.log("hi bg9");

// eslint-disable-next-line no-unused-vars
const urlMatches = (matchStr, url) => {
    // TODO: complete this. Also add a "match" property to inject rules.
    return true;
};

// TODO: This code will probably get me denied
chrome.webNavigation.onCommitted.addListener((details) => {
    allRuleGroups.forEach((ruleGroup) => {
        if (ruleGroup.on) {
            const rules = ruleGroup.rules || [];
            rules.forEach((rule) => {
                if (rule.on && rule.type === "fileInject" && urlMatches(rule.match, details.url)) {
                    if (rule.fileType === "js") {
                        chrome.scripting.executeScript({
                            target: { tabId: details.tabId },
                            // injectImmediately: true,
                            func: code => {
                                const el = document.createElement('script');
                                el.textContent = code;
                                document.head.appendChild(el);
                                el.remove();
                            },
                            args: [rule.file],
                            world: 'MAIN',
                        });
                    } else if (rule.fileType === 'css') {
                        chrome.scripting.insertCSS({
                            target: { tabId: details.tabId },
                            css: rule.file,
                            origin: "USER"
                        });
                    }
                }
            });
        }
    });
});
