var matchReplace = require("../match");

function assert(val, expected) {
    if (val !== expected) {
        throw new Error("An assert failed! " + val + " !== " + expected);
    }
}

assert(matchReplace("asd", "qwe", "asd"), "qwe");
assert(matchReplace("asd", "qwe", "asd "), "asd ");
assert(matchReplace("asd*", "qwe", "asd"), "qwe");
assert(matchReplace("asd*", "qwe", "asd "), "qwe");
assert(matchReplace("asd*", "qwe", "asdzxc"), "qwe");
assert(matchReplace("asd*", "qwe", " asd"), " asd");
assert(matchReplace("*asd", "qwe", "asd"), "qwe");
assert(matchReplace("*asd", "qwe", "asd "), "asd ");
assert(matchReplace("*asd", "qwe", "zxcasd"), "qwe");
assert(matchReplace("*asd*", "qwe", "asd"), "qwe");
assert(matchReplace("*asd*", "qwe", "zxcasd"), "qwe");
assert(matchReplace("*asd*", "qwe", "asdzxc"), "qwe");
assert(matchReplace("*asd*", "qwe", "zxcasd123"), "qwe");
assert(matchReplace("*asd*", "qwe", "zxca5d123"), "zxca5d123");
assert(matchReplace("asd*", "qwe*", "asd"), "qwe");
assert(matchReplace("asd*", "qwe*", "asdzxc"), "qwezxc");
assert(matchReplace("asd*", "qwe*", "a2dzxc"), "a2dzxc");
assert(matchReplace("asd*", "*qwe", "asd"), "qwe");
assert(matchReplace("asd*", "*qwe", "asdzxc"), "zxcqwe");
assert(matchReplace("asd*", "*qwe", "1asdzxc"), "1asdzxc");
assert(matchReplace("asd*", "*qwe", "a2dzxc"), "a2dzxc");
assert(matchReplace("*asd", "qwe*", "asd"), "qwe");
assert(matchReplace("*asd", "qwe*", "zxcasd"), "qwezxc");
assert(matchReplace("*asd", "qwe*", "asdz"), "asdz");
assert(matchReplace("*asd", "qwe*", "a2d"), "a2d");
assert(matchReplace("*asd*", "*qwe*", "asd"), "qwe");
assert(matchReplace("*asd*", "*qwe*", "zxcasd123"), "zxcqwe123");
assert(matchReplace("*asd*", "*qwe*", "zxca2d123"), "zxca2d123");
assert(matchReplace("asd*qwe**", "123*456**", "asdqwe"), "123456");
assert(matchReplace("asd*qwe**", "123*456**", "asdfghqwe"), "123fgh456");
assert(matchReplace("asd*qwe**", "123*456**", "asdqwefgh"), "123456fgh");
assert(matchReplace("asd*qwe**", "123*456**", "asdfghqwerty"), "123fgh456rty");
assert(matchReplace("asd*qwe**", "123*456**", "qasdqwe"), "qasdqwe");
assert(matchReplace("asd*qwe**", "123*456**", "qasdnnqwe"), "qasdnnqwe");
assert(matchReplace("asd**qwe*", "123*456**", "asdqwe"), "123456");
assert(matchReplace("asd**qwe*", "123*456**", "asdfghqwe"), "123456fgh");
assert(matchReplace("asd**qwe*", "123*456**", "asdqwefgh"), "123fgh456");
assert(matchReplace("asd**qwe*", "123*456**", "asdfghqwerty"), "123rty456fgh");
assert(matchReplace("asd**qwe*", "123*456**", "qasdqwe"), "qasdqwe");
assert(matchReplace("asd**qwe*", "123*456**", "qasdnnqwe"), "qasdnnqwe");
assert(matchReplace("asd**qwe*zxc**Q", "123**456**789*0", "asd$%$qwe^&zxc!@Q"), "123$%$456!@789^&0");
assert(matchReplace("asd**qwe*zxc**Q", "123**456**789*0", "asd$%$qwe^&zxcQ"), "123$%$456789^&0");
assert(matchReplace("asd**qwe*zxc**Q", "123**456**789*0", "asd$%$qWe^&zxc!@Q"), "asd$%$qWe^&zxc!@Q");
assert(matchReplace("a*b**c***d", "e***f*g**h****", "a1b2c3d"), "e3f1g2h****");
assert(matchReplace("a*b**c***d", "e***f*g**h****", "a1bc3d"), "e3f1gh****");
assert(matchReplace("a*b**c***d", "e***f*g**h****", "aaabbccccd"), "ecccfaagbh****");
assert(matchReplace("a*b**c***d", "e***f*g**h****", "aaaccccd"), "aaaccccd");
assert(matchReplace("a*b**c***d", "e***f*g**h****", "a**b***c*d"), "e*f**g***h****");

console.log("All tests succeeded!");
