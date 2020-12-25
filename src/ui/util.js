"use strict";

/* globals $, chrome */

import {app, ui} from './init.js';
import {mainSuggest} from './devtoolstab.js';
import {createOnOffSwitch} from './onOffSwitch.js';


export function instanceTemplate(template) {
    // We have to fetch first child (the container element) because
    // document fragments are not supported by JQ
    const newDom = document.importNode(template[0].content, true).children[0];
    const switchDiv = newDom.querySelector(".switch");
    if (switchDiv) {
        switchDiv.appendChild(createOnOffSwitch());
    }
    return $(newDom);
};

export function deleteButtonIsSure(deleteBtn) {
    if (!deleteBtn.data("isSure")) {
        deleteBtn.data("isSure", 1);
        deleteBtn.css("font-size", "10px");
        deleteBtn.text("Sure?");
        return false;
    }
    return true;
};

export function deleteButtonIsSureReset(deleteBtn) {
    deleteBtn.text("\u00d7");
    deleteBtn.css("font-size", "28px");
    deleteBtn.data("isSure", 0);
};

export function debounce(fn, amt) {
    let timeout;
    return function() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(fn, amt);
    };
};

export function getNextId(jqResults, prefix) {
    let maxId = 0;
    jqResults.each(function(idx, el) {
        const id = parseInt(el.id.substring(1), 10);
        if (!isNaN(id) && id > maxId) {
            maxId = id;
        }
    });
    return prefix.charAt(0) + (maxId + 1);
};

export function makeFieldRequired(input) {
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

export function shortenString(str, limit) {
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

export function getTabResources(cb) {
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
        mainSuggest.setShouldSuggest(false);
    }
};

export function showToast(message) {
    ui.generalToast.html(message);
    ui.generalToast.fadeIn();
    setTimeout(function() {
        ui.generalToast.fadeOut();
    }, 3500);
};

export function isChrome() {
    return navigator.userAgent.indexOf("Chrome") > -1;
};

