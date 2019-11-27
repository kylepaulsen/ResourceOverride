(function() {
    "use strict";

    /* globals $, chrome */

    const app = window.app;
    const util = app.util;
    const ui = app.ui;

    let currentAddRuleBtn;
    let currentAddRuleFunc;
    let currentSaveFunc;

    function positionRuleDropdown(addBtn) {
        const offset = addBtn.offset();
        ui.addRuleDropdown.css({
            top: offset.top + 40 + "px",
            left: offset.left - 40 + "px"
        });

        const rect = ui.addRuleDropdown[0].getBoundingClientRect();
        if (rect.top + rect.height > window.innerHeight && offset.top - rect.height > 0) {
            ui.addRuleDropdown.css({
                top: offset.top - rect.height + "px",
                left: offset.left - 40 + "px"
            });
            ui.addRuleDropdown.addClass("reverse");
        } else {
            ui.addRuleDropdown.removeClass("reverse");
        }
    }

    function showRuleDropdown(addBtn, addRuleFunc, saveFunc) {
        if (ui.addRuleDropdown.is(":visible") && currentAddRuleFunc === addRuleFunc) {
            ui.addRuleDropdown.hide();
        } else {
            currentAddRuleBtn = addBtn;
            currentAddRuleFunc = addRuleFunc;
            currentSaveFunc = saveFunc;
            ui.addRuleDropdown.show();
            positionRuleDropdown(addBtn);
        }
    }

    function createSaveFunction(id) {
        return function() {
            const $domain = $("#" + id);
            const data = app.getDomainData($domain);
            chrome.runtime.sendMessage({action: "saveDomain", data: data});
            app.skipNextSync = true;
        };
    }

    function getDomainData(domain) {
        const rules = [];
        domain.find(".ruleContainer").each(function(idx, el) {
            const $el = $(el);
            if ($el.hasClass("normalOverride")) {
                rules.push({
                    type: "normalOverride",
                    match: $el.find(".matchInput").val(),
                    replace: $el.find(".replaceInput").val(),
                    on: $el.find(".onoffswitch")[0].isOn
                });
            } else if ($el.hasClass("fileOverride")) {
                rules.push({
                    type: "fileOverride",
                    match: $el.find(".matchInput").val(),
                    file: app.files[el.id] || "",
                    fileId: el.id,
                    on: $el.find(".onoffswitch")[0].isOn
                });
            } else if ($el.hasClass("fileInject")) {
                rules.push({
                    type: "fileInject",
                    fileName: $el.find(".fileName").val(),
                    file: app.files[el.id] || "",
                    fileId: el.id,
                    fileType: $el.find(".fileTypeSelect").val(),
                    injectLocation: $el.find(".injectLocationSelect").val(),
                    on: $el.find(".onoffswitch")[0].isOn
                });
            } else if ($el.hasClass("headerRule")) {
                rules.push({
                    type: "headerRule",
                    match: $el.find(".matchInput").val(),
                    requestRules: $el.find(".requestRules").data("rules") || "",
                    responseRules: $el.find(".responseRules").data("rules") || "",
                    on: $el.find(".onoffswitch")[0].isOn
                });
            }
        });

        return {
            id: domain[0].id,
            matchUrl: domain.find(".domainMatchInput").val(),
            rules: rules,
            on: domain.find(".onoffswitch")[0].isOn
        };
    }

    function createDomainMarkup(savedData) {
        savedData = savedData || {};
        const domain = util.instanceTemplate(ui.domainTemplate);
        const overrideRulesContainer = domain.find(".overrideRules");
        const addRuleBtn = domain.find(".addRuleBtn");
        const domainMatchInput = domain.find(".domainMatchInput");
        const onOffBtn = domain.find(".onoffswitch");
        const deleteBtn = domain.find(".deleteBtn");
        const rules = savedData.rules || [];

        const id = savedData.id || util.getNextId($(".domainContainer"), "d");
        domain[0].id = id;
        const saveFunc = util.debounce(createSaveFunction(id), 700);

        if (rules.length) {
            rules.forEach(function(rule) {
                if (rule.type === "normalOverride") {
                    overrideRulesContainer.append(app.createWebOverrideMarkup(rule, saveFunc));
                } else if (rule.type === "fileOverride") {
                    overrideRulesContainer.append(app.createFileOverrideMarkup(rule, saveFunc));
                } else if (rule.type === "fileInject") {
                    overrideRulesContainer.append(app.createFileInjectMarkup(rule, saveFunc));
                } else if (rule.type === "headerRule") {
                    overrideRulesContainer.append(app.createHeaderRuleMarkup(rule, saveFunc));
                }
            });
        }

        const mvRules = app.moveableRules(overrideRulesContainer[0], ".handle");
        mvRules.onMove(saveFunc);

        domainMatchInput.val(savedData.matchUrl || "");
        onOffBtn[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            domain.addClass("disabled");
        }

        const addRuleCallback = function(markup) {
            mvRules.assignHandleListener(markup.find(".handle")[0]);
            overrideRulesContainer.append(markup);
        };

        addRuleBtn.on("click", function() {
            showRuleDropdown(addRuleBtn, addRuleCallback, saveFunc);
        });

        domainMatchInput.on("keyup", saveFunc);
        onOffBtn.on("click change", function() {
            domain.toggleClass("disabled", !onOffBtn[0].isOn);
            saveFunc();
        });

        deleteBtn.on("click", function() {
            if (!util.deleteButtonIsSure(deleteBtn)) {
                return;
            }
            chrome.runtime.sendMessage({action: "deleteDomain", id: id});
            domain.css("transition", "none");
            domain.fadeOut(function() {
                domain.remove();
            });
            app.skipNextSync = true;
        });

        deleteBtn.on("mouseout", function() {
            util.deleteButtonIsSureReset(deleteBtn);
        });

        return domain;
    }

    ui.addWebRuleBtn.on("click", function() {
        currentAddRuleFunc(app.createWebOverrideMarkup({}, currentSaveFunc));
    });

    ui.addFileRuleBtn.on("click", function() {
        currentAddRuleFunc(app.createFileOverrideMarkup({}, currentSaveFunc));
    });

    ui.addInjectRuleBtn.on("click", function() {
        currentAddRuleFunc(app.createFileInjectMarkup({}, currentSaveFunc));
    });

    ui.addHeaderRuleBtn.on("click", function() {
        currentAddRuleFunc(app.createHeaderRuleMarkup({}, currentSaveFunc));
    });

    $(window).on("resize", function() {
        if (currentAddRuleBtn) {
            positionRuleDropdown(currentAddRuleBtn);
        }
    });

    $(window).on("click", function(e) {
        const $target = $(e.target);
        if (!$target.hasClass("addRuleBtn") && e.target.id !== "addRuleDropdown") {
            ui.addRuleDropdown.hide();
        }
    });

    app.createDomainMarkup = createDomainMarkup;
    app.getDomainData = getDomainData;

})();
