// Run with: node test/clearAllTest.js
import { resetStore, getStore, resetDnr } from "./fakeChrome.js";
import { clearAllRuleData } from "../src/clearAll.js";

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message} (${JSON.stringify(actual)}) !== (${JSON.stringify(expected)})`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

// --- clearing removes groups, file bodies and dynamic rules ---
resetStore({
    ruleGroups: [{ id: 1, name: "example.com", on: true, rules: [] }],
    f1: "alert(1)",
    f7: "body { color: red; }"
});
resetDnr([{ id: 1 }, { id: 2 }]);
await clearAllRuleData();

assertEqual(getStore().ruleGroups, undefined, "Rule groups should be removed");
assertEqual(getStore().f1, undefined, "File body f1 should be removed");
assertEqual(getStore().f7, undefined, "File body f7 should be removed");
assertEqual(
    globalThis.__removedDnrRuleIds.length,
    2,
    "Every dynamic DNR rule should have been removed"
);
assertEqual(
    globalThis.__addedDnrRules.length,
    0,
    "Clearing must not add any dynamic DNR rule"
);

// --- unrelated settings (options, notices) survive ---
resetStore({
    ruleGroups: [{ id: 1, name: "example.com", on: true, rules: [] }],
    optionDevTools: false,
    tabPageNotice: true
});
resetDnr([{ id: 1 }]);
await clearAllRuleData();

assertEqual(getStore().optionDevTools, false, "Option settings must be preserved");
assertEqual(getStore().tabPageNotice, true, "Page notices must be preserved");
assertEqual(getStore().ruleGroups, undefined, "Rule groups should still be cleared");

// --- clearing an already empty store is a no-op and does not throw ---
resetStore({});
resetDnr([]);
const removedKeys = await clearAllRuleData();
assertEqual(removedKeys.length, 0, "Nothing should be reported as removed");
assertEqual(globalThis.__removedDnrRuleIds.length, 0, "No DNR call is needed when there are no rules");

// --- the returned keys describe exactly what was removed ---
resetStore({ ruleGroups: [], f3: "x", optionDevTools: true });
resetDnr([]);
const reportedKeys = await clearAllRuleData();
assertEqual(reportedKeys.length, 2, "Should report two removed keys");
assert(reportedKeys.includes("ruleGroups"), "Should report ruleGroups as removed");
assert(reportedKeys.includes("f3"), "Should report f3 as removed");
assert(!reportedKeys.includes("optionDevTools"), "Should not report options as removed");

console.log("All clear-all tests succeeded!");
