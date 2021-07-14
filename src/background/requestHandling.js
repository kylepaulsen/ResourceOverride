/* global bgapp, match, matchReplace, browser */
{
    const logOnTab = bgapp.util.logOnTab;

    const replaceContent = (requestId, mimeAndFile) => {
        if (browser.webRequest.filterResponseData) {
            // browsers that support filterResponseData
            browser.webRequest.filterResponseData(requestId).onstart = e => {
                const encoder = new TextEncoder();
                e.target.write(encoder.encode(mimeAndFile.file));
                e.target.disconnect();
            };
            return {
                cancel: true,
                responseHeaders: [{
                    name: "Content-Type",
                    value: mimeAndFile.mime
                }]
            };
        }

        // browsers that dont support filterResponseData
        return {
            // unescape is a easy solution to the utf-8 problem:
            // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa#Unicode_Strings
            redirectUrl: "data:" + mimeAndFile.mime + ";charset=UTF-8;base64," +
                btoa(unescape(encodeURIComponent(mimeAndFile.file)))
        };
    };

    bgapp.handleRequest = function(requestUrl, tabUrl, tabId, requestId) {
        for (const key in bgapp.ruleDomains) {
            const domainObj = bgapp.ruleDomains[key];
            if (domainObj.on && match(domainObj.matchUrl, tabUrl).matched) {
                const rules = domainObj.rules || [];
                for (let x = 0, len = rules.length; x < len; ++x) {
                    const ruleObj = rules[x];
                    if (ruleObj.on) {
                        if (ruleObj.type === "normalOverride") {
                            const matchedObj = match(ruleObj.match, requestUrl);
                            const newUrl = matchReplace(matchedObj, ruleObj.replace, requestUrl);
                            if (matchedObj.matched) {
                                logOnTab(tabId, "URL Override Matched: " + requestUrl +
                                    "   to:   " + newUrl + "   match url: " + ruleObj.match, true);
                                if (requestUrl !== newUrl) {
                                    return {redirectUrl: newUrl};
                                } else {
                                    // allow redirections to the original url (aka do nothing).
                                    // This allows for "redirect all of these except this."
                                    return;
                                }
                            }
                        } else if (ruleObj.type === "fileOverride" &&
                            match(ruleObj.match, requestUrl).matched) {

                            logOnTab(tabId, "File Override Matched: " + requestUrl + "   match url: " +
                                ruleObj.match, true);

                            const mimeAndFile = bgapp.extractMimeType(requestUrl, ruleObj.file);
                            return replaceContent(requestId, mimeAndFile);
                        }
                    }
                }
                logOnTab(tabId, "No override match for: " + requestUrl);
            } else {
                logOnTab(tabId, "Rule is off or tab URL does not match: " + domainObj.matchUrl);
            }
        }
    };
}
