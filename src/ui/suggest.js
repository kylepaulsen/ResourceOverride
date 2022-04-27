import { createEl } from "./util.js";

const suggest = () => {
    const suggestTableMaxHeight = 100;
    let suggestBox;
    let suggestTable;
    let currentInput;
    let appended = false;
    let selectedIndex = 0;
    let numOptions = 0;
    let hideTillNextFocus = false;
    let options;
    let shouldSuggest = true;

    function fillOptions(opts) {
        suggestTable.innerHTML = "";
        numOptions = 0;
        options = [];
        opts.forEach((option) => {
            const newRow = createEl("tr");
            const newRowContent = createEl("td.suggestOption");
            newRow.appendChild(newRowContent);
            newRowContent.textContent = option;
            newRowContent.addEventListener("mousedown", () => {
                completeInput(currentInput, newRowContent);
            });
            suggestTable.appendChild(newRow);
            options.push(newRow);
            ++numOptions;
        });
    }

    function init(input, useStars, caseInsensitive) {
        if (!suggestBox) {
            suggestBox = createEl("div.suggestBox");
            suggestTable = createEl("table.suggestTable");
            suggestBox.appendChild(suggestTable);
        }

        const keyUpFunc = (e) => {
            if (shouldSuggest) {
                const code = e.which;
                if ((code < 37 || code > 40) && code !== 13) {
                    // not the arrow keys or enter or ESC.
                    filterOptions(input.value, useStars, caseInsensitive);
                }
            }
        };

        if (input) {
            input.addEventListener("focus", () => {
                if (shouldSuggest) {
                    const boundingRect = input.getBoundingClientRect();
                    hideTillNextFocus = false;
                    currentInput = input;
                    suggestBox.style.top = (boundingRect.top + boundingRect.height + 5) + "px";
                    suggestBox.style.left = boundingRect.left + "px";
                    suggestBox.style.maxWidth = (boundingRect.width + 6) + "px";
                    show();
                    selectedIndex = 0;
                    filterOptions(input.value, useStars, caseInsensitive);
                }
            });

            input.addEventListener("keydown", (e) => {
                if (shouldSuggest) {
                    const code = e.which;
                    if (code === 38) { // UP
                        e.preventDefault();
                        selectUp(true);
                    } else if (code === 40) { // DOWN
                        e.preventDefault();
                        selectDown(true);
                    } else if (code === 37) { // LEFT
                        suggestBox.scrollLeft -= 32;
                    } else if (code === 39) { // RIGHT
                        suggestBox.scrollLeft += 32;
                    } else if (code === 13 || code === 9) { // Enter or Tab
                        completeInput(input);
                        suggestBox.style.display = "none";
                    } else if (code === 27) { // ESC
                        suggestBox.style.display = "none";
                        hideTillNextFocus = true;
                    }
                    highlightOption();
                }
            });

            input.addEventListener("keyup", keyUpFunc);
        }

        if (!appended) {
            document.body.appendChild(suggestBox);
            appended = true;

            window.addEventListener("mousedown", (e) => {
                const target = e.target;
                if (target) {
                    if (target.classList.contains("suggestOption") || !target.closest(".suggestBox")) {
                        suggestBox.style.display = "none";
                    }
                }
            });

            suggestBox.addEventListener("mouseup", () => {
                const scrollTop = suggestBox.scrollTop;
                const lastShouldSuggest = shouldSuggest;
                // dont call the focus event handler... just focus the field.
                shouldSuggest = false;
                currentInput.focus();
                shouldSuggest = lastShouldSuggest;
                suggestBox.scrollTop = scrollTop;
            });
        }
    }

    function show() {
        if (!hideTillNextFocus) {
            suggestBox.style.display = "block";
        }
    }

    function completeInput(input, option) {
        const selectedText = option ? option.textContent : options[selectedIndex].textContent;
        const val = input.value.replace(/\*+$/g, "");
        const inputParts = val.split("*");
        let x = inputParts.length - 1;
        let lastPart = inputParts[x];
        while (lastPart === "" && x > 0) {
            --x;
            lastPart = inputParts[x];
        }
        const lastIndex = selectedText.lastIndexOf(lastPart);
        if (inputParts.length > 1) {
            input.value = val + selectedText.substring(lastIndex + lastPart.length);
        } else {
            input.value = selectedText;
        }
        // ??? not sure what this is for
        const fakeEvent = new KeyboardEvent("keyup");
        input.dispatchEvent(fakeEvent);
    }

    function filterOptions(inputVal, useStars, caseInsensitive) {
        if (!options || options.length === 0) {
            return;
        }
        useStars = useStars === undefined ? true : useStars;
        if (caseInsensitive) {
            inputVal = inputVal.toLowerCase();
        }
        let searchParts = inputVal.split("*");
        if (!useStars) {
            searchParts = [inputVal];
        }
        let found;
        let allEmpty = true;
        let search;
        let allHiding = true;
        let option;
        let optionStr;
        let foundIndex;
        let searchedTo;
        let len;
        let x;
        let t = options.length;
        while (t-- > 0) {
            option = options[t];
            optionStr = option.textContent;
            if (caseInsensitive) {
                optionStr = optionStr.toLowerCase();
            }
            found = true;
            searchedTo = -1;
            for (x = 0, len = searchParts.length; x < len; ++x) {
                search = searchParts[x];
                if (search !== "") {
                    allEmpty = false;
                    foundIndex = optionStr.indexOf(search, searchedTo);
                    if (foundIndex === -1) {
                        found = false;
                        break;
                    } else {
                        searchedTo = foundIndex + search.length;
                    }
                }
            }
            if (found || allEmpty) {
                option.style.display = "table-row";
                allHiding = false;
            } else {
                option.style.display = "none";
            }
        }
        if (allHiding) {
            suggestBox.style.display = "none";
        } else {
            show();
        }
        if (options[selectedIndex].style.display === "none") {
            selectUp();
        }
        highlightOption();
        if (suggestTable.offsetHeight > suggestTableMaxHeight) {
            suggestTable.style.marginRight = "18px";
        } else {
            suggestTable.style.marginRight = "0";
        }
    }

    function selectDown(dontTryAgain) {
        const oldSelectedIndex = selectedIndex;
        let isVisible;
        do {
            selectedIndex = Math.min(selectedIndex + 1, numOptions - 1);
            isVisible = options[selectedIndex].style.display !== "none";
        } while (!isVisible && selectedIndex < numOptions - 1);

        if (!isVisible) {
            selectedIndex = oldSelectedIndex;
            if (!dontTryAgain) {
                selectUp(true);
            }
        }
    }

    function selectUp(dontTryAgain) {
        const oldSelectedIndex = selectedIndex;
        let isVisible;
        do {
            selectedIndex = Math.max(selectedIndex - 1, 0);
            isVisible = options[selectedIndex].style.display !== "none";
        } while (!isVisible && selectedIndex > 0);

        if (!isVisible) {
            selectedIndex = oldSelectedIndex;
            if (!dontTryAgain) {
                selectDown(true);
            }
        }
    }

    function highlightOption() {
        const optionToHighlight = options[0];
        options.forEach(option => {
            option.style.background = "#ffffff";
        });
        optionToHighlight.style.background = "#aaaaaa";
        fixScroll(optionToHighlight);
    }

    function fixScroll(optionToHighlight) {
        const suggestBoxScrollTop = suggestBox.scrollTop;
        const optionToHighlightHeight = optionToHighlight.offsetHeight;
        const suggestBoxHeight = suggestBox.offsetHeight;
        const heightInDiv = optionToHighlight.offsetTop - suggestBox.offsetTop + suggestBoxScrollTop;
        if (heightInDiv + optionToHighlightHeight > suggestBoxScrollTop + suggestBoxHeight) {
            let scrollBarOffset = 0;
            if (suggestTable.offsetWidth > suggestBox.offsetWidth) {
                scrollBarOffset = 8;
            }
            suggestBox.scrollTop = heightInDiv - suggestBoxHeight + optionToHighlightHeight + scrollBarOffset + 8;
        }
        if (heightInDiv < suggestBoxScrollTop) {
            suggestBox.scrollTop = heightInDiv;
        }
    }

    function setShouldSuggest(val) {
        shouldSuggest = val;
    }

    return {
        init: init,
        fillOptions: fillOptions,
        setShouldSuggest: setShouldSuggest
    };
};

export const mainSuggest = suggest();
export const requestHeadersSuggest = suggest();
export const responseHeadersSuggest = suggest();

export default suggest;
