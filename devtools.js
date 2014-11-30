chrome.extension.sendMessage({action: "getSetting", setting: "devTools"}, function(data) {
    if (data === "true") {
        chrome.devtools.panels.create("Overrides",
            "", //image file
            "devtoolstab.html",
            function(panel) {}
        );
    }
});
