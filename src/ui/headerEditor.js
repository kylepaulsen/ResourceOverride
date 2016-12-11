(function() {
    "use strict";

    /* globals $ */

    const app = window.app;
    const ui = app.ui;

    let saveFunc;

    function getRule(el) {
        const $el = $(el);
        const operation = $el.find(".operationSelect").val();
        const headerName = encodeURIComponent($el.find(".headerName").val());
        const headerValue = encodeURIComponent($el.find(".headerValue").val());
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

    function getHeaderEditRules() {
        const reqRules = [];
        const resRules = [];
        const $requestRules = ui.headerRequestRulesContainer.find(".headerEditorRule");
        const $responseRules = ui.headerResponseRulesContainer.find(".headerEditorRule");

        $requestRules.each(function(idx, el) {
            const rule = getRule(el);
            if (rule) {
                reqRules.push(rule);
            }
        });
        $responseRules.each(function(idx, el) {
            const rule = getRule(el);
            if (rule) {
                resRules.push(rule);
            }
        });
        return {
            requestRules: reqRules,
            responseRules: resRules
        };
    }

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

    function openHeaderEditor(requestHeaderDataStr, responseHeaderDataStr, matchRule, saveFunction) {
        saveFunc = saveFunction;
        const requestHeadersData = parseHeaderDataStr(requestHeaderDataStr);
        const responseHeadersData = parseHeaderDataStr(responseHeaderDataStr);
        ui.headerRequestRulesContainer.html("");
        ui.headerResponseRulesContainer.html("");
        requestHeadersData.forEach(function(data) {
            ui.headerRequestRulesContainer.append(app.createHeaderEditorRuleMarkup(data, saveFunc, "request"));
        });
        responseHeadersData.forEach(function(data) {
            ui.headerResponseRulesContainer.append(app.createHeaderEditorRuleMarkup(data, saveFunc, "response"));
        });
        ui.headerMatchContainer.text(matchRule || "<Not defined yet>");
        ui.headerRuleOverlay.css("display", "flex");
        ui.body.css("overflow", "hidden");
    }

    ui.closeHeaderRuleEditorBtn.on("click", function() {
        ui.headerRuleOverlay.hide();
        ui.body.css("overflow", "auto");
    });

    ui.addRequestHeaderBtn.on("click", function() {
        ui.headerRequestRulesContainer.append(app.createHeaderEditorRuleMarkup(undefined, saveFunc, "request"));
    });

    ui.addResponseHeaderBtn.on("click", function() {
        ui.headerResponseRulesContainer.append(app.createHeaderEditorRuleMarkup(undefined, saveFunc, "response"));
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

    ui.headerPresetsSelect.on("change", function() {
        const presetName = ui.headerPresetsSelect.val();
        const presets = resPresets[presetName];
        ui.headerPresetsSelect.val("");
        if (presets) {
            // Right now only response presets are allowed.
            presets.forEach(function(preset) {
                const markup = app.createHeaderEditorRuleMarkup(preset, saveFunc, "response");
                ui.headerResponseRulesContainer.append(markup);
            });
            saveFunc();
        }
    });

    app.headerEditor = {
        open: openHeaderEditor,
        getRules: getHeaderEditRules
    };

})();
