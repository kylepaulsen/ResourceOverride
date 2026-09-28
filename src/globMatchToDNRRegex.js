const replaceStartingAt = (str, replaceMatch, replaceWith, idx) => {
    return str.substring(0, idx) + str.substring(idx).replace(replaceMatch, replaceWith);
};

const globMatchToDNRRegex = (globStr, replaceStr = "") => {
    const escapedGlobStr = globStr.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const escapedReplaceStr = replaceStr.replace(/[\\]/g, '\\$&');
    const replaceStars = escapedReplaceStr.match(/(\*+)/g) || [];
    const replaceStarsCounts = {};
    replaceStars.forEach(replaceStar => {
        const numStars = replaceStar.length;
        if (!replaceStarsCounts[numStars]) {
            replaceStarsCounts[numStars] = 0;
        }
        replaceStarsCounts[numStars]++;
    });

    const captureGroups = {};
    let captureGroupIdx = 1;
    let newMatchStr = escapedGlobStr;
    let lastMatchLocation = 0;
    const globStars = escapedGlobStr.match(/(\*+)/g) || [];
    globStars.forEach(globStar => {
        const numStars = globStar.length;
        let replaceWith = ".*";
        if (replaceStarsCounts[numStars] && captureGroupIdx < 10) {
            replaceStarsCounts[numStars]--;
            if (!captureGroups[numStars]) {
                captureGroups[numStars] = [];
            }
            captureGroups[numStars].push(captureGroupIdx);
            captureGroupIdx++;
            replaceWith = "(.*)";
        }
        const newLastMatchLocation = newMatchStr.indexOf(globStar, lastMatchLocation) + replaceWith.length;
        newMatchStr = replaceStartingAt(newMatchStr, globStar, replaceWith, lastMatchLocation);
        lastMatchLocation = newLastMatchLocation;
    });

    lastMatchLocation = 0;
    let newReplaceStr = escapedReplaceStr;
    replaceStars.forEach(replaceStar => {
        const numStars = replaceStar.length;
        const captureGroup = captureGroups[numStars] || [];
        const captureIndex = captureGroup.shift();
        let replaceWith = "*".repeat(numStars);
        if (captureIndex) {
            replaceWith = `\\${captureIndex}`;
        }
        const newLastMatchLocation = newReplaceStr.indexOf(replaceStar, lastMatchLocation) + replaceWith.length;
        newReplaceStr = replaceStartingAt(newReplaceStr, replaceStar, replaceWith, lastMatchLocation);
        lastMatchLocation = newLastMatchLocation;
    });

    return {
        match: newMatchStr,
        replace: newReplaceStr
    };
};

// if (typeof module === "object" && module.exports) {
//     module.exports = globMatchToDNRRegex;
// }

export default globMatchToDNRRegex;
