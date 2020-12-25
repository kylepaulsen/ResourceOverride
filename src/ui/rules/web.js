(function() {
    "use strict";

    const app = window.app;
    const util = app.util;
    const ui = app.ui;

    function createWebOverrideMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        const override = util.instanceTemplate(ui.overrideTemplate);
        const matchInput = override.find(".matchInput");
        const replaceInput = override.find(".replaceInput");
        const ruleOnOff = override.find(".onoffswitch");
        const deleteBtn = override.find(".sym-btn");

        matchInput.val(savedData.match || "");
        replaceInput.val(savedData.replace || "");
        util.makeFieldRequired(matchInput);
        util.makeFieldRequired(replaceInput);
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            override.addClass("disabled");
        }

        deleteBtn.on("click", function() {
            if (!util.deleteButtonIsSure(deleteBtn)) {
                return;
            }
            override.css("transition", "none");
            override.fadeOut(function() {
                override.remove();
                saveFunc();
                app.skipNextSync = true;
            });
        });

        deleteBtn.on("mouseout", function() {
            util.deleteButtonIsSureReset(deleteBtn);
        });

        app.mainSuggest.init(matchInput);

        matchInput.on("keyup", saveFunc);
        replaceInput.on("keyup", saveFunc);
        ruleOnOff.on("click change", function() {
            override.toggleClass("disabled", !ruleOnOff[0].isOn);
            saveFunc();
        });

        return override;
    }

    app.createWebOverrideMarkup = createWebOverrideMarkup;

})();
