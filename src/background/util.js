"use strict";

/* global chrome */
export let logOnTab = function(tabId, message, important) {
    if (localStorage.showLogs === "true") {
        important = !!important;
        chrome.tabs.sendMessage(tabId, {
            action: "log",
            message: message,
            important: important
        });
    }
};

export let simpleError = function(err) {
    if (err.stack) {
        console.error("=== Printing Stack ===");
        console.error(err.stack);
    }
    console.error(err);
};
