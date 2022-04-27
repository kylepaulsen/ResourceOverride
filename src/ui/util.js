/* globals chrome */
import createOnOffSwitch from "./onOffSwitch.js";


export const getUiElements = (parentElement) => {
    const ui = {};
    parentElement.querySelectorAll('[id]').forEach((item) => {
        ui[item.id] = item;
    });
    return ui;
};

export const instanceTemplate = (template) => {
    const newDom = document.importNode(template.content, true).children[0];
    const switchDiv = newDom.querySelector(".switch");
    if (switchDiv) {
        switchDiv.appendChild(createOnOffSwitch());
    }
    return newDom;
};

export const createEl = (tagWithClasses, attrs = {}) => {
    const tagParts = tagWithClasses.split(".");
    const tagName = tagParts.shift();
    const newEl = document.createElement(tagName);
    if (tagParts.length) {
        newEl.className = tagParts.join(" ");
    }
    Object.keys(attrs).forEach(attr => {
        newEl.setAttribute(attr, attrs[attr]);
    });
    return newEl;
};

export const deleteButtonIsSure = (deleteBtn) => {
    if (!deleteBtn.dataset.isSure) {
        deleteBtn.dataset.isSure = 1;
        deleteBtn.style.fontSize = "10px";
        deleteBtn.textContent = "Sure?";
        return false;
    }
    return true;
};

export const deleteButtonIsSureReset = (deleteBtn) => {
    deleteBtn.textContent = "\u00d7";
    deleteBtn.style.fontSize = "28px";
    delete deleteBtn.dataset.isSure;
};

export const debounce = (fn, amt) => {
    let timeout;
    return (...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => fn(...args), amt);
    };
};

export const getNextId = (nodeList, prefix) => {
    let maxId = 0;
    nodeList.forEach((el) => {
        const id = parseInt(el.id.substring(1), 10);
        if (!isNaN(id) && id > maxId) {
            maxId = id;
        }
    });
    return prefix.charAt(0) + (maxId + 1);
};

export const getNextFileId = (nodeList) => {
    let maxId = 0;
    nodeList.forEach((el) => {
        const id = parseInt((el.dataset.fileId || "").substring(1), 10);
        if (!isNaN(id) && id > maxId) {
            maxId = id;
        }
    });
    return 'f' + (maxId + 1);
};

export const parseRuleId = (ruleId) => {
    if (ruleId.substring) {
        return parseInt(ruleId.substring(1));
    }
    return ruleId;
};

export const getNextRuleId = (ruleGroups) => {
    let maxId = 0;
    ruleGroups.forEach(group => {
        const rules = group.rules || [];
        rules.forEach(rule => {
            maxId = Math.max(rule.id || 0, maxId);
        });
    });
    return maxId + 1;
};

export const makeFieldRequired = (input) => {
    const checkRequiredField = () => {
        if (input.value === "") {
            input.style.background = "#faa";
        } else {
            input.style.background = "#fff";
        }
    };
    input.addEventListener("input", checkRequiredField);
    checkRequiredField();
};

export const shortenString = (str, limit) => {
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

export const getTabResources = (cb) => {
    if (chrome.devtools && chrome.devtools.inspectedWindow && chrome.devtools.inspectedWindow.getResources) {
        chrome.devtools.inspectedWindow.getResources((resourceList) => {
            if (resourceList) {
                const filteredList = resourceList.filter((resource) => {
                    const url = resource.url.trim();
                    if (url) {
                        const validStart = (/^http/).test(url);
                        const invalidFormat = (/\.jpg$|\.jpeg$|\.gif$|\.png$/).test(url);
                        return validStart && !invalidFormat;
                    }
                    return false;
                }).map((resource) => {
                    return resource.url;
                });
                cb(filteredList.sort());
            }
        });
        return true;
    }
    return false;
};

export const fadeOut = (el, opts = {}) => {
    const duration = opts.duration || "0.3s";
    el.style.transition = `opacity ${duration}`;
    el.setAttribute("tabindex", "-1");
    el.classList.add("fadeOut");
};

export const fadeIn = (el, opts = {}) => {
    const duration = opts.duration || "0.3s";
    el.style.transition = `opacity ${duration}`;
    el.removeAttribute("tabindex");
    el.classList.remove("fadeOut");
};

export const toggleFade = (el, opts = {}) => {
    if (el.classList.contains("fadeOut")) {
        fadeIn(el, opts);
    } else {
        fadeOut(el, opts);
    }
};

export const showToast = (message) => {
    const generalToast = document.querySelector("#generalToast");
    generalToast.innerHTML = message;
    fadeIn(generalToast);
    setTimeout(() => {
        fadeOut(generalToast);
    }, 3500);
};

export const isChrome = () => navigator.userAgent.indexOf("Chrome") > -1;

export const parseHeaderDataStr = (headerDataStr) => {
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

export const sendSyncMessage = () => chrome.runtime.sendMessage({ action: "sync" });

export const simpleError = (err) => {
    if (err.stack) {
        console.error("=== Printing Stack ===");
        console.error(err.stack);
    }
    console.error(err);
};

export const debug = (message) => {
    const debugDiv = document.getElementById("debug");
    const log = document.createElement("div");
    log.className = "debugLog";
    const timeArr = new Date().toString().split(" ");
    timeArr.shift();
    const time = timeArr.slice(0, 4).join(" ");
    log.textContent = `[${time}] ${message}`;
    debugDiv.appendChild(log);
};

