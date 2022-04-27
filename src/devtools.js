// chrome.runtime.sendMessage({action: "getSetting", setting: "devTools"}, function(data) {
//     if (data === "true") {
        chrome.devtools.panels.create("Overrides",
            "", //image file
            "/src/devtoolstab.html",
            function(panel) {}
        );
//     }
// });
