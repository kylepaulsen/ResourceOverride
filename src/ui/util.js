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
        return function() {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(fn, amt);
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

    app.util = util;
})();
