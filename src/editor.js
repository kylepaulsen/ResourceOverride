/* globals chrome, ace, js_beautify */
import extractMimeType from "./extractMime.js";
import { getUiElements, createEl, isChrome, getTabResources, shortenString } from "./util.js";

const app = window.app;
const ui = getUiElements(document);

let editor;
let editingFile;
let saveFunc;

function updateSaveButtons(edited) {
    if (edited) {
        ui.fileSaveAndCloseBtn.style.color = "#ff0000";
        ui.fileSaveBtn.style.color = "#ff0000";
    } else {
        ui.fileSaveAndCloseBtn.style.color = "#000000";
        ui.fileSaveBtn.style.color = "#000000";
    }
}

function setEditorVal(str) {
    editor.off("change", updateSaveButtons);
    editor.setValue(str);
    editor.gotoLine(0, 0, false);
    editor.on("change", updateSaveButtons);
}

function editorGuessMode(fileName, file) {
    const data = extractMimeType(fileName, file);
    const mimeToEditorSyntax = {
        "text/javascript": "javascript",
        "text/html": "html",
        "text/css": "css",
        "text/xml": "xml"
    };
    const mode = mimeToEditorSyntax[data.mime] || "javascript";
    ui.syntaxSelect.value = mode;
    editor.getSession().setMode("ace/mode/" + mode);
}

function saveFile() {
    updateSaveButtons();
    app.files[editingFile] = editor.getValue();
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

    editor.on("change", updateSaveButtons);
    editor.commands.addCommand({
        name: "multiEdit",
        bindKey: {
            win: "Ctrl-D",
            mac: "Command-D"
        },
        exec: function(editor/*, line*/) {
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
        exec: function(/*editor, line*/) {
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
        exec: function(/*editor, line*/) {
            saveFileAndClose();
        },
        readOnly: true
    });
}

export const openEditor = (fileId, match, isInjectFile, saveFunction) => {
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

    editorGuessMode(match, app.files[fileId]);

    if (chrome.devtools && isChrome()) {
        ui.loadSelect.style.display = "block";
        getTabResources((filteredList) => {
            ui.loadSelect.innerHTML = "<option value=''>Load content from resource...</option>";
            filteredList.forEach((url) => {
                const newOpt = createEl("option", { value: url });
                newOpt.textContent = shortenString(url, 250);
                ui.loadSelect.appendChild(newOpt);
            });
            ui.loadSelect.value = "";
        });
    } else {
        ui.loadSelect.style.display = "none";
    }

    const fileStr = app.files[fileId] || "";
    setEditorVal(fileStr);
};

ui.fileSaveAndCloseBtn.addEventListener("click", saveFileAndClose);

ui.fileSaveBtn.addEventListener("click", saveFile);

ui.fileCancelBtn.addEventListener("click", () => {
    ui.editorOverlay.style.display = "none";
    ui.body.style.overflow = "auto";
});

ui.loadSelect.addEventListener("change", () => {
    const url = ui.loadSelect.value;
    ui.loadSelect.value = "";
    if (url) {
        fetch(url).then(d => d.text()).then(data => {
            console.log("!!!!!");
            setEditorVal(data);
            updateSaveButtons(true);
            editorGuessMode(url, data);
        }).catch(e => {
            console.error("Failed to fetch asset...", e);
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
