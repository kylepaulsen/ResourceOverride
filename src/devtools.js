/* global chrome */

const init = async () => {
    const settings = await chrome.storage.local.get({
        optionDevTools: true,
    });

    if (settings.optionDevTools) {
        chrome.devtools.panels.create("Overrides",
            "", //image file
            "/src/devtoolstab.html",
            (/* panel */) => {}
        );
    }
};

init();
