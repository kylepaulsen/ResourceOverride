(function() {
    "use strict";

    var domainTemplate;
    var overrideTemplate;
    var fileOverrideTemplate;
    var fileInjectTemplate;
    var onOffSwitchTemplate;

    var editor;
    var editingFile;
    var lastSaveFunc;
    var files = {};
    var skipNextSync = false;

    document.registerElement("on-off-switch", {
        prototype: Object.create(HTMLElement.prototype, {
            createdCallback: {
                value: function() {
                    var self = this;
                    this.createShadowRoot().appendChild(document.importNode(
                        onOffSwitchTemplate[0].content, true));
                    var switchContainer = $(this.shadowRoot.children[1]);
                    switchContainer.find(".onoffswitch-on").text(
                        this.getAttribute("onText") || "ON");
                    switchContainer.find(".onoffswitch-off").text(
                        this.getAttribute("offText") || "OFF");
                    this.checkbox = switchContainer.find("input");
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

    function openEditor(fileId, match, isInjectFile, type) {
        $("#editorOverlay").show();
        if (!editor) {
            editor = CodeMirror($("#editor")[0], {
                lineNumbers: true,
                styleActiveLine: true,
                matchBrackets: true,
                indentUnit: 4,
                tabSize: 4,
                indentWithTabs: true
            });
            editor.setSize("100%", "100%");
        }
        $("#editLabel").text(isInjectFile ? "Editing file:" : "Editing file for match:");
        $("#matchSpan").text(match || "<Not defined yet>");

        if (type) {
            $("#syntaxSelect").val(type === "js" ? "javascript" : "css");
        }

        var loadSelect = $("#loadSelect");

        // isNormalTab is defined in options.html -> importContent.js
        // Look there for the reason why it exists.
        if (!window.isNormalTab) {
            loadSelect.show();
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
                    loadSelect.html("<option value=''>Load content from resource...</option>");
                    filteredList.forEach(function(resource) {
                        var url = resource.url;
                        var newOpt = $("<option></option>");
                        newOpt.attr("value", url);
                        newOpt.text(url);
                        loadSelect.append(newOpt);
                    });
                    loadSelect.val("");
                }
            });
        } else {
            loadSelect.hide();
        }

        editor.doc.setValue(files[fileId] || "");
    }

    function createSaveFunction(id) {
        return function() {
            var domain = $("#" + id);
            var data = getDomainData(domain);
            chrome.extension.sendMessage({action: "saveDomain", data: data});
            skipNextSync = true;
        };
    }

    function createWebOverrideMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        var override = instanceTemplate(overrideTemplate);
        var matchInput = override.find(".matchInput");
        var replaceInput = override.find(".replaceInput");
        var ruleOnOff = override.find(".ruleOnOff");
        var deleteBtn = override.find(".sym-btn");

        matchInput.val(savedData.match || "");
        replaceInput.val(savedData.replace || "");
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        deleteBtn.on("click", function() {
            override.fadeOut(function() {
                override.remove();
                saveFunc();
                skipNextSync = true;
            });
        });

        matchInput.on("keyup", saveFunc);
        replaceInput.on("keyup", saveFunc);
        ruleOnOff.on("click change", saveFunc);

        return override;
    }

    function createFileOverrideMarkup(savedData, saveFunc) {
        savedData = savedData || {};
        saveFunc = saveFunc || function() {};

        var override = instanceTemplate(fileOverrideTemplate);
        var matchInput = override.find(".matchInput");
        var editBtn = override.find(".edit-btn");
        var ruleOnOff = override.find(".ruleOnOff");
        var deleteBtn = override.find(".sym-btn");

        matchInput.val(savedData.match || "");
        ruleOnOff[0].isOn = savedData.on === false ? false : true;

        editBtn.on("click", function() {
            editingFile = override[0].id;
            openEditor(editingFile, matchInput.val());
            lastSaveFunc = saveFunc;
        });

        deleteBtn.on("click", function() {
            override.fadeOut(function() {
                override.remove();
                saveFunc();
            });
        });

        matchInput.on("keyup", saveFunc);
        ruleOnOff.on("click change", saveFunc);

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

        var override = instanceTemplate(fileInjectTemplate);
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

        editBtn.on("click", function() {
            editingFile = override[0].id;
            openEditor(editingFile, fileName.val(), true, fileType.val());
            lastSaveFunc = saveFunc;
        });

        deleteBtn.on("click", function() {
            override.fadeOut(function() {
                override.remove();
                saveFunc();
            });
        });

        fileName.on("keyup", saveFunc);
        ruleOnOff.on("click change", saveFunc);
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
        var domain = instanceTemplate(domainTemplate);
        var overrideRulesContainer = domain.find(".overrideRules");
        var addRuleBtn = domain.find(".addRuleBtn");
        var addFileRuleBtn = domain.find(".addFileRuleBtn");
        var addInjectRuleBtn = domain.find(".addInjectRuleBtn");
        var expandBtn = domain.find(".expandBtn");
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

        domainMatchInput.val(savedData.matchUrl || "");
        onOffBtn[0].isOn = savedData.on === false ? false : true;

        var expandToggle = function() {
            if (expandBtn.html() === "+") {
                expandBtn.html("&ndash;");
                expandBtn.addClass("expanded");
                overrideRulesContainer.slideDown();
            } else {
                expandBtn.html("+");
                expandBtn.removeClass("expanded");
                overrideRulesContainer.slideUp();
            }
        };

        addRuleBtn.on("click", function() {
            if (!expandBtn.hasClass("expanded")) {
                expandToggle();
            }
            overrideRulesContainer.append(createWebOverrideMarkup({}, saveFunc));
        });

        domainMatchInput.on("keyup", saveFunc);
        onOffBtn.on("click change", saveFunc);

        addFileRuleBtn.on("click", function() {
            if (!expandBtn.hasClass("expanded")) {
                expandToggle();
            }
            overrideRulesContainer.append(createFileOverrideMarkup({}, saveFunc));
        });

        addInjectRuleBtn.on("click", function() {
            if (!expandBtn.hasClass("expanded")) {
                expandToggle();
            }
            overrideRulesContainer.append(createFileInjectMarkup({}, saveFunc));
        });

        expandBtn.on("click", expandToggle);
        deleteBtn.on("click", function() {
            chrome.extension.sendMessage({action: "deleteDomain", id: id});
            domain.fadeOut(function() {
                domain.remove();
            });
            skipNextSync = true;
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
        var domainList = $("#domainDefs");
        files = {};
        domainList.children().remove();
        chrome.extension.sendMessage({action: "getDomains"}, function(domains) {
            if (domains.length) {
                domains.forEach(function(domain) {
                    var domainMarkup = createDomainMarkup(domain);
                    domainList.append(domainMarkup);
                });
            } else {
                var newDomain = createDomainMarkup({rules: [{type:"normalOverride"}]});
                domainList.append(newDomain);
                newDomain.find(".domainMatchInput").val("*");
                chrome.extension.sendMessage({
                    action: "saveDomain",
                    data: getDomainData(newDomain)
                });
                skipNextSync = true;
            }
        });
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
        domainTemplate = $("#domainTemplate");
        overrideTemplate = $("#overrideTemplate");
        fileOverrideTemplate = $("#fileOverrideTemplate");
        fileInjectTemplate = $("#fileInjectTemplate");
        onOffSwitchTemplate = $("#onOffSwitchTemplate");

        if (domainTemplate.length === 0) {
            // init was called too early (options page case) so give up.
            return;
        }

        setupSynchronizeConnection();

        renderData();

        $("#addDomainBtn").on("click", function() {
            var domainList = $("#domainDefs");
            var newDomain = createDomainMarkup();
            domainList.append(newDomain);
            chrome.extension.sendMessage({action: "saveDomain", data: getDomainData(newDomain)});
            skipNextSync = true;
        });

        $("#fileSaveBtn").on("click", function() {
            $("#editorOverlay").hide();
            files[editingFile] = editor.doc.getValue();
            lastSaveFunc();
        });

        $("#fileCancelBtn").on("click", function() {
            $("#editorOverlay").hide();
        });

        $("#helpBtn").on("click", function() {
            $("#helpOverlay").toggle();
        });

        $("#helpCloseBtn").on("click", function() {
            $("#helpOverlay").hide();
        });

        $("#loadSelect").on("change", function() {
            var url = $(this).val();
            $(this).val("");
            if (url) {
                var ext = (url.match(/\.[^\.]+$/) || [""])[0];
                var fileTypes = {
                    ".js": "javascript",
                    ".html": "htmlmixed",
                    ".css": "css",
                    ".xml": "xml"
                };
                var mode = fileTypes[ext];
                chrome.extension.sendMessage({action: "makeGetRequest", url: url}, function(data) {
                    editor.doc.setValue(data);
                    if (mode) {
                        $("#syntaxSelect").val(mode);
                        editor.setOption("mode", mode);
                    }
                });
            }
        });

        $("#syntaxSelect").on("change", function() {
            editor.setOption("mode", $(this).val());
        });

        $("#beautifyJS").on("click", function() {
            editor.doc.setValue(js_beautify(editor.doc.getValue()));
        });

        var showDevToolsCB = $("#showDevTools");
        showDevToolsCB.on("click", function() {
            chrome.extension.sendMessage({
                action: "setSetting",
                setting: "devTools",
                value: showDevToolsCB.prop("checked")
            });
        });

        chrome.extension.sendMessage({action: "getSetting", setting: "devTools"}, function(data) {
            showDevToolsCB.prop("checked", data === "true");
        });
    }

    window.init = init;
    init();

})();// end script-wide closure
