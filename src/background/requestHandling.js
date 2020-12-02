/* global bgapp, match, matchReplace */
{
    const logOnTab = bgapp.util.logOnTab;
    
    // Browser abstraction layers
    const BALs = {
        firefox: {
            replaceContent: (requestId, mimeAndFile) =>{
                browser.webRequest.filterResponseData(requestId).onstart = (evt) => {
                    console.log("evt", evt);
                    let encoder = new TextEncoder();
                    evt.target.write(encoder.encode(mimeAndFile.file));
                    evt.target.disconnect();
                };
                return {"responseHeadersOptional": [{"name":"Content-Type", "value":mimeAndFile.mime}]};
            },
        },
        chromium: {
            replaceContent: (requestId, mimeAndFile) =>{
                return {
                    // unescape is a easy solution to the utf-8 problem:
                    // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa#Unicode_Strings
                    redirectUrl: "data:" + mimeAndFile.mime + ";charset=UTF-8;base64," + btoa(unescape(encodeURIComponent(mimeAndFile.file)))
                };
            },
        }
    };

    let selectedBAL = null;

    try{
        browser.runtime.getBrowserInfo().then(info => {
            if(info["vendor"] == "Mozilla"){
                console.log("Selected Firefox BAL");
                selectedBAL = BALs.firefox;
            }
        });
    } catch (e){
        console.log("Selected Chromium BAL");
        selectedBAL = BALs.chromium;
    }


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
                            return selectedBAL.replaceContent(requestId, mimeAndFile);
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
