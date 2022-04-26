(function() {
    "use strict";

    /* globals $ */

    const app = window.app;
    const util = app.util;
    const ui = app.ui;

    function createFileOverrideMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        const override = util.instanceTemplate(ui.fileOverrideTemplate);
        const rid = savedData.id || util.getNextRuleId(app.export().data);
        override[0].id = `r${rid}`;
        const matchInput = override.find(".matchInput");
        const editBtn = override.find(".edit-btn");
        const ruleOnOff = override.find(".onoffswitch");
        const deleteBtn = override.find(".sym-btn");

        matchInput.val(savedData.match || "");
        util.makeFieldRequired(matchInput);
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            override.addClass("disabled");
        }

        editBtn.on("click", function() {
            app.editor.open(override[0].dataset.fileId, matchInput.val(), false, saveFunc);
        });

        deleteBtn.on("click", function() {
            if (!util.deleteButtonIsSure(deleteBtn)) {
                return;
            }
            override.css("transition", "none");
            override.fadeOut(function() {
                override.remove();
                delete app.files[override[0].id];
                saveFunc({ removeIds: [rid] });
            });
        });

        deleteBtn.on("mouseout", function() {
            util.deleteButtonIsSureReset(deleteBtn);
        });

        app.mainSuggest.init(matchInput);

        matchInput.on("keyup", saveFunc);
        ruleOnOff.on("click change", function() {
            override.toggleClass("disabled", !ruleOnOff[0].isOn);
            saveFunc();
        });

        let id = savedData.fileId || util.getNextFileId($(".ruleContainer"));
        if (app.files[id]) {
            id = util.getNextFileId($(".ruleContainer"));
        }
        override[0].dataset.fileId = id;

        if (savedData.file) {
            app.files[id] = savedData.file;
        }

        return override;
    }

    app.createFileOverrideMarkup = createFileOverrideMarkup;

})();
