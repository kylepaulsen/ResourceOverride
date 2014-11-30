function tokenize(str) {
    "use strict";
    while (str.indexOf("**") > -1) {
        str = str.replace(/\*\*/g, "*");
    }
    var tokens = str.split("*");
    var ans = [];
    tokens.forEach(function(token) {
        ans.push(token);
        ans.push("*");
    });
    ans.pop();
    if (ans[0] === "") {
        ans.shift();
    }
    if (ans[ans.length - 1] === "") {
        ans.pop();
    }
    return ans;
}

function match(pattern, str) {
    "use strict";
    var patternTokens = tokenize(pattern);
    var freeVars = [];
    var strParts = str;
    var matchAnything = false;
    var completeMatch = patternTokens.every(function(token) {
        if (token === "*") {
            matchAnything = true;
        } else {
            var matches = strParts.split(token);
            if (matches.length > 1) {
                // The token was found in the string.
                var possibleFreeVar = matches.shift();
                if (possibleFreeVar !== "") {
                    // Found a possible candidate for the *.
                    if (!matchAnything) {
                        // But if we haven't seen a * for this freeVar,
                        // the string doesnt match the pattern.
                        return false;
                    }
                    freeVars.push(possibleFreeVar);
                }
                matchAnything = false;
                // We matched up part of the pattern to the string
                // prepare to look at the next part of the string.
                strParts = matches.join(token);
            } else {
                // The token wasn't found in the string. Pattern doesn't match.
                return false;
            }
        }
        return true;
    });

    if (strParts !== "") {
        if (!matchAnything) {
            // There is still some string part that didn't match up to the pattern.
            completeMatch = false;
        } else {
            // If we still need to match a string part up to a star,
            // match the rest of the string.
            freeVars.push(strParts);
        }
    }

    return {
        matched: completeMatch,
        freeVars: freeVars
    };
}

function matchReplace(pattern, replacePattern, str) {
    "use strict";
    var matchData = match(pattern, str);

    if (!matchData.matched) {
        // If the pattern didn't match.
        return str;
    }

    // Plug in the freevars in place of the stars.
    matchData.freeVars.forEach(function(freeVar) {
        replacePattern = replacePattern.replace("*", freeVar);
    });

    return replacePattern;
}
