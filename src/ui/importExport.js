(function() {
    "use strict";

    /* globals $, chrome */

    const app = window.app;
    const util = app.util;

    function checkRule(rule) {
        let valid = true;
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
        } else if (rule.type === "headerRule") {
            valid = valid && rule.match !== undefined;
            valid = valid && rule.requestRules !== undefined;
            valid = valid && rule.responseRules !== undefined;
            valid = valid && rule.on !== undefined;
        }
        return valid;
    }

    function checkDomain(domain) {
        let valid = (/^d[0-9]+$/).test(domain.id);
        valid = valid && domain.matchUrl !== undefined;
        valid = valid && domain.on !== undefined;
        valid = valid && $.isArray(domain.rules);
        valid = valid && domain.rules.every(checkRule);
        return valid;
    }

    function importData(data, version) {
        // check data first.
        if ($.isArray(data) && data.every(checkDomain)) {
            // this will call the sync function so stuff will get re-rendered.
            chrome.runtime.sendMessage({action: "import", data: data});
            util.showToast("Load Succeeded!");
        } else {
            util.showToast("Load Failed: Invalid Resource Override JSON.");
        }
    }

    function exportData() {
        const allData = [];
        $(".domainContainer").each(function(idx, domain) {
            allData.push(app.getDomainData($(domain)));
        });
        return {v: 1, data: allData};
    }

    app.import = importData;
    app.export = exportData;

})();
