import { requestHeadersSuggest, responseHeadersSuggest } from "./suggest.js";
import {
    getUiElements,
    instanceTemplate,
    deleteButtonIsSure,
    deleteButtonIsSureReset,
    fadeOut
} from "./util.js";

// const app = window.app;
const ui = getUiElements(document);

let saveFunc;

const headerEditorRuleTemplate = document.getElementById("headerEditorRuleTemplate");
// This is a header rule that shows up *inside* the editor.
export const createHeaderEditorRuleMarkup = (savedData, saveFunc, type) => {
    savedData = savedData || {operation: "set"};
    saveFunc = saveFunc || (() => {});

    const override = instanceTemplate(headerEditorRuleTemplate);
    const operation = override.querySelector(".operationSelect");
    const headerName = override.querySelector(".headerName");
    const headerValue = override.querySelector(".headerValue");
    const deleteBtn = override.querySelector(".sym-btn");

    operation.value = savedData.operation;
    headerName.value = savedData.header || "";
    headerValue.value = savedData.value || "";

    if (savedData.operation === "remove") {
        headerValue.disabled = true;
    }

    operation.addEventListener("change", () => {
        if (operation.value === "remove") {
            headerValue.value = "";
            headerValue.disabled = true;
        } else {
            headerValue.disabled = false;
        }
        saveFunc();
    });
    headerName.addEventListener("keyup", saveFunc);
    headerValue.addEventListener("keyup", saveFunc);

    deleteBtn.addEventListener("click", () => {
        if (!deleteButtonIsSure(deleteBtn)) {
            return;
        }
        override.style.transition = "none";
        fadeOut(override);
        setTimeout(() => {
            override.remove();
            saveFunc();
        }, 300);
    });

    deleteBtn.addEventListener("mouseout", () => {
        deleteButtonIsSureReset(deleteBtn);
    });

    if (type === "request") {
        requestHeadersSuggest.init(headerName, false, true);
    } else {
        responseHeadersSuggest.init(headerName, false, true);
    }

    return override;
};


function getRule(el) {
    const operation = el.querySelector(".operationSelect").value;
    const headerName = encodeURIComponent(el.querySelector(".headerName").value);
    const headerValue = encodeURIComponent(el.querySelector(".headerValue").value);
    let nextRule;
    if (headerName) {
        if (operation === "set") {
            nextRule = "set ";
            nextRule += headerName + ": ";
            nextRule += headerValue;
        } else {
            nextRule = "remove ";
            nextRule += headerName;
        }
    }
    return nextRule;
}

export const getHeaderEditRules = () => {
    const reqRules = [];
    const resRules = [];
    const requestRules = ui.headerRequestRulesContainer.querySelectorAll(".headerEditorRule");
    const responseRules = ui.headerResponseRulesContainer.querySelectorAll(".headerEditorRule");

    requestRules.forEach((el) => {
        const rule = getRule(el);
        if (rule) {
            reqRules.push(rule);
        }
    });
    responseRules.forEach((el) => {
        const rule = getRule(el);
        if (rule) {
            resRules.push(rule);
        }
    });
    return {
        requestRules: reqRules,
        responseRules: resRules
    };
};

function parseHeaderDataStr(headerDataStr) {
    const ans = [];
    const rules = headerDataStr.split(";");
    rules.forEach(function(rule) {
        const ruleParts = rule.split(": ");
        if (ruleParts[0].indexOf("set") === 0) {
            if (ruleParts.length === 2) {
                ans.push({
                    operation: "set",
                    header: decodeURIComponent(ruleParts[0].substring(4)),
                    value: decodeURIComponent(ruleParts[1])
                });
            }
        } else if (ruleParts[0].indexOf("remove") === 0) {
            ans.push({
                operation: "remove",
                header: decodeURIComponent(ruleParts[0].substring(7))
            });
        }
    });
    return ans;
}

export const openHeaderEditor = (requestHeaderDataStr, responseHeaderDataStr, matchRule, saveFunction) => {
    saveFunc = saveFunction;
    const requestHeadersData = parseHeaderDataStr(requestHeaderDataStr);
    const responseHeadersData = parseHeaderDataStr(responseHeaderDataStr);
    ui.headerRequestRulesContainer.innerHTML = "";
    ui.headerResponseRulesContainer.innerHTML = "";
    requestHeadersData.forEach((data) => {
        ui.headerRequestRulesContainer.appendChild(createHeaderEditorRuleMarkup(data, saveFunc, "request"));
    });
    responseHeadersData.forEach((data) => {
        ui.headerResponseRulesContainer.appendChild(createHeaderEditorRuleMarkup(data, saveFunc, "response"));
    });
    ui.headerMatchContainer.textContent = matchRule || "<Not defined yet>";
    ui.headerRuleOverlay.style.display = "flex";
    ui.body.style.overflow = "hidden";
};

ui.closeHeaderRuleEditorBtn.addEventListener("click", () => {
    ui.headerRuleOverlay.style.display = "none";
    ui.body.style.overflow = "auto";
});

ui.addRequestHeaderBtn.addEventListener("click", () => {
    ui.headerRequestRulesContainer.appendChild(createHeaderEditorRuleMarkup(undefined, saveFunc, "request"));
});

ui.addResponseHeaderBtn.addEventListener("click", () => {
    ui.headerResponseRulesContainer.appendChild(createHeaderEditorRuleMarkup(undefined, saveFunc, "response"));
});

const resPresets = {
    cors: [{
        operation: "set",
        header: "Access-Control-Allow-Origin",
        value: "*"
    }],
    noInline: [{
        operation: "set",
        header: "Content-Security-Policy",
        value: "script-src * 'nonce-ResourceOverride'"
    }],
    allowFrames: [{
        operation: "remove",
        header: "X-Frame-Options"
    }],
    allowContent: [{
        operation: "remove",
        header: "Content-Security-Policy"
    }, {
        operation: "remove",
        header: "X-Content-Security-Policy"
    }]
};

ui.headerPresetsSelect.addEventListener("change", () => {
    const presetName = ui.headerPresetsSelect.value;
    const presets = resPresets[presetName];
    ui.headerPresetsSelect.value = "";
    if (presets) {
        // Right now only response presets are allowed.
        presets.forEach((preset) => {
            const markup = createHeaderEditorRuleMarkup(preset, saveFunc, "response");
            ui.headerResponseRulesContainer.appendChild(markup);
        });
        saveFunc();
    }
});
