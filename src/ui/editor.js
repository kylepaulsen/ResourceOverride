"use strict";

/* globals $, chrome, ace, js_beautify */


import {app, ui} from './init.js';
import {files} from './devtoolstab.js';
import {isChrome, getTabResources, shortenString} from './util.js';

let editor;
let editingFile;
let saveFunc;

function updateSaveButtons(edited) {
    if (edited) {
        ui.fileSaveAndCloseBtn.style.color = "#f00";
        ui.fileSaveBtn.style.color = "#f00";
    } else {
        ui.fileSaveAndCloseBtn.style.color = "#000";
        ui.fileSaveBtn.style.color = "#000";
    }
}

function setEditorVal(str) {
    editor.off("change", updateSaveButtons);
    editor.setValue(str);
    editor.gotoLine(0, 0, false);
    editor.addEventListener("change", updateSaveButtons);
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
        ui.syntaxSelect.value = mode;
        editor.getSession().setMode("ace/mode/" + mode);
    });
}

function saveFile() {
    updateSaveButtons();
    files[editingFile] = editor.getValue();
    saveFunc();
}

function saveFileAndClose() {
    saveFile();
    ui.editorOverlay.style.display = "none";
    ui.body.style.overflow = "auto";
}

function setupEditor() {
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.setShowPrintMargin(false);

    editor.addEventListener("change", updateSaveButtons);
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
    ui.editorOverlay.style.display = "flex";
    ui.body.style.overflow = "hidden";
    if (!editor) {
        setupEditor();
    }
    match = match || "<Not defined yet>";
    ui.editLabel.textContent = isInjectFile ? "Editing file:" : "Editing file for match:";
    ui.matchContainer.textContent = match;

	editorGuessMode(match, files[fileId]);

    if (chrome.devtools && util.isChrome()) {
        ui.loadSelect.style.display = "block";
        util.getTabResources(function(filteredList) {
            const newOpt = document.createElement("option");
            newOpt.textContent = "Load content from resource...";
            newOpt.value = "";
            ui.loadSelect.innerHTML= "";
            ui.loadSelect.appendChild(newOpt);
            filteredList.forEach(function(url) {
                const newOpt = document.createElement("option");
                newOpt.value = url;
                newOpt.textContent = shortenString(url, 250);
                ui.loadSelect.appendChild(newOpt);
            });
            ui.loadSelect.selectedIndex = 0;
        });
    } else {
        ui.loadSelect.style.display = "none";
    }

    const fileStr = files[fileId] || "";
    setEditorVal(fileStr);
}

ui.fileSaveAndCloseBtn.addEventListener("click", saveFileAndClose);

ui.fileSaveBtn.addEventListener("click", saveFile);

ui.fileCancelBtn.addEventListener("click", function() {
    ui.editorOverlay.style.display = "none";
    ui.body.style.overflow = "auto"
});

ui.loadSelect.addEventListener("change", function() {
    const url = ui.loadSelect.value;
    ui.loadSelect.value = "";
    if (url) {
        chrome.runtime.sendMessage({action: "makeGetRequest", url: url}, function(data) {
            setEditorVal(data);
            updateSaveButtons(true);
            editorGuessMode(url, data);
        });
    }
});

ui.syntaxSelect.addEventListener("change", function() {
    editor.getSession().setMode("ace/mode/" + ui.syntaxSelect.value);
});

ui.findInEditor.addEventListener("click", function() {
    editor.execCommand("find");
});

ui.beautifyJS.addEventListener("click", function() {
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
