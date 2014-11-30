(function() {
    "use strict";

    var lastRequestId;
    var ruleDomains = {};
    var syncFunctions = [];

    // http://stackoverflow.com/questions/15124995/how-to-wait-for-an-asynchronous-methods-callback-return-value
    var tabUrlTracker = (function() {
        // All opened urls
        var urls = {};
        var closeListeners = [];

        var queryTabsCallback = function(allTabs) {
            if (allTabs) {
                allTabs.forEach(function(tab) {
                    urls[tab.id] = tab.url;
                });
            }
        };

        var updateTabCallback = function(tabId, changeinfo, tab) {
            urls[tabId] = tab.url;
        };

        // Not all tabs will fire an update event. If the page is pre-rendered,
        // a replace will happen instead.
        var tabReplacedCallback = function(newTabId, oldTabId) {
            delete urls[oldTabId];
            chrome.tabs.get(newTabId, function(tab) {
                urls[tab.id] = tab.url;
            });
        };

        var removeTabCallback = function(tabId) {
            closeListeners.forEach(function(fn) {
                fn(urls[tabId]);
            });
            delete urls[tabId];
        };

        // init
        chrome.tabs.query({}, queryTabsCallback);
        chrome.tabs.onUpdated.addListener(updateTabCallback);
        chrome.tabs.onRemoved.addListener(removeTabCallback);
        chrome.tabs.onReplaced.addListener(tabReplacedCallback);

        return {
            getUrlFromId: function(id) {
                return urls[id];
            }
        };
    })();

    var domainStorage = (function() {
        var db = keyvalDB("OverrideDB", [{store: "domains", key:"id"}], 1);
        var domainStore = db.usingStore("domains");

        var put = function(domainData, cb) {
            cb = cb || function() {};
            db.open(function(err) {
                if (err) {
                    console.error(err);
                    cb(err);
                } else {
                    domainStore.upsert(domainData.id, domainData, function(err) {
                        if (err) {
                            console.error(err);
                            cb(err);
                        } else {
                            cb();
                        }
                    });
                }
            });
        };

        var getDomains = function(cb) {
            db.open(function(err) {
                if (err) {
                    console.error(err);
                } else {
                    domainStore.getAll(function(err, ans) {
                        if (err) {
                            console.error(err);
                        } else {
                            cb(ans);
                        }
                    });
                }
            });
        };

        var deleteDomain = function(id, cb) {
            cb = cb || function() {};
            db.open(function(err) {
                if (err) {
                    console.error(err);
                } else {
                    domainStore.delete(id, function(err) {
                        if (err) {
                            console.error(err);
                        } else {
                            cb();
                        }
                    });
                }
            });
        };

        return {
            put: put,
            getAll: getDomains,
            delete: deleteDomain
        };
    })();

    var openOrFocusOptionsPage = function() {
        var optionsUrl = chrome.extension.getURL("options.html");
        chrome.tabs.query({}, function(extensionTabs) {
            var found = false;
            for (var i = 0, len = extensionTabs.length; i < len; i++) {
                if (optionsUrl === extensionTabs[i].url) {
                    found = true;
                    chrome.tabs.update(extensionTabs[i].id, {"selected": true});
                    break;
                }
            }
            if (found === false) {
                chrome.tabs.create({url: "options.html"});
            }
        });
    };

    var syncAllInstances = function() {
        // Doing this weird dance because I cant figure out how to
        // send data from this script to the dev tools script.
        // Nothing seems to work (even the examples!).
        syncFunctions.forEach(function(fn) {
            try {
                fn();
            } catch(e) {}
        });
        syncFunctions = [];
    };

    var handleRequest = function(requestUrl, tabUrl) {
        for (var key in ruleDomains) {
            var domainObj = ruleDomains[key];
            if (domainObj.on && match(domainObj.matchUrl, tabUrl).matched) {
                var rules = domainObj.rules || [];
                for (var x = 0, len = rules.length; x < len; ++x) {
                    var ruleObj = rules[x];
                    if (ruleObj.on) {
                        if (ruleObj.type === "normalOverride") {
                            var newUrl = matchReplace(ruleObj.match, ruleObj.replace, requestUrl);
                            if (requestUrl !== newUrl) {
                                return {redirectUrl: newUrl};
                            }
                        } else if (ruleObj.type === "fileOverride" &&
                            match(ruleObj.match, requestUrl).matched) {

                            return {redirectUrl: "data:text/plain," +
                                encodeURIComponent(ruleObj.file)};
                        }
                    }
                }
            }
        }
    };

    // Called when the user clicks on the browser action icon.
    chrome.browserAction.onClicked.addListener(function(tab) {
        openOrFocusOptionsPage();
    });

    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "saveDomain") {
            domainStorage.put(request.data, syncAllInstances);
            ruleDomains[request.data.id] = request.data;
        } else if (request.action === "getDomains") {
            domainStorage.getAll(function(domains) {
                sendResponse(domains || []);
            });
        } else if (request.action === "deleteDomain") {
            domainStorage.delete(request.id, syncAllInstances);
            delete ruleDomains[request.id];
        } else if (request.action === "makeGetRequest") {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", request.url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    sendResponse(xhr.responseText);
                }
            };
            xhr.send();
        } else if (request.action === "setSetting") {
            localStorage[request.setting] = request.value;
        } else if (request.action === "getSetting") {
            sendResponse(localStorage[request.setting]);
        } else if(request.action === "syncMe") {
            syncFunctions.push(sendResponse);
        } else if(request.action === "match") {
            sendResponse(match(request.domainUrl, request.windowUrl).matched);
        }

        // !!!Important!!! Need to return true for sendResponse to work.
        return true;
    });

    chrome.webRequest.onBeforeRequest.addListener(function(details) {
        if (details.requestId !== lastRequestId) {
            lastRequestId = details.requestId;
            if (details.tabId > -1) {
                var tabUrl = tabUrlTracker.getUrlFromId(details.tabId);
                if (tabUrl) {
                    return handleRequest(details.url, tabUrl);
                }
            }
        }
    }, {
        urls: ["<all_urls>"]
    }, ["blocking"]);

    //init settings
    if (localStorage.devTools === undefined) {
        localStorage.devTools = "true";
    }

    // init domain storage
    domainStorage.getAll(function(domains) {
        if (domains) {
            domains.forEach(function(domainObj) {
                ruleDomains[domainObj.id] = domainObj;
            });
        }
    });

})(); // end script-wide closure
