/* globals chrome */
import { mainStorage } from "./mainStorage.js";
import { transformMatchReplace } from "./netRequestRules.js";

const simpleError = (err) => {
    if (err.stack) {
        console.error("=== Printing Stack ===");
        console.error(err.stack);
    }
    console.error(err);
};

let allRuleGroups = [];
const reloadData = () => {
    mainStorage.getAll().then(function(domains) {
        allRuleGroups = domains || [];
    }).catch(simpleError);
};
reloadData();


const actions = {
    sync: () => {
        reloadData();
    }
};

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    // console.log("BG ON MESSAGE!", request);
    let sentResponse = false;
    const mySendResponse = (...args) => {
        sentResponse = true;
        sendResponse(...args);
    };
    const action = actions[request.action];
    if (action) {
        await action(request, sender, mySendResponse);
        if (!sentResponse) {
            sendResponse();
        }
        // !!!Important!!! Need to return true for sendResponse to work.
        return true;
    }
    console.error(`BG message handler: No action named ${request.action}`);
});

chrome.action.onClicked.addListener(function() {
    // open or focus options page.
    const optionsUrl = chrome.runtime.getURL("src/devtoolstab.html");
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
    const result = transformMatchReplace(matchStr);
    let regex;
    try {
        regex = new RegExp(result.match);
    } catch {}
    return regex && regex.test(url);
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
                            target: { tabId: details.tabId, frameIds: [details.frameId] },
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
