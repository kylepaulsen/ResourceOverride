import { clearAllNetRequestRules } from "./netRequestRules.js";

/* global chrome */

// Matches the storage keys that hold file rule bodies ("f1", "f2", ...) and the
// key that holds the rule groups themselves. Anything else (options, notices)
// is left alone.
const isRuleDataKey = (key) => key === "ruleGroups" || (/^f[0-9]+$/).test(key);

// Removes every stored rule group, every stored file body and every dynamic
// declarativeNetRequest rule. Returns the keys that were removed so callers can
// tell whether there was anything to clear.
export const clearAllRuleData = async () => {
    const allData = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allData).filter(isRuleDataKey);
    if (keysToRemove.length) {
        await chrome.storage.local.remove(keysToRemove);
    }
    await clearAllNetRequestRules();
    return keysToRemove;
};

export default clearAllRuleData;
