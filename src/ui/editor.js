(function() {
    "use strict";

    /* globals $, chrome, ace, js_beautify */

    const app = window.app;
    const ui = app.ui;
    const util = app.util;

    let editor;
    let editingFile;
    let saveFunc;

    function updateSaveButtons(edited) {
        if (edited) {
            ui.fileSaveAndCloseBtn.css("color", "#ff0000");
            ui.fileSaveBtn.css("color", "#ff0000");
        } else {
            ui.fileSaveAndCloseBtn.css("color", "#000000");
            ui.fileSaveBtn.css("color", "#000000");
        }
    }

    function setEditorVal(str) {
        editor.off("change", updateSaveButtons);
        editor.setValue(str);
        editor.gotoLine(0, 0, false);
        editor.on("change", updateSaveButtons);
    }

    function editorGuessMode(fileName, file) {
        chrome.runtime.sendMessage({
            action: "extractMimeType",
            file: file,
            fileName: fileName
        }, function(data) {
            const mimeToEditorSyntax = {
                "text/javascript": "javascript",
                "text/html": "html",
                "text/css": "css",
                "text/xml": "xml"
            };
            const mode = mimeToEditorSyntax[data.mime] || "javascript";
            ui.syntaxSelect.val(mode);
            editor.getSession().setMode("ace/mode/" + mode);
        });
    }

    function saveFile() {
        updateSaveButtons();
        app.files[editingFile] = editor.getValue();
        saveFunc();
    }

    function saveFileAndClose() {
        saveFile();
        ui.editorOverlay.hide();
        ui.body.css("overflow", "auto");
    }

    function setupEditor() {
        editor = ace.edit("editor");
        editor.setTheme("ace/theme/monokai");
        editor.setShowPrintMargin(false);

        editor.on("change", updateSaveButtons);
        editor.commands.addCommand({
            name: "multiEdit",
            bindKey: {
                win: "Ctrl-D",
                mac: "Command-D"
            },
            exec: function(editor, line) {
                editor.selectMore(1);
            },
            readOnly: true
        });
        editor.commands.addCommand({
            name: "save",
            bindKey: {
                win: "Ctrl-S",
                mac: "Command-S"
            },
            exec: function(editor, line) {
                saveFile();
            },
            readOnly: true
        });
        editor.commands.addCommand({
            name: "saveAndClose",
            bindKey: {
                win: "Ctrl-Shift-S",
                mac: "Command-Shift-S"
            },
            exec: function(editor, line) {
                saveFileAndClose();
            },
            readOnly: true
        });
    }

    function openEditor(fileId, match, isInjectFile, saveFunction) {
        saveFunc = saveFunction;
        editingFile = fileId;
        updateSaveButtons();
        ui.editorOverlay.css("display", "flex");
        ui.body.css("overflow", "hidden");
        if (!editor) {
            setupEditor();
        }
        match = match || "<Not defined yet>";
        ui.editLabel.text(isInjectFile ? "Editing file:" : "Editing file for match:");
        ui.matchContainer.text(match);

        editorGuessMode(match, app.files[fileId]);

        if (chrome.devtools && util.isChrome()) {
            ui.loadSelect.show();
            util.getTabResources(function(filteredList) {
                ui.loadSelect.html("<option value=''>Load content from resource...</option>");
                filteredList.forEach(function(url) {
                    const $newOpt = $("<option>");
                    $newOpt.attr("value", url);
                    $newOpt.text(util.shortenString(url, 250));
                    ui.loadSelect.append($newOpt);
                });
                ui.loadSelect.val("");
            });
        } else {
            ui.loadSelect.hide();
        }

        const fileStr = app.files[fileId] || "";
        setEditorVal(fileStr);
    }

    ui.fileSaveAndCloseBtn.on("click", saveFileAndClose);

    ui.fileSaveBtn.on("click", saveFile);

    ui.fileCancelBtn.on("click", function() {
        ui.editorOverlay.hide();
        ui.body.css("overflow", "auto");
    });

    ui.loadSelect.on("change", function() {
        const url = ui.loadSelect.val();
        ui.loadSelect.val("");
        if (url) {
            chrome.runtime.sendMessage({action: "makeGetRequest", url: url}, function(data) {
                setEditorVal(data);
                updateSaveButtons(true);
                editorGuessMode(url, data);
            });
        }
    });

    ui.syntaxSelect.on("change", function() {
        editor.getSession().setMode("ace/mode/" + ui.syntaxSelect.val());
    });

    ui.findInEditor.on("click", function() {
        editor.execCommand("find");
    });

    ui.beautifyJS.on("click", function() {
        setEditorVal(js_beautify(editor.getValue()));
        updateSaveButtons(true);
    });

    if (navigator.userAgent.indexOf("Firefox") > -1 && !!chrome.devtools) {
        // Firefox is really broken with the "/" and "'" keys. They just dont work.
        // So try to fix them here.. wow.. just wow. I can't believe I'm fixing the ability to type.
        const brokenKeys = { "/": 1, "?": 1, "'": 1, '"': 1 };
        window.addEventListener("keydown", e => {
            const brokenKey = brokenKeys[e.key];
            const activeEl = document.activeElement;
            if (brokenKey && activeEl.className === "ace_text-input" && editor) {
                e.preventDefault();
                const cursorPosition = editor.getCursorPosition();
                editor.session.insert(cursorPosition, e.key);
            }
        });
    }

    app.editor = {
        open: openEditor
    };

})();
