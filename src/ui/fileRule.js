(function () {
    "use strict";

    /* globals $ */

    const app = window.app;
    const util = app.util;
    const ui = app.ui;

    function createFileOverrideMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        const override = util.instanceTemplate(ui.fileOverrideTemplate);
        const matchInput = override.find(".matchInput");
        const ruleOnOff = override.find(".onoffswitch");
        const deleteBtn = override.find(".sym-btn");
        const uploadBtn = override.find(".upload-btn");
        const fileBtn = override.find(".file-btn");
        const fileName = override.find(".uploadedFileName");

        matchInput.val(savedData.match || "");
        util.makeFieldRequired(matchInput);
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            override.addClass("disabled");
        }

        uploadBtn.on("click", function () {
            document.getElementById('file').click();
        });
        

        fileBtn.on("change", function () {
            const selectedFile = document.getElementById('file').files[0];

            var reader = new FileReader();
            reader.onload = function (event) {
                app.files[override[0].id] = event.target.result;
                app.fileNames[override[0].id] = selectedFile.name;
                saveFunc();
                fileName.text(selectedFile.name);
            };
            reader.readAsText(selectedFile);
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

        app.mainSuggest.init(matchInput);

        matchInput.on("keyup", saveFunc);
        ruleOnOff.on("click change", function() {
            override.toggleClass("disabled", !ruleOnOff[0].isOn);
            saveFunc();
        });

        let id = savedData.fileId || util.getNextId($(".ruleContainer"), "f");
        if (app.files[id]) {
            id = util.getNextId($(".ruleContainer"), "f");
        }
        override[0].id = id;

        if (savedData.file) {
            app.files[id] = savedData.file;
            fileName.text(savedData.fileName);
        }

        return override;
    }

    app.createFileOverrideMarkup = createFileOverrideMarkup;

})();
