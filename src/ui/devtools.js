"use strict";

chrome.runtime.sendMessage({action: "getSetting", setting: "devTools"}, function(data) {
    if (data === "true") {
        chrome.devtools.panels.create("Overrides",
            "", //image file
            "/src/ui/devtoolstab.html",
            function(panel) {
                console.log(panel);
                panel.onShown.addListener(console.log);
                panel.onHidden.addListener(console.log);
            }
        );
    }
});
