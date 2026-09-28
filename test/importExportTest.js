// Run with: node --experimental-default-type=module test/importExportTest.js
import { resetStore, getStore } from "./fakeChrome.js";
import { importData, exportData } from "../src/importExport.js";

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

const startingData = {
    ruleGroups: [
        {
            id: 1,
            name: "example.com",
            on: true,
            rules: [
                { id: 1, type: "normalOverride", match: "example.com/a.js", replace: "example.com/b.js", on: true },
                { id: 2, type: "fileOverride", match: "example.com/c.css", on: true }
            ]
        }
    ],
    f2: "body { color: red; }"
};

// --- export produces the documented v2 shape ---
resetStore(startingData);
const exported = await exportData();
assertEqual(exported.v, 2, "Exported version should be 2");
assert(Array.isArray(exported.data), "Exported payload must live under the \"data\" key");
assertEqual(exported.ruleGroups, undefined, "Exported payload must not also use the legacy \"ruleGroups\" key");
assertEqual(exported.data.length, 1, "Should export one rule group");
assertEqual(exported.data[0].name, "example.com", "Rule group name should be exported");
assertEqual(exported.data[0].rules[1].file, "body { color: red; }", "File rule should carry its content");
assertEqual(
    getStore().ruleGroups[0].rules[1].file,
    undefined,
    "Exporting must not mutate the stored rules"
);

// --- a legacy "matchUrl" group is still readable and exports as "name" ---
resetStore({
    ruleGroups: [{ id: 1, matchUrl: "legacy.com", on: true, rules: [] }]
});
const exportedLegacy = await exportData();
assertEqual(exportedLegacy.data[0].name, "legacy.com", "Legacy matchUrl should export as name");

// --- round trip: export then import into an empty store ---
resetStore(startingData);
const payload = (await exportData()).data;
resetStore({});
assertEqual(await importData(payload, 2), true, "Importing exported data should succeed");

const importedGroups = getStore().ruleGroups;
assertEqual(importedGroups.length, 1, "One group should have been imported");
assertEqual(importedGroups[0].name, "example.com", "Imported group name should be preserved");
assertEqual(importedGroups[0].rules.length, 2, "Both rules should have been imported");
const importedFileRule = importedGroups[0].rules[1];
assertEqual(
    getStore()[`f${importedFileRule.id}`],
    "body { color: red; }",
    "Imported file content should be stored under the new rule id"
);

// --- importing a legacy v1 payload (matchUrl, no name) still works ---
resetStore({});
const v1Payload = [{ matchUrl: "old.example.com", on: true, rules: [
    { type: "normalOverride", match: "a", replace: "b", on: true }
] }];
assertEqual(await importData(v1Payload, 1), true, "v1 import should succeed");
assertEqual(getStore().ruleGroups[0].name, "old.example.com", "v1 matchUrl should become name");

// --- invalid input is rejected instead of silently storing junk ---
// The module logs the failure on purpose, so silence it for these assertions.
const realConsoleError = console.error;
console.error = () => {};
try {
    assertEqual(await importData(undefined, 2), false, "Undefined data should be rejected");
    assertEqual(await importData(payload, 99), false, "Unknown version should be rejected");
    assertEqual(await importData([{ on: true, rules: "nope" }], 2), false, "Malformed rules should be rejected");
} finally {
    console.error = realConsoleError;
}

// --- importing appends to existing rules instead of replacing them ---
resetStore(startingData);
const secondPayload = [{ id: 5, name: "added.com", on: true, rules: [] }];
assertEqual(await importData(secondPayload, 2), true, "Second import should succeed");
assertEqual(getStore().ruleGroups.length, 2, "Import should append to existing groups");

console.log("All import/export tests succeeded!");
