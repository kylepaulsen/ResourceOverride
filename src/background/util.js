/* global bgapp, chrome */
{
    bgapp.util = {};

    bgapp.util.logOnTab = function(tabId, message, important) {
        if (localStorage.showLogs === "true") {
            important = !!important;
            chrome.tabs.sendMessage(tabId, {
                action: "log",
                message: message,
                important: important
            });
        }
    };

    bgapp.util.simpleError = function(err) {
        if (err.stack) {
            console.error("=== Printing Stack ===");
            console.error(err.stack);
        }
        console.error(err);
    };
}
