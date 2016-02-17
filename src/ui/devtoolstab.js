(function() {
    "use strict";

    /* globals $, chrome, ace, moveableRules, suggest, js_beautify */

    var $domainTemplate;
    var $overrideTemplate;
    var $fileOverrideTemplate;
    var $fileInjectTemplate;
    var $onOffSwitchTemplate;

    var editor;
    var editingFile;
    var lastSaveFunc;
    var files = {};
    var skipNextSync = false;

    // Check to see if chrome verion is high enough for the devtools check.
    function checkChromeVersion() {
        var match = navigator.userAgent.match(/Chrom[^0-9]+([0-9]+)\./);
        if (match && match.length > 1) {
            var majorVersion = parseInt(match[1]);
            if (!isNaN(majorVersion) && majorVersion < 43) {
                // chrome is not a high enough version.
                alert("RESOURCE OVERRIDE ERROR: Your version of chrome is too old! " +
                    "Please update to version 43 or higher. Otherwise, expect crashes.");
            }
        }
    }
    checkChromeVersion();

    // This check can cause chrome to crash on chrome v42 and lower.
    // https://code.google.com/p/chromium/issues/detail?id=356133
    var isExtensionOptionsPage = !chrome.devtools;

    document.registerElement("on-off-switch", {
        prototype: Object.create(HTMLElement.prototype, {
            createdCallback: {
                value: function() {
                    var self = this;
                    this.createShadowRoot().appendChild(document.importNode(
                        $onOffSwitchTemplate[0].content, true));
                    var $switchContainer = $(this.shadowRoot.children[1]);
                    $switchContainer.find(".onoffswitch-on").text(
                        this.getAttribute("onText") || "ON");
                    $switchContainer.find(".onoffswitch-off").text(
                        this.getAttribute("offText") || "OFF");
                    this.checkbox = $switchContainer.find("input");
                    this.checkbox.on("change", function() {
                        return self.isOn;
                    });
                }
            },
            isOn: {
                get: function() {
                    return this.checkbox.is(":checked");
                },
                set: function(val) {
                    if (val) {
                        this.checkbox.prop("checked", true);
                    } else {
                        this.checkbox.prop("checked", false);
                    }
                }
            }
        })
    });

    function instanceTemplate(template) {
        // We have to fetch first child (the container element) because
        // document fragments are not supported by JQ
        return $(document.importNode(template[0].content, true).children[0]);
    }

    function debounce(fn, amt) {
        var timeout;
        return function() {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(fn, amt);
        };
    }

    function getNextId(jqResults, prefix) {
        var maxId = 0;
        jqResults.each(function(idx, el) {
            var id = parseInt(el.id.substring(1), 10);
            if (!isNaN(id) && id > maxId) {
                maxId = id;
            }
        });
        return prefix.charAt(0) + (maxId + 1);
    }

    function shortenString(str, limit) {
        var over = str.length - limit;
        if (over > 0) {
            var halfPos = str.length / 2;
            var firstOffset = Math.floor(over / 2 + 2);
            var secondOffset = Math.ceil(over / 2 + 3);
            return str.substring(0, halfPos - firstOffset) + " ... " +
                str.substring(halfPos + secondOffset);
        }
        return str;
    }

    function getTabResources(cb) {
        if (!isExtensionOptionsPage) {
            chrome.devtools.inspectedWindow.getResources(function(resourceList) {
                if (resourceList) {
                    var filteredList = resourceList.filter(function(resource) {
                        var url = resource.url;
                        url = url.trim();
                        if (url) {
                            var validStart = (/^http/).test(url);
                            var invalidFormat = (/\.jpg$|\.jpeg$|\.gif$|\.png$/).test(url);
                            return validStart && !invalidFormat;
                        }
                        return false;
                    });
                    filteredList = filteredList.map(function(resource) {
                        return resource.url;
                    });
                    cb(filteredList.sort());
                }
            });
        } else {
            suggest.setShouldSuggest(false);
        }
    }

    function updateSaveButtons(edited) {
        if (edited) {
            $("#fileSaveAndCloseBtn").css("color", "#ff0000");
            $("#fileSaveBtn").css("color", "#ff0000");
        } else {
            $("#fileSaveAndCloseBtn").css("color", "#000000");
            $("#fileSaveBtn").css("color", "#000000");
        }
    }

    function setEditorVal(str) {
        editor.off("change", updateSaveButtons);
        editor.setValue(str);
        editor.gotoLine(0, 0, false);
        editor.on("change", updateSaveButtons);
    }

    function editorGuessMode(fileName, file) {
        chrome.extension.sendMessage({
            action: "extractMimeType",
            file: file,
            fileName: fileName
        }, function(data) {
            var mimeToEditorSyntax = {
                "text/javascript": "javascript",
                "text/html": "html",
                "text/css": "css",
                "text/xml": "xml"
            };
            var mode = mimeToEditorSyntax[data.mime] || "javascript";
            $("#syntaxSelect").val(mode);
            editor.getSession().setMode("ace/mode/" + mode);
        });
    }

    function saveFile() {
        updateSaveButtons();
        files[editingFile] = editor.getValue();
        lastSaveFunc();
    }

    function saveFileAndClose() {
        saveFile();
        $("#editorOverlay").hide();
    }

    function openEditor(fileId, match, isInjectFile) {
        updateSaveButtons();
        $("#editorOverlay").css('display', 'flex');
        if (!editor) {
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
        match = match || "<Not defined yet>";
        $("#editLabel").text(isInjectFile ? "Editing file:" : "Editing file for match:");
        $("#matchContainer").text(match);

        editorGuessMode(match, files[fileId]);

        var $loadSelect = $("#loadSelect");

        if (!isExtensionOptionsPage) {
            $loadSelect.show();
            getTabResources(function(filteredList) {
                $loadSelect.html("<option value=''>Load content from resource...</option>");
                filteredList.forEach(function(url) {
                    var $newOpt = $("<option>");
                    $newOpt.attr("value", url);
                    $newOpt.text(shortenString(url, 250));
                    $loadSelect.append($newOpt);
                });
                $loadSelect.val("");
            });
        } else {
            $loadSelect.hide();
        }

        var fileStr = files[fileId] || "";
        setEditorVal(fileStr);
    }

    function createSaveFunction(id) {
        return function() {
            var $domain = $("#" + id);
            var data = getDomainData($domain);
            chrome.extension.sendMessage({action: "saveDomain", data: data});
            skipNextSync = true;
        };
    }

    function deleteButtonIsSure(deleteBtn) {
        if (!deleteBtn.data("isSure")) {
            deleteBtn.data("isSure", 1);
            deleteBtn.css("font-size", "10px");
            deleteBtn.text("Sure?");
            return false;
        }
        return true;
    }

    function deleteButtonIsSureReset(deleteBtn) {
        deleteBtn.text("\u00d7");
        deleteBtn.css("font-size", "28px");
        deleteBtn.data("isSure", 0);
    }

    function createWebOverrideMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        var override = instanceTemplate($overrideTemplate);
        var matchInput = override.find(".matchInput");
        var replaceInput = override.find(".replaceInput");
        var ruleOnOff = override.find(".ruleOnOff");
        var deleteBtn = override.find(".sym-btn");

        matchInput.val(savedData.match || "");
        replaceInput.val(savedData.replace || "");
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            override.addClass("disabled");
        }

        deleteBtn.on("click", function() {
            if (!deleteButtonIsSure(deleteBtn)) {
                return;
            }
            override.css("transition", "none");
            override.fadeOut(function() {
                override.remove();
                saveFunc();
                skipNextSync = true;
            });
        });

        deleteBtn.on("mouseout", function() {
            deleteButtonIsSureReset(deleteBtn);
        });

        matchInput.on("keyup", saveFunc);
        matchInput.data("saveFunc", saveFunc);
        replaceInput.on("keyup", saveFunc);
        ruleOnOff.on("click change", function() {
            override.toggleClass("disabled", !ruleOnOff[0].isOn);
            saveFunc();
        });

        return override;
    }

    function createFileOverrideMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        var override = instanceTemplate($fileOverrideTemplate);
        var matchInput = override.find(".matchInput");
        var editBtn = override.find(".edit-btn");
        var ruleOnOff = override.find(".ruleOnOff");
        var deleteBtn = override.find(".sym-btn");

        matchInput.val(savedData.match || "");
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            override.addClass("disabled");
        }

        editBtn.on("click", function() {
            editingFile = override[0].id;
            openEditor(editingFile, matchInput.val());
            lastSaveFunc = saveFunc;
        });

        deleteBtn.on("click", function() {
            if (!deleteButtonIsSure(deleteBtn)) {
                return;
            }
            override.css("transition", "none");
            override.fadeOut(function() {
                override.remove();
                delete files[override[0].id];
                saveFunc();
            });
        });

        deleteBtn.on("mouseout", function() {
            deleteButtonIsSureReset(deleteBtn);
        });

        matchInput.on("keyup", saveFunc);
        matchInput.data("saveFunc", saveFunc);
        ruleOnOff.on("click change", function() {
            override.toggleClass("disabled", !ruleOnOff[0].isOn);
            saveFunc();
        });

        var id = savedData.fileId || getNextId($(".ruleContainer"), "f");
        override[0].id = id;

        if (savedData.file) {
            files[id] = savedData.file;
        }

        return override;
    }

    function createFileInjectMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        var override = instanceTemplate($fileInjectTemplate);
        var fileName = override.find(".fileName");
        var injectLocation = override.find(".injectLocationSelect");
        var fileType = override.find(".fileTypeSelect");
        var editBtn = override.find(".edit-btn");
        var ruleOnOff = override.find(".ruleOnOff");
        var deleteBtn = override.find(".sym-btn");

        fileName.val(savedData.fileName || "");
        injectLocation.val(savedData.injectLocation || "head");
        fileType.val(savedData.fileType || "js");
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            override.addClass("disabled");
        }

        editBtn.on("click", function() {
            editingFile = override[0].id;
            openEditor(editingFile, fileName.val(), true);
            lastSaveFunc = saveFunc;
        });

        deleteBtn.on("click", function() {
            if (!deleteButtonIsSure(deleteBtn)) {
                return;
            }
            override.css("transition", "none");
            override.fadeOut(function() {
                override.remove();
                delete files[override[0].id];
                saveFunc();
            });
        });

        deleteBtn.on("mouseout", function() {
            deleteButtonIsSureReset(deleteBtn);
        });

        fileName.on("keyup", saveFunc);
        ruleOnOff.on("click change", function() {
            override.toggleClass("disabled", !ruleOnOff[0].isOn);
            saveFunc();
        });
        injectLocation.on("change", saveFunc);
        fileType.on("change", saveFunc);

        var id = savedData.fileId || getNextId($(".ruleContainer"), "f");
        override[0].id = id;

        if (savedData.file) {
            files[id] = savedData.file;
        }

        return override;
    }

    function createDomainMarkup(savedData) {
        savedData = savedData || {};
        var domain = instanceTemplate($domainTemplate);
        var overrideRulesContainer = domain.find(".overrideRules");
        var addRuleBtn = domain.find(".addRuleBtn");
        var addFileRuleBtn = domain.find(".addFileRuleBtn");
        var addInjectRuleBtn = domain.find(".addInjectRuleBtn");
        var domainMatchInput = domain.find(".domainMatchInput");
        var onOffBtn = domain.find(".domainOnOff");
        var deleteBtn = domain.find(".deleteBtn");
        var rules = savedData.rules || [];

        var id = savedData.id || getNextId($(".domainContainer"), "d");
        domain[0].id = id;
        var saveFunc = debounce(createSaveFunction(id), 700);

        if (rules.length) {
            rules.forEach(function(rule) {
                if (rule.type === "normalOverride") {
                    overrideRulesContainer.append(createWebOverrideMarkup(rule, saveFunc));
                } else if (rule.type === "fileOverride") {
                    overrideRulesContainer.append(createFileOverrideMarkup(rule, saveFunc));
                } else if (rule.type === "fileInject") {
                    overrideRulesContainer.append(createFileInjectMarkup(rule, saveFunc));
                }
            });
        }

        var mvRules = moveableRules(overrideRulesContainer[0], ".handle");
        mvRules.onMove(saveFunc);

        domainMatchInput.val(savedData.matchUrl || "");
        onOffBtn[0].isOn = savedData.on === false ? false : true;

        if (savedData.on === false) {
            domain.addClass("disabled");
        }

        addRuleBtn.on("click", function() {
            var markup = createWebOverrideMarkup({}, saveFunc);
            mvRules.assignHandleListener(markup.find(".handle")[0]);
            overrideRulesContainer.append(markup);
            suggest.init();
        });

        domainMatchInput.on("keyup", saveFunc);
        onOffBtn.on("click change", function() {
            domain.toggleClass("disabled", !onOffBtn[0].isOn);
            saveFunc();
        });

        addFileRuleBtn.on("click", function() {
            var markup = createFileOverrideMarkup({}, saveFunc);
            mvRules.assignHandleListener(markup.find(".handle")[0]);
            overrideRulesContainer.append(markup);
            suggest.init();
        });

        addInjectRuleBtn.on("click", function() {
            var markup = createFileInjectMarkup({}, saveFunc);
            mvRules.assignHandleListener(markup.find(".handle")[0]);
            overrideRulesContainer.append(markup);
        });

        deleteBtn.on("click", function() {
            if (!deleteButtonIsSure(deleteBtn)) {
                return;
            }
            chrome.extension.sendMessage({action: "deleteDomain", id: id});
            domain.css("transition", "none");
            domain.fadeOut(function() {
                domain.remove();
            });
            skipNextSync = true;
        });

        deleteBtn.on("mouseout", function() {
            deleteButtonIsSureReset(deleteBtn);
        });

        return domain;
    }

    function getDomainData(domain) {
        var rules = [];
        domain.find(".ruleContainer").each(function(idx, el) {
            var $el = $(el);
            if ($el.hasClass("normalOverride")) {
                rules.push({
                    type: "normalOverride",
                    match: $el.find(".matchInput").val(),
                    replace: $el.find(".replaceInput").val(),
                    on: $el.find(".ruleOnOff")[0].isOn
                });
            } else if ($el.hasClass("fileOverride")) {
                rules.push({
                    type: "fileOverride",
                    match: $el.find(".matchInput").val(),
                    file: files[el.id] || "",
                    fileId: el.id,
                    on: $el.find(".ruleOnOff")[0].isOn
                });
            } else if ($el.hasClass("fileInject")) {
                rules.push({
                    type: "fileInject",
                    fileName: $el.find(".fileName").val(),
                    file: files[el.id] || "",
                    fileId: el.id,
                    fileType: $el.find(".fileTypeSelect").val(),
                    injectLocation: $el.find(".injectLocationSelect").val(),
                    on: $el.find(".ruleOnOff")[0].isOn
                });
            }
        });

        return {
            id: domain[0].id,
            matchUrl: domain.find(".domainMatchInput").val(),
            rules: rules,
            on: domain.find(".domainOnOff")[0].isOn
        };
    }

    function renderData() {
        var $domainList = $("#domainDefs");
        files = {};
        $domainList.children().remove();
        chrome.extension.sendMessage({action: "getDomains"}, function(domains) {
            if (domains.length) {
                domains.forEach(function(domain) {
                    var domainMarkup = createDomainMarkup(domain);
                    $domainList.append(domainMarkup);
                });
            } else {
                var newDomain = createDomainMarkup({rules: [{type: "normalOverride"}]});
                $domainList.append(newDomain);
                newDomain.find(".domainMatchInput").val("*");
                chrome.extension.sendMessage({
                    action: "saveDomain",
                    data: getDomainData(newDomain)
                });
                skipNextSync = true;
            }
            suggest.init();
            getTabResources(function(res) {
                suggest.fillOptions(res);
            });
        });
    }

    function showToast(message) {
        var $toastBox = $("#generalToast");
        $toastBox.html(message);
        $toastBox.fadeIn();
        setTimeout(function() {
            $toastBox.fadeOut();
        }, 3500);
    }

    function checkDomain(domain) {
        var valid = (/^d[0-9]+$/).test(domain.id);
        valid = valid && domain.matchUrl !== undefined;
        valid = valid && domain.on !== undefined;
        valid = valid && $.isArray(domain.rules);
        valid = valid && domain.rules.every(checkRule);
        return valid;
    }

    function checkRule(rule) {
        var valid = true;
        if (rule.type === "normalOverride") {
            valid = valid && rule.match !== undefined;
            valid = valid && rule.replace !== undefined;
            valid = valid && rule.on !== undefined;
        } else if (rule.type === "fileOverride") {
            valid = valid && rule.match !== undefined;
            valid = valid && rule.file !== undefined;
            valid = valid && (/^f[0-9]+$/).test(rule.fileId);
            valid = valid && rule.on !== undefined;
        } else if (rule.type === "fileInject") {
            valid = valid && rule.fileName !== undefined;
            valid = valid && rule.file !== undefined;
            valid = valid && (/^f[0-9]+$/).test(rule.fileId);
            valid = valid && rule.fileType !== undefined;
            valid = valid && rule.injectLocation !== undefined;
            valid = valid && rule.on !== undefined;
        } else {
            return false;
        }
        return valid;
    }

    function importData(data, version) {
        // check data first.
        if ($.isArray(data) && data.every(checkDomain)) {
            // this will call the sync function so stuff will get re-rendered.
            chrome.extension.sendMessage({action: "import", data: data});
            showToast("Load Succeeded!");
        } else {
            showToast("Load Failed: Invalid Resource Override JSON.");
        }
    }

    function exportData() {
        var allData = [];
        $(".domainContainer").each(function(idx, domain) {
            allData.push(getDomainData($(domain)));
        });
        return {v: 1, data: allData};
    }

    function setupSynchronizeConnection() {
        chrome.extension.sendMessage({action: "syncMe"}, function() {
            if (!skipNextSync) {
                renderData();
            }
            skipNextSync = false;
            setupSynchronizeConnection();
        });
    }

    function init() {
        $domainTemplate = $("#domainTemplate");
        $overrideTemplate = $("#overrideTemplate");
        $fileOverrideTemplate = $("#fileOverrideTemplate");
        $fileInjectTemplate = $("#fileInjectTemplate");
        $onOffSwitchTemplate = $("#onOffSwitchTemplate");

        if ($domainTemplate.length === 0) {
            // init was called too early (options page case) so give up.
            return;
        }

        setupSynchronizeConnection();

        renderData();

        $("#addDomainBtn").on("click", function() {
            var $domainList = $("#domainDefs");
            var newDomain = createDomainMarkup();
            newDomain.find(".domainMatchInput").val("*");
            $domainList.append(newDomain);
            chrome.extension.sendMessage({action: "saveDomain", data: getDomainData(newDomain)});
            suggest.init();
            skipNextSync = true;
        });

        $("#fileSaveAndCloseBtn").on("click", saveFileAndClose);

        $("#fileSaveBtn").on("click", saveFile);

        $("#fileCancelBtn").on("click", function() {
            $("#editorOverlay").hide();
        });

        $("#helpBtn").on("click", function() {
            $("#helpOverlay").toggle();
        });

        $(window).on("click", function(e) {
            var $popOver = $("#optionsPopOver");
            var $target = $(e.target);
            if (e.target.id === "optionsBtn") {
                $popOver.toggle();
                $("#helpOverlay").hide();
            } else {
                if ($target.closest("#optionsPopOver").length === 0) {
                    $popOver.hide();
                }
            }
        });

        $("#helpCloseBtn").on("click", function() {
            $("#helpOverlay").hide();
        });

        $("#loadSelect").on("change", function() {
            var url = $(this).val();
            $(this).val("");
            if (url) {
                chrome.extension.sendMessage({action: "makeGetRequest", url: url}, function(data) {
                    setEditorVal(data);
                    updateSaveButtons(true);
                    editorGuessMode(url, data);
                });
            }
        });

        $("#syntaxSelect").on("change", function() {
            editor.getSession().setMode("ace/mode/" + $(this).val());
        });

        $("#findInEditor").on("click", function() {
            editor.execCommand("find");
        });

        $("#beautifyJS").on("click", function() {
            setEditorVal(js_beautify(editor.getValue()));
            updateSaveButtons(true);
        });

        if (isExtensionOptionsPage) {
            $("#showSuggestions").hide();
            $("#showSuggestionsText").hide();
            chrome.extension.sendMessage({
                action: "getSetting",
                setting: "tabPageNotice"
            }, function(data) {

                if (data !== "true") {
                    var $tabPageNotice = $("#tabPageNotice");
                    $tabPageNotice.find("a").on("click", function(e) {
                        e.preventDefault();
                        chrome.extension.sendMessage({
                            action: "setSetting",
                            setting: "tabPageNotice",
                            value: "true"
                        });
                        $tabPageNotice.fadeOut();
                    });
                    $tabPageNotice.fadeIn();
                    setTimeout(function() {
                        $tabPageNotice.fadeOut();
                    }, 6000);
                }
            });
        }

        var $showDevToolsCB = $("#showDevTools");
        $showDevToolsCB.on("click", function() {
            chrome.extension.sendMessage({
                action: "setSetting",
                setting: "devTools",
                value: $showDevToolsCB.prop("checked")
            });
        });

        var $showSuggestions = $("#showSuggestions");
        $showSuggestions.on("click", function() {
            chrome.extension.sendMessage({
                action: "setSetting",
                setting: "showSuggestions",
                value: $showSuggestions.prop("checked")
            });
            suggest.setShouldSuggest($showSuggestions.prop("checked"));
        });

        var $showLogs = $("#showLogs");
        $showLogs.on("click", function() {
            chrome.extension.sendMessage({
                action: "setSetting",
                setting: "showLogs",
                value: $showLogs.prop("checked")
            });
        });

        $("#saveRulesLink").on("click", function(e) {
            e.preventDefault();
            var data = exportData();
            var json = JSON.stringify(data);
            var blob = new Blob([json], {type: "text/plain"});
            var downloadLink = document.createElement("a");
            downloadLink.download = "resource_override_rules.json";
            downloadLink.href = window.URL.createObjectURL(blob);
            downloadLink.click();
            $("#optionsPopOver").hide();
        });


        var $loadRulesInput = $("#loadRulesInput");
        $("#loadRulesLink").on("click", function(e) {
            e.preventDefault();
            $loadRulesInput.click();
            $("#optionsPopOver").hide();
        });

        $loadRulesInput.on("change", function(e) {
            var reader = new FileReader();
            reader.onload = function() {
                var text = reader.result;
                try {
                    var importedObj = JSON.parse(text);
                    importData(importedObj.data, importedObj.v);
                } catch(e) {
                    showToast("Load Failed: Invalid JSON in file.");
                }
            };
            reader.readAsText($loadRulesInput[0].files[0]);
            $loadRulesInput.val("");
        });

        chrome.extension.sendMessage({
            action: "getSetting",
            setting: "devTools"
        }, function(data) {

            $showDevToolsCB.prop("checked", data === "true");
        });

        chrome.extension.sendMessage({
            action: "getSetting",
            setting: "showSuggestions"
        }, function(data) {

            $showSuggestions.prop("checked", data !== "false");
            suggest.setShouldSuggest(data !== "false");
        });

        chrome.extension.sendMessage({
            action: "getSetting",
            setting: "showLogs"
        }, function(data) {

            $showLogs.prop("checked", data === "true");
        });
    }

    window.init = init;
    init();

})();// end script-wide closure
