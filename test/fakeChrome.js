// Minimal chrome/DOM stubs so the import/export logic can run outside a browser.
// Import this module before the modules under test so that the globals exist
// by the time they are evaluated.

const store = {};

const fakeElement = {
    innerHTML: "",
    textContent: "",
    value: "",
    style: {},
    classList: {
        add() {},
        remove() {},
        contains() {
            return false;
        }
    },
    setAttribute() {},
    removeAttribute() {},
    querySelectorAll() {
        return [];
    }
};

if (!globalThis.document) {
    globalThis.document = {
        querySelector: () => fakeElement,
        querySelectorAll: () => [],
        getElementById: () => fakeElement,
        createElement: () => fakeElement,
        importNode: () => fakeElement
    };
}

globalThis.chrome = {
    storage: {
        local: {
            get: async (keys) => {
                // A null/undefined key list means "everything", matching the real API.
                if (keys === null || keys === undefined) {
                    return { ...store };
                }
                const ans = {};
                if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        if (key in store) {
                            ans[key] = store[key];
                        }
                    });
                } else {
                    Object.keys(keys || {}).forEach(key => {
                        ans[key] = key in store ? store[key] : keys[key];
                    });
                }
                return ans;
            },
            set: async (data) => {
                Object.assign(store, data);
            },
            remove: async (keys) => {
                (Array.isArray(keys) ? keys : [keys]).forEach(key => delete store[key]);
            }
        }
    },
    runtime: {
        sendMessage: async () => {}
    }
};

// Records every declarativeNetRequest mutation so tests can assert on them.
globalThis.__removedDnrRuleIds = [];
globalThis.__addedDnrRules = [];
globalThis.__updateDynamicRulesCalls = 0;

let dynamicRules = [];

// Mirrors the real ceiling. Chrome refuses a call that would push the number of
// dynamic regex rules past this, and rejects the whole call rather than part of it.
const REGEX_RULE_LIMIT = 1000;
let regexRuleLimit = REGEX_RULE_LIMIT;

globalThis.chrome.declarativeNetRequest = {
    MAX_NUMBER_OF_REGEX_RULES: REGEX_RULE_LIMIT,
    MAX_NUMBER_OF_DYNAMIC_RULES: 30000,
    getDynamicRules: async () => dynamicRules.slice(),
    updateDynamicRules: async ({ removeRuleIds = [], addRules = [] } = {}) => {
        const removeSet = new Set(removeRuleIds);
        const remaining = dynamicRules.filter(rule => !removeSet.has(rule.id));
        // The ceiling is checked before the call is applied, so a rejected call
        // leaves the previous rules untouched.
        if (remaining.length + addRules.length > regexRuleLimit) {
            throw new Error("Dynamic rule count for regex rules exceeded.");
        }
        globalThis.__updateDynamicRulesCalls++;
        globalThis.__removedDnrRuleIds.push(...removeRuleIds);
        globalThis.__addedDnrRules.push(...addRules);
        dynamicRules = remaining.concat(addRules);
        return undefined;
    }
};

export const resetDnr = (rules = []) => {
    dynamicRules = rules.slice();
    globalThis.__removedDnrRuleIds = [];
    globalThis.__addedDnrRules = [];
    globalThis.__updateDynamicRulesCalls = 0;
};

// Lowers the simulated ceiling so the oversized-rule-set path can be exercised.
export const setRegexRuleLimit = (limit) => {
    regexRuleLimit = limit;
};

export const resetRegexRuleLimit = () => {
    regexRuleLimit = REGEX_RULE_LIMIT;
};

export const getDynamicRules = () => dynamicRules.slice();

export const resetStore = (data = {}) => {
    Object.keys(store).forEach(key => delete store[key]);
    Object.assign(store, data);
};

export const getStore = () => store;
