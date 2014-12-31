function tokenize(str) {
    "use strict";
    var starGroups = str.match(/\*+/g) || [];
    while (str.indexOf("**") > -1) {
        str = str.replace(/\*\*/g, "*");
    }
    var tokens = str.split("*");
    var ans = [];
    var x = 0;
    tokens.forEach(function(token) {
        ans.push(token);
        ans.push(starGroups[x++]);
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
    var freeVars = {};
    var varGroup;
    var strParts = str;
    var matchAnything = false;
    var completeMatch = patternTokens.every(function(token) {
        if (token.charAt(0) === "*") {
            matchAnything = true;
            varGroup = token.length;
            freeVars[varGroup] = freeVars[varGroup] || [];
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
                    freeVars[varGroup].push(possibleFreeVar);
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
            freeVars[varGroup].push(strParts);
        }
    }

    return {
        matched: completeMatch,
        freeVars: freeVars
    };
}

function replaceAfter(str, idx, match, replace) {
    return str.substring(0, idx) + str.substring(idx).replace(match, replace);
}

function matchReplace(pattern, replacePattern, str) {
    "use strict";
    var matchData = match(pattern, str);

    if (!matchData.matched) {
        // If the pattern didn't match.
        return str;
    }

    // Plug in the freevars in place of the stars.
    var starGroups = replacePattern.match(/\*+/g) || [];
    var currentStarGroupIdx = 0;
    starGroups.forEach(function(starGroup) {
        var freeVarGroup = matchData.freeVars[starGroup.length] || [];
        var freeVar = freeVarGroup.shift() || starGroup;
        replacePattern = replaceAfter(replacePattern, currentStarGroupIdx, starGroup, freeVar);
        currentStarGroupIdx = replacePattern.indexOf(freeVar) + freeVar.length;
    });

    return replacePattern;
}
