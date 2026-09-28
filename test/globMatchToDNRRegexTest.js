import globMatchToDNRRegex from "../src/globMatchToDNRRegex.js";

function assertObj(val, expected) {
    const valKeys = Object.keys(val);
    const expectedKeys = Object.keys(expected);
    if (valKeys.length !== expectedKeys.length) {
        throw new Error(`An assert failed! Objects have different amounts of keys [${
            valKeys.join(", ")}] !== [${expectedKeys.join(", ")}]`);
    }
    for (let x = 0; x < valKeys.length; x++) {
        const valKey = valKeys[x];
        if (val[valKey] !== expected[valKey]) {
            throw new Error(`An assert failed! Objects have different value for key ${valKey}. (${
                val[valKey]}) !== (${expected[valKey]})`);
        }
    }
}

assertObj(globMatchToDNRRegex(""), { match: "", replace: "" });
assertObj(globMatchToDNRRegex("", ""), { match: "", replace: "" });
assertObj(globMatchToDNRRegex("aaa"), { match: "aaa", replace: "" });
assertObj(globMatchToDNRRegex("aaa", "bbb"), { match: "aaa", replace: "bbb" });

assertObj(globMatchToDNRRegex("aaa*bbb"), { match: "aaa.*bbb", replace: "" });
assertObj(globMatchToDNRRegex("aaa***bbb"), { match: "aaa.*bbb", replace: "" });
assertObj(globMatchToDNRRegex("aa*ab*bb"), { match: "aa.*ab.*bb", replace: "" });
assertObj(globMatchToDNRRegex("aa*ab**bb"), { match: "aa.*ab.*bb", replace: "" });

assertObj(globMatchToDNRRegex("a[b]c(d)e^f|g.com?zzz=1&ppp=*"),
    { match: "a\\[b\\]c\\(d\\)e\\^f\\|g\\.com\\?zzz=1&ppp=.*", replace: "" });
assertObj(globMatchToDNRRegex("a[b]c(d)e**f|g.com?zzz=1&ppp=*", "a**b"),
    { match: "a\\[b\\]c\\(d\\)e(.*)f\\|g\\.com\\?zzz=1&ppp=.*", replace: "a\\1b" });

assertObj(globMatchToDNRRegex("aa*ab**bb", "z**x*c"), { match: "aa(.*)ab(.*)bb", replace: "z\\2x\\1c" });
assertObj(globMatchToDNRRegex("a*b**c***d**e", "z***x**c"), { match: "a.*b(.*)c(.*)d.*e", replace: "z\\2x\\1c" });
assertObj(globMatchToDNRRegex("a*b**c***d**e", "z***x****c**v**b**n"),
    { match: "a.*b(.*)c(.*)d(.*)e", replace: "z\\2x****c\\1v\\3b**n" });

console.log("All tests succeeded!");
