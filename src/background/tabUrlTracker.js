/* globals chrome, bgapp */
{
    // http://stackoverflow.com/questions/15124995/how-to-wait-for-an-asynchronous-methods-callback-return-value
    bgapp.tabUrlTracker = (function() {
        // All opened urls
        const urls = {};
        const closeListeners = [];

        const queryTabsCallback = function(allTabs) {
            if (allTabs) {
                allTabs.forEach(function(tab) {
                    urls[tab.id] = tab.url;
                });
            }
        };

        const updateTabCallback = function(tabId, changeinfo, tab) {
            urls[tabId] = tab.url;
        };

        // Not all tabs will fire an update event. If the page is pre-rendered,
        // a replace will happen instead.
        const tabReplacedCallback = function(newTabId, oldTabId) {
            delete urls[oldTabId];
            chrome.tabs.get(newTabId, function(tab) {
                urls[tab.id] = tab.url;
            });
        };

        const removeTabCallback = function(tabId) {
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
}
