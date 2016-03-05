(function() {
    "use strict";

    /* global alert, chrome */

    // This file should be able to support old chrome versions. So no es6.
    // Check to see if chrome verion is high enough for the devtools check.
    // http://stackoverflow.com/questions/27845834/typing-chrome-devtools-in-the-console-causes-a-hard-crash-of-chrome-browser
    var match = navigator.userAgent.match(/Chrom[^0-9]+([0-9]+)\./);
    if (match && match.length > 1) {
        var majorVersion = parseInt(match[1]);
        if (!isNaN(majorVersion) && majorVersion < 43) {
            // chrome is not a high enough version.
            // use ugly alert message to annoy people so they update.
            alert("RESOURCE OVERRIDE ERROR: Your version of chrome is too old! " +
                "Please update to version 43 or higher. Otherwise, expect crashes.");
        }
    }

    window.isOptionsPage = !chrome.devtools;
})();
