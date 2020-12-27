"use strict";

/* globals $, chrome */

import {app, ui} from './init.js';
import {mainSuggest} from './devtoolstab.js';
import {createOnOffSwitch} from './onOffSwitch.js';


export function instanceTemplate(template) {
    // We have to fetch first child (the container element) because
    // document fragments are not supported by JQ
    const newDom = document.importNode(template.content, true).children[0];
    const switchDiv = newDom.querySelector(".switch");
    if (switchDiv) {
        switchDiv.appendChild(createOnOffSwitch());
    }
    return newDom;
};

export function deleteButtonIsSure(deleteBtn) {
    if (!deleteBtn.dataset["isSure"]) {
        deleteBtn.dataset["isSure"] = 1;
        deleteBtn.style.fontSize = "10px";
        deleteBtn.textContent = "Sure?";
        return false;
    }
    return true;
};

export function deleteButtonIsSureReset(deleteBtn) {
    deleteBtn.textContent = "\u00d7";
    deleteBtn.style.fontSize = "28px";
    deleteBtn.dataset["isSure"] = 0;
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
    [...jqResults].forEach(function(el) {
        const id = parseInt(el.id.substring(1), 10);
        if (!isNaN(id) && id > maxId) {
            maxId = id;
        }
    });
    return prefix.charAt(0) + (maxId + 1);
};

export function makeFieldRequired(input) {
    const checkRequiredField = function() {
        if (input.value === "") {
            input.style.background = "#faa";
        } else {
            input.style.background = "#fff";
        }
    };
    input.addEventListener("keyup", checkRequiredField);
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
    ui.generalToaststyle.display = "block";
    setTimeout(function() {
        ui.generalToast.style.display = "none";
    }, 3500);
};

export function isChrome() {
    return navigator.userAgent.indexOf("Chrome") > -1;
};

