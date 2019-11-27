/* global bgapp, match */
{
    bgapp.makeHeaderHandler = function(type) {
        return function(details) {
            const headers = details[type + "Headers"];
            if (details.tabId > -1 && headers) {
                let tabUrl = bgapp.tabUrlTracker.getUrlFromId(details.tabId);
                if (details.type === "main_frame") {
                    // a new tab must have just been created.
                    tabUrl = details.url;
                }
                if (tabUrl) {
                    return handleHeaders(type, details.url, tabUrl, headers, details.tabId);
                }
            }
        };
    };

    const parseHeaderDataStr = function(headerDataStr) {
        const ans = [];
        const rules = headerDataStr.split(";");
        const len = rules.length;
        for (let x = 0; x < len; x++) {
            const rule = rules[x];
            const ruleParts = rule.split(": ");
            if (ruleParts[0].indexOf("set") === 0) {
                if (ruleParts.length === 2) {
                    ans.push({
                        operation: "set",
                        name: decodeURIComponent(ruleParts[0].substring(4)).toLowerCase(),
                        value: decodeURIComponent(ruleParts[1])
                    });
                }
            } else if (ruleParts[0].indexOf("remove") === 0) {
                ans.push({
                    operation: "remove",
                    name: decodeURIComponent(ruleParts[0].substring(7)).toLowerCase()
                });
            }
        }
        return ans;
    };

    const makeHeadersObject = function(headers) {
        const ans = {};
        const len = headers.length;
        for (let x = 0; x < len; x++) {
            const header = headers[x];
            ans[header.name.toLowerCase()] = header;
        }
        return ans;
    };

    const processRule = function(ruleObj, type, requestUrl, tabUrl, headers, tabId) {
        const headerObjToReturn = {};
        const headerObjToReturnKey = type + "Headers";
        headerObjToReturn[headerObjToReturnKey] = headers;
        if (ruleObj.on && ruleObj.type === "headerRule" && match(ruleObj.match, requestUrl).matched) {
            const rulesStr = ruleObj[type + "Rules"];
            bgapp.util.logOnTab(tabId, "Header Rule Matched: " + requestUrl +
                " applying rules: " + rulesStr, true);
            const headerRules = parseHeaderDataStr(rulesStr);
            const headersObj = makeHeadersObject(headers);
            const numRules = headerRules.length;
            for (let t = 0; t < numRules; t++) {
                const rule = headerRules[t];
                if (rule.operation === "set") {
                    headersObj[rule.name] = {
                        name: rule.name,
                        value: rule.value
                    };
                } else {
                    if (headersObj[rule.name]) {
                        headersObj[rule.name] = undefined;
                    }
                }
            }
            const newHeaders = [];
            for (const headerKey in headersObj) {
                const header = headersObj[headerKey];
                if (header) {
                    newHeaders.push(header);
                }
            }
            headerObjToReturn[headerObjToReturnKey] = newHeaders;
            return headerObjToReturn;
        }
    };

    const processTabGroup = function(domainObj, type, requestUrl, tabUrl, headers, tabId) {
        const headerObjToReturn = {};
        const headerObjToReturnKey = type + "Headers";
        headerObjToReturn[headerObjToReturnKey] = headers;
        if (domainObj.on && match(domainObj.matchUrl, tabUrl).matched) {
            const rules = domainObj.rules || [];
            for (let x = 0, len = rules.length; x < len; ++x) {
                const ruleObj = rules[x];
                const ruleResults = processRule(ruleObj, type, requestUrl, tabUrl, headers, tabId);
                if (ruleResults) {
                    return ruleResults;
                }
            }
        }
        return headerObjToReturn;
    };

    const handleHeaders = function(type, requestUrl, tabUrl, headers, tabId) {
        const headerObjToReturn = {};
        const headerObjToReturnKey = type + "Headers";
        headerObjToReturn[headerObjToReturnKey] = headers;
        for (const key in bgapp.ruleDomains) {
            const domainObj = bgapp.ruleDomains[key];
            return processTabGroup(domainObj, type, requestUrl, tabUrl, headers, tabId);
        }
        return headerObjToReturn;
    };
}
