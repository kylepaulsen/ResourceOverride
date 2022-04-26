(function() {
    "use strict";

    /* globals $, chrome */

    const app = window.app;
    const ui = app.ui;
    const util = {};

    util.instanceTemplate = function(template) {
        // We have to fetch first child (the container element) because
        // document fragments are not supported by JQ
        const newDom = document.importNode(template[0].content, true).children[0];
        const switchDiv = newDom.querySelector(".switch");
        if (switchDiv) {
            switchDiv.appendChild(app.createOnOffSwitch());
        }
        return $(newDom);
    };

    util.deleteButtonIsSure = function(deleteBtn) {
        if (!deleteBtn.data("isSure")) {
            deleteBtn.data("isSure", 1);
            deleteBtn.css("font-size", "10px");
            deleteBtn.text("Sure?");
            return false;
        }
        return true;
    };

    util.deleteButtonIsSureReset = function(deleteBtn) {
        deleteBtn.text("\u00d7");
        deleteBtn.css("font-size", "28px");
        deleteBtn.data("isSure", 0);
    };

    util.debounce = function(fn, amt) {
        let timeout;
        return (...args) => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => fn(...args), amt);
        };
    };

    util.getNextId = function(jqResults, prefix) {
        let maxId = 0;
        jqResults.each(function(idx, el) {
            const id = parseInt(el.id.substring(1), 10);
            if (!isNaN(id) && id > maxId) {
                maxId = id;
            }
        });
        return prefix.charAt(0) + (maxId + 1);
    };

    util.getNextFileId = function(jqResults) {
        let maxId = 0;
        jqResults.each(function(idx, el) {
            const id = parseInt((el.dataset.fileId || "").substring(1), 10);
            if (!isNaN(id) && id > maxId) {
                maxId = id;
            }
        });
        return 'f' + (maxId + 1);
    };

    util.parseRuleId = (ruleId) => {
        if (ruleId.substring) {
            return parseInt(ruleId.substring(1));
        }
        return ruleId;
    };

    util.getNextRuleId = (ruleGroups) => {
        let maxId = 0;
        ruleGroups.forEach(group => {
            group.rules.forEach(rule => {
                maxId = Math.max(rule.id || 0, maxId);
            });
        });
        return maxId + 1;
    };

    util.makeFieldRequired = function(input) {
        const checkRequiredField = function() {
            if (input.val() === "") {
                input.css("background", "#ffaaaa");
            } else {
                input.css("background", "#ffffff");
            }
        };
        input.on("keyup", checkRequiredField);
        checkRequiredField();
    };

    util.shortenString = function(str, limit) {
        const over = str.length - limit;
        if (over > 0) {
            const halfPos = str.length / 2;
            const firstOffset = Math.floor(over / 2 + 2);
            const secondOffset = Math.ceil(over / 2 + 3);
            return str.substring(0, halfPos - firstOffset) + " ... " +
                str.substring(halfPos + secondOffset);
        }
        return str;
    };

    util.getTabResources = function(cb) {
        if (chrome.devtools && chrome.devtools.inspectedWindow && chrome.devtools.inspectedWindow.getResources) {
            chrome.devtools.inspectedWindow.getResources(function(resourceList) {
                if (resourceList) {
                    const filteredList = resourceList.filter(function(resource) {
                        const url = resource.url.trim();
                        if (url) {
                            const validStart = (/^http/).test(url);
                            const invalidFormat = (/\.jpg$|\.jpeg$|\.gif$|\.png$/).test(url);
                            return validStart && !invalidFormat;
                        }
                        return false;
                    }).map(function(resource) {
                        return resource.url;
                    });
                    cb(filteredList.sort());
                }
            });
        } else {
            app.mainSuggest.setShouldSuggest(false);
        }
    };

    util.showToast = function(message) {
        ui.generalToast.html(message);
        ui.generalToast.fadeIn();
        setTimeout(function() {
            ui.generalToast.fadeOut();
        }, 3500);
    };

    util.isChrome = function() {
        return navigator.userAgent.indexOf("Chrome") > -1;
    };

    util.parseHeaderDataStr = function(headerDataStr) {
        const ans = [];
        const rules = headerDataStr.split(";");
        const len = rules.length;
        for (let x = 0; x < len; x++) {
            const rule = rules[x];
            const ruleParts = rule.split(": ");
            if (ruleParts[0].indexOf("set") === 0) {
                if (ruleParts.length === 2) {
                    ans.push({
                        operation: "set",
                        header: decodeURIComponent(ruleParts[0].substring(4)).toLowerCase(),
                        value: decodeURIComponent(ruleParts[1])
                    });
                }
            } else if (ruleParts[0].indexOf("remove") === 0) {
                ans.push({
                    operation: "remove",
                    header: decodeURIComponent(ruleParts[0].substring(7)).toLowerCase()
                });
            }
        }
        return ans;
    };

    util.simpleError = function(err) {
        if (err.stack) {
            console.error("=== Printing Stack ===");
            console.error(err.stack);
        }
        console.error(err);
    };

    util.debug = (message) => {
        const debugDiv = document.getElementById("debug");
        const log = document.createElement("div");
        log.className = "debugLog";
        const timeArr = new Date().toString().split(" ");
        timeArr.shift();
        const time = timeArr.slice(0, 4).join(" ");
        log.textContent = `[${time}] ${message}`;
        debugDiv.appendChild(log);
    };

    app.util = util;
})();
