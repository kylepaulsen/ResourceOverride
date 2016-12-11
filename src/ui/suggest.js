(function() {
    "use strict";

    /* globals $ */

    const app = window.app;

    function suggest() {
        const suggestTableMaxHeight = 100;
        let $suggestBox;
        let $suggestTable;
        let $currentInput;
        let appended = false;
        let selectedIndex = 0;
        let numOptions = 0;
        let hideTillNextFocus = false;
        let options;
        let shouldSuggest = true;

        function fillOptions(opts) {
            $suggestTable.html("");
            numOptions = 0;
            opts.forEach(function(option) {
                const $newRow = $("<tr>");
                const $newRowContent = $("<td class='suggestOption'>");
                $newRow.append($newRowContent);
                $newRowContent.text(option);
                $newRowContent.on("mousedown", function() {
                    completeInput($currentInput, $(this));
                });
                $suggestTable.append($newRow);
                options = $suggestTable.find("tr");
                ++numOptions;
            });
        }

        function init(inputs, useStars, caseInsensitive) {
            if (!$suggestBox) {
                $suggestBox = $("<div class='suggestBox'><table class='suggestTable'></table></div>");
                $suggestTable = $suggestBox.find("table");
            }

            const keyUpFunc = function(e) {
                if (shouldSuggest) {
                    const code = e.which;
                    if ((code < 37 || code > 40) && code !== 13) {
                        // not the arrow keys or enter or ESC.
                        filterOptions($(this).val(), useStars, caseInsensitive);
                    }
                }
            };

            if (inputs) {
                inputs.on("focus", function() {
                    if (shouldSuggest) {
                        const $input = $(this);
                        const offset = $input.offset();
                        hideTillNextFocus = false;
                        $currentInput = $input;
                        $suggestBox.css({
                            top: offset.top + $input.height() + 5 + "px",
                            left: offset.left + "px",
                            maxWidth: $input.width() + 6 + "px"
                        });
                        show();
                        selectedIndex = 0;
                        filterOptions($input.val(), useStars, caseInsensitive);
                    }
                });

                inputs.on("keydown", function(e) {
                    if (shouldSuggest) {
                        const code = e.which;
                        if (code === 38) { // UP
                            e.preventDefault();
                            selectUp(true);
                        } else if (code === 40) { // DOWN
                            e.preventDefault();
                            selectDown(true);
                        } else if (code === 37) { // LEFT
                            $suggestBox.scrollLeft($suggestBox.scrollLeft() - 32);
                        } else if (code === 39) { // RIGHT
                            $suggestBox.scrollLeft($suggestBox.scrollLeft() + 32);
                        } else if (code === 13 || code === 9) { // Enter or Tab
                            completeInput($(this));
                            $suggestBox.hide();
                        } else if (code === 27) { // ESC
                            $suggestBox.hide();
                            hideTillNextFocus = true;
                        }
                        highlightOption();
                    }
                });

                inputs.on("keyup", keyUpFunc);
            }

            if (!appended) {
                $("body").append($suggestBox);
                appended = true;

                $(window).on("mousedown", function(e) {
                    const $target = $(e.target);
                    if ($target.hasClass("suggestOption") || $target.closest(".suggestBox").length === 0) {
                        $suggestBox.hide();
                    }
                });

                $suggestBox.on("mouseup", function() {
                    const scrollTop = $suggestBox.scrollTop();
                    const lastShouldSuggest = shouldSuggest;
                    // dont call the focus event handler... just focus the field.
                    shouldSuggest = false;
                    $currentInput.focus();
                    shouldSuggest = lastShouldSuggest;
                    $suggestBox.scrollTop(scrollTop);
                });
            }
        }

        function show() {
            if (!hideTillNextFocus) {
                $suggestBox.show();
            }
        }

        function completeInput(input, option) {
            const selectedText = option ? option.text() : options.eq(selectedIndex).text();
            const val = input.val().replace(/\*+$/g, "");
            const inputParts = val.split("*");
            let x = inputParts.length - 1;
            let lastPart = inputParts[x];
            while (lastPart === "" && x > 0) {
                --x;
                lastPart = inputParts[x];
            }
            const lastIndex = selectedText.lastIndexOf(lastPart);
            if (inputParts.length > 1) {
                input.val(val + selectedText.substring(lastIndex + lastPart.length));
            } else {
                input.val(selectedText);
            }
            const fakeEvent = new KeyboardEvent("keyup");
            input[0].dispatchEvent(fakeEvent);
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
                option = options.eq(t);
                optionStr = option.text();
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
                    option.show();
                    allHiding = false;
                } else {
                    option.hide();
                }
            }
            if (allHiding) {
                $suggestBox.hide();
            } else {
                show();
            }
            if (options.eq(selectedIndex).css("display") === "none") {
                selectUp();
            }
            highlightOption();
            if ($suggestTable.height() > suggestTableMaxHeight) {
                $suggestTable.css("margin-right", "18px");
            } else {
                $suggestTable.css("margin-right", "0px");
            }
        }

        function selectDown(dontTryAgain) {
            const oldSelectedIndex = selectedIndex;
            let isVisible;
            do {
                selectedIndex = Math.min(selectedIndex + 1, numOptions - 1);
                isVisible = options.eq(selectedIndex).css("display") !== "none";
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
                isVisible = options.eq(selectedIndex).css("display") !== "none";
            } while (!isVisible && selectedIndex > 0);

            if (!isVisible) {
                selectedIndex = oldSelectedIndex;
                if (!dontTryAgain) {
                    selectDown(true);
                }
            }
        }

        function highlightOption() {
            const optionToHighlight = options.eq(selectedIndex);
            options.css("background", "#ffffff");
            optionToHighlight.css("background", "#aaaaaa");
            fixScroll(optionToHighlight);
        }

        function fixScroll(optionToHighlight) {
            const suggestBoxScrollTop = $suggestBox.scrollTop();
            const optionToHighlightHeight = optionToHighlight.height();
            const suggestBoxHeight = $suggestBox.height();
            const heightInDiv = optionToHighlight.offset().top - $suggestBox.offset().top + suggestBoxScrollTop;
            if (heightInDiv + optionToHighlightHeight > suggestBoxScrollTop + suggestBoxHeight) {
                let scrollBarOffset = 0;
                if ($suggestTable.width() > $suggestBox.width()) {
                    scrollBarOffset = 8;
                }
                $suggestBox.scrollTop(heightInDiv - suggestBoxHeight + optionToHighlightHeight + scrollBarOffset + 8);
            }
            if (heightInDiv < suggestBoxScrollTop) {
                $suggestBox.scrollTop(heightInDiv);
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

    app.suggest = suggest;

})();
