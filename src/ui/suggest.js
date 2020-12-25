"use strict";

/* globals $ */

import {app} from './init.js';

function suggest() {
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
        opts.forEach(function(option) {
            const newRow = document.createElement("tr");
            const newRowContent = document.createElement("tr");
            newRowContent.className = "suggestOption";
            newRow.appendChild(newRowContent);
            newRowContent.textContent = option;
            newRowContent.addEventListener("mousedown", function(evt) {
                completeInput(currentInput, evt.target);
            });
            suggestTable.appendChild(newRow);
            options = [...suggestTable.getElementsByTagName("tr")];
            ++numOptions;
        });
    }

    function init(inputs, useStars, caseInsensitive) {
        if (!suggestBox) {
            suggestBox = document.createElement("DIV");
            suggestBox.className = "suggestBox";
            suggestTable = document.createElement("TABLE");
            suggestTable.className = "suggestTable";
            suggestBox.appendChild(suggestTable);
        }

        const keyUpFunc = function(e) {
            if (shouldSuggest) {
                const code = e.which;
                if ((code < 37 || code > 40) && code !== 13) {
                    // not the arrow keys or enter or ESC.
                    filterOptions(e.target.value, useStars, caseInsensitive);
                }
            }
        };

        if (inputs) {
            for(let el of inputs){
                el.addEventListener("focus", function(evt) {
                    if (shouldSuggest) {
                        const input = evt.target;
                        const offset = input.getBoundingClientRect();
                        hideTillNextFocus = false;
                        currentInput = input;
                        suggestBox.style.top = offset.top + offset.height + 5 + "px";
                        suggestBox.style.left = offset.left + "px";
                        suggestBox.style.maxWidth = offset.width + 6 + "px";
                        show();
                        selectedIndex = 0;
                        filterOptions(input.value, useStars, caseInsensitive);
                    }
                }, false);

                el.addEventListener("keydown", function(e) {
                    if (shouldSuggest) {
                        const code = e.which;
                        if (code === 38) { // UP
                            e.preventDefault();
                            selectUp(true);
                        } else if (code === 40) { // DOWN
                            e.preventDefault();
                            selectDown(true);
                        } else if (code === 37) { // LEFT
                            suggestBox.scrollLeft(suggestBox.scrollLeft() - 32);
                        } else if (code === 39) { // RIGHT
                            suggestBox.scrollLeft(suggestBox.scrollLeft() + 32);
                        } else if (code === 13 || code === 9) { // Enter or Tab
                            completeInput(e.target);
                            suggestBox.style.display = "none";
                        } else if (code === 27) { // ESC
                            suggestBox.style.display = "none";
                            hideTillNextFocus = true;
                        }
                        highlightOption();
                    }
                }, false);

                el.addEventListener("keyup", keyUpFunc, false);
            }
        }

        if (!appended) {
            document.body.appendChild(suggestBox);
            appended = true;

            window.addEventListener("mousedown", function(e) {
                const target = e.target;
                if (target.classList.contains("suggestOption") || !target.closest(".suggestBox")) {
                    suggestBox.style.display = "none";
                }
            }, false);

            suggestBox.addEventListener("mouseup", function(evt) {
                const lastShouldSuggest = shouldSuggest;
                // dont call the focus event handler... just focus the field.
                shouldSuggest = false;
                currentInput.focus();
                shouldSuggest = lastShouldSuggest;
                evt.target.scrollTop = evt.target.scrollTop;
            }, false);
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
                option.style.display = "block";
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
        if (suggestTable.getBoundingClientRect().height > suggestTableMaxHeight) {
            suggestTable.style.marginRight = "18px";
        } else {
            suggestTable.style.marginRight = "0px";
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
        const optionToHighlight = options[selectedIndex];
        options.forEach((e) => {e.style.background = "#fff";});
        optionToHighlight.style.background = "#aaa";
        fixScroll(optionToHighlight);
    }

    function fixScroll(optionToHighlight) {
        const optionToHighlightRect = optionToHighlight.getBoundingClientRect();
        const suggestBoxRect = suggestBox.getBoundingClientRect();
        const suggestTableRect = suggestTable.getBoundingClientRect();
        const heightInDiv = optionToHighlightRect.top - suggestBoxRect.top + suggestBox.scrollTop;
        if (heightInDiv + optionToHighlightRect.height > suggestBox.scrollTop + suggestBoxRect.height) {
            let scrollBarOffset = 0;
            if (suggestTableRect.width > suggestBoxRect.width) {
                scrollBarOffset = 8;
            }
            suggestBox.scrollTop = heightInDiv - suggestBoxRect.height + optionToHighlightRect.height + scrollBarOffset + 8;
        }
        if (heightInDiv < suggestBox.scrollTop) {
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
}

export {suggest};
