(function() {
    "use strict";

    let fileTypeToTag = {
        js: "script",
        css: "style"
    };

    let processRuleGroup = function(ruleGroup) {
        let rules = ruleGroup.rules || [];
        rules.forEach(function(rule) {
            if (rule.on && rule.type === "fileInject") {
                let newEl = document.createElement(fileTypeToTag[rule.fileType] || "script");
                newEl.appendChild(document.createTextNode(rule.file));
                if (rule.injectLocation === "head") {
                    let firstEl = document.head.children[0];
                    if (firstEl) {
                        document.head.insertBefore(newEl, firstEl);
                    } else {
                        document.head.appendChild(newEl);
                    }
                } else {
                    if (document.body) {
                        document.body.appendChild(newEl);
                    } else {
                        document.addEventListener("DOMContentLoaded", function() {
                            document.body.appendChild(newEl);
                        });
                    }
                }
            }
        });
    };

    chrome.runtime.sendMessage({action: "getStorage"}, function(ruleGroups) {
        ruleGroups = ruleGroups || [];
        console.log("!!!!!!", ruleGroups);
        ruleGroups.forEach(function(ruleGroup) {
            if (ruleGroup.on) {
                processRuleGroup(ruleGroup);
            }
        });
    });
})();
