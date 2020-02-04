(function() {
    "use strict";

    /* globals chrome */

    const app = window.app;
    const ui = app.ui;
    const util = app.util;

    app.mainSuggest = app.suggest();
    app.requestHeadersSuggest = app.suggest();
    app.responseHeadersSuggest = app.suggest();
    app.files = {};
    app.skipNextSync = false;

    function renderData() {
        app.files = {};
        ui.domainDefs.children().remove();
        chrome.runtime.sendMessage({action: "getDomains"}, function(domains) {
            if (domains.length) {
                domains.forEach(function(domain) {
                    const domainMarkup = app.createDomainMarkup(domain);
                    ui.domainDefs.append(domainMarkup);
                });
            } else {
                const newDomain = app.createDomainMarkup({rules: [{type: "normalOverride"}]});
                ui.domainDefs.append(newDomain);
                newDomain.find(".domainMatchInput").val("*");
                chrome.runtime.sendMessage({
                    action: "saveDomain",
                    data: app.getDomainData(newDomain)
                });
                app.skipNextSync = true;
            }
            util.getTabResources(function(res) {
                app.mainSuggest.fillOptions(res);
            });
        });
    }

    function setupSynchronizeConnection() {
        chrome.runtime.sendMessage({action: "syncMe"}, function() {
            if (!app.skipNextSync) {
                renderData();
            }
            app.skipNextSync = false;
            setupSynchronizeConnection();
        });
    }

    function init() {
        app.mainSuggest.init();
        app.requestHeadersSuggest.init();
        app.responseHeadersSuggest.init();
        app.requestHeadersSuggest.fillOptions(app.headersLists.requestHeaders);
        app.responseHeadersSuggest.fillOptions(app.headersLists.responseHeaders);

        setupSynchronizeConnection();

        renderData();

        ui.addDomainBtn.on("click", function() {
            const newDomain = app.createDomainMarkup();
            newDomain.find(".domainMatchInput").val("*");
            ui.domainDefs.append(newDomain);
            chrome.runtime.sendMessage({action: "saveDomain", data: app.getDomainData(newDomain)});
            app.skipNextSync = true;
        });

        ui.helpBtn.on("click", function() {
            ui.helpOverlay.toggle();
        });

        ui.helpCloseBtn.on("click", function() {
            ui.helpOverlay.hide();
        });

        if (!chrome.devtools) {
            ui.showSuggestions.hide();
            ui.showSuggestionsText.hide();
            chrome.runtime.sendMessage({
                action: "getSetting",
                setting: "tabPageNotice"
            }, function(data) {

                if (data !== "true") {
                    ui.tabPageNotice.find("a").on("click", function(e) {
                        e.preventDefault();
                        chrome.runtime.sendMessage({
                            action: "setSetting",
                            setting: "tabPageNotice",
                            value: "true"
                        });
                        ui.tabPageNotice.fadeOut();
                    });
                    ui.tabPageNotice.fadeIn();
                    setTimeout(function() {
                        ui.tabPageNotice.fadeOut();
                    }, 6000);
                }
            });
        }

        if (navigator.userAgent.indexOf("Firefox") > -1 && !!chrome.devtools) {
            // Firefox is really broken with the "/" and "'" keys. They just dont work.
            // So try to fix them here.. wow.. just wow. I can't believe I'm fixing the ability to type.
            const brokenKeys = { "/": 1, "?": 1, "'": 1, '"': 1 };
            window.addEventListener("keydown", e => {
                const brokenKey = brokenKeys[e.key];
                const activeEl = document.activeElement;
                if (brokenKey && (activeEl.nodeName === "INPUT" || activeEl.nodeName === "TEXTAREA") &&
                    activeEl.className !== "ace_text-input") {

                    e.preventDefault();
                    const start = activeEl.selectionStart;
                    const end = activeEl.selectionEnd;
                    activeEl.value = activeEl.value.substring(0, start) + e.key +
                        activeEl.value.substring(end, activeEl.value.length);
                    activeEl.selectionStart = start + 1;
                    activeEl.selectionEnd = start + 1;
                }
            });
        }
    }

    init();

})();
