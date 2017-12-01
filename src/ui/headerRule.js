(function() {
    "use strict";

    /* globals $ */

    const app = window.app;
    const util = app.util;
    const ui = app.ui;

    // This is what shows up *outside* the header editor.
    function createHeaderRuleMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        const override = util.instanceTemplate(ui.headerRuleTemplate);
        const matchInput = override.find(".matchInput");
        const requestRulesInput = override.find(".requestRules");
        const responseRulesInput = override.find(".responseRules");
        const editBtn = override.find(".edit-btn");
        const ruleOnOff = override.find(".onoffswitch");
        const deleteBtn = override.find(".sym-btn");

        matchInput.val(savedData.match || "");
        util.makeFieldRequired(matchInput);

        const updateHeaderInput = function(input, ruleStr) {
            input.val(decodeURIComponent(ruleStr.replace(/\;/g, "; ")));
            input.attr("title", decodeURIComponent(ruleStr.replace(/\;/g, "\n")));
            input.data("rules", ruleStr);
        };

        updateHeaderInput(requestRulesInput, savedData.requestRules || "");
        updateHeaderInput(responseRulesInput, savedData.responseRules || "");

        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            override.addClass("disabled");
        }

        const editorSaveFunc = function() {
            const rules = app.headerEditor.getRules();
            updateHeaderInput(requestRulesInput, rules.requestRules.join(";"));
            updateHeaderInput(responseRulesInput, rules.responseRules.join(";"));
            saveFunc();
        };

        const editFunc = function() {
            const reqStr = requestRulesInput.data("rules") || "";
            const resStr = responseRulesInput.data("rules") || "";
            app.headerEditor.open(reqStr, resStr, matchInput.val(), editorSaveFunc);
        };

        app.mainSuggest.init(matchInput);

        matchInput.on("keyup", saveFunc);

        override.on("click", function(e) {
            if ($(e.target).hasClass("headerRuleInput")) {
                editFunc();
            }
        });
        editBtn.on("click", editFunc);

        deleteBtn.on("click", function() {
            if (!util.deleteButtonIsSure(deleteBtn)) {
                return;
            }
            override.css("transition", "none");
            override.fadeOut(function() {
                override.remove();
                saveFunc();
            });
        });

        deleteBtn.on("mouseout", function() {
            util.deleteButtonIsSureReset(deleteBtn);
        });

        ruleOnOff.on("click change", function() {
            override.toggleClass("disabled", !ruleOnOff[0].isOn);
            saveFunc();
        });

        return override;
    }

    // This is a header rule that shows up *inside* the editor.
    function createHeaderEditorRuleMarkup(savedData, saveFunc, type) {
        savedData = savedData || {operation: "set"};
        saveFunc = saveFunc || function() {};

        const override = util.instanceTemplate(ui.headerEditorRuleTemplate);
        const operation = override.find(".operationSelect");
        const headerName = override.find(".headerName");
        const headerValue = override.find(".headerValue");
        const deleteBtn = override.find(".sym-btn");

        operation.val(savedData.operation);
        headerName.val(savedData.header);
        headerValue.val(savedData.value || "");

        if (savedData.operation === "remove") {
            headerValue[0].disabled = true;
        }

        operation.on("change", function() {
            if (operation.val() === "remove") {
                headerValue.val("");
                headerValue[0].disabled = true;
            } else {
                headerValue[0].disabled = false;
            }
            saveFunc();
        });
        headerName.on("keyup", saveFunc);
        headerValue.on("keyup", saveFunc);

        deleteBtn.on("click", function() {
            if (!util.deleteButtonIsSure(deleteBtn)) {
                return;
            }
            override.css("transition", "none");
            override.fadeOut(function() {
                override.remove();
                saveFunc();
            });
        });

        deleteBtn.on("mouseout", function() {
            util.deleteButtonIsSureReset(deleteBtn);
        });

        if (type === "request") {
            app.requestHeadersSuggest.init(headerName, false, true);
        } else {
            app.responseHeadersSuggest.init(headerName, false, true);
        }

        return override;
    }

    app.createHeaderRuleMarkup = createHeaderRuleMarkup;
    app.createHeaderEditorRuleMarkup = createHeaderEditorRuleMarkup;

})();
