(function() {
    "use strict";

    /* globals $ */

    const app = window.app;
    const util = app.util;
    const ui = app.ui;

    function createFileInjectMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        const override = util.instanceTemplate(ui.fileInjectTemplate);
        const rid = savedData.id || util.getNextRuleId(app.export().data);
        override[0].id = `r${rid}`;
        const matchInput = override.find(".matchInput");
        const fileName = override.find(".fileName");
        // const injectLocation = override.find(".injectLocationSelect");
        const fileType = override.find(".fileTypeSelect");
        const editBtn = override.find(".edit-btn");
        const ruleOnOff = override.find(".onoffswitch");
        const deleteBtn = override.find(".sym-btn");

        matchInput.val(savedData.match || "");
        util.makeFieldRequired(matchInput);
        fileName.val(savedData.fileName || "");
        // injectLocation.val(savedData.injectLocation || "head");
        fileType.val(savedData.fileType || "js");
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            override.addClass("disabled");
        }

        editBtn.on("click", function() {
            app.editor.open(override[0].dataset.fileId, fileName.val(), true, saveFunc);
        });

        deleteBtn.on("click", function() {
            if (!util.deleteButtonIsSure(deleteBtn)) {
                return;
            }
            override.css("transition", "none");
            override.fadeOut(function() {
                override.remove();
                delete app.files[override[0].id];
                saveFunc();
            });
        });

        deleteBtn.on("mouseout", function() {
            util.deleteButtonIsSureReset(deleteBtn);
        });

        fileName.on("keyup", saveFunc);
        ruleOnOff.on("click change", function() {
            override.toggleClass("disabled", !ruleOnOff[0].isOn);
            saveFunc();
        });
        // injectLocation.on("change", saveFunc);
        fileType.on("change", saveFunc);

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

    app.createFileInjectMarkup = createFileInjectMarkup;

})();
