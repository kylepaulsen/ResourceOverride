(function() {
    "use strict";

    var suggestBox;
    var appended = false;
    var selectedIndex = 0;
    var numOptions = 0;
    var hideTillNextFocus = false;
    var options;
    var currentInput;
    var shouldSuggest = true;

    function fillOptions(opts) {
        suggestBox.html("");
        numOptions = 0;
        opts.forEach(function(option) {
            var newEl = $("<div class='suggestOption'>");
            newEl.text(option);
            newEl.on("mousedown", function() {
                completeInput(currentInput, $(this));
            });
            suggestBox.append(newEl);
            options = suggestBox.find("div");
            ++numOptions;
        });
    };

    function init() {
        if (!suggestBox) {
            suggestBox = $("<div class='suggestBox'>");
        }

        var inputs = $("input[data-suggest]");

        var keyUpFunc = function(e) {
            if (shouldSuggest) {
                var code = e.which;
                if ((code < 37 || code > 40) && code !== 13) {
                    // not the arrow keys or enter or ESC.
                    filterOptions($(this).val());
                }
            }
        };

        inputs.off("focus keydown blur");
        inputs.off("keyup", keyUpFunc);

        inputs.on("focus", function() {
            if (shouldSuggest) {
                var input = $(this);
                var offset = input.offset();
                hideTillNextFocus = false;
                currentInput = input;
                suggestBox.css({
                    top: offset.top + input.height() + 5 + "px",
                    left: offset.left + "px",
                    maxWidth: input.width() + 6 + "px"
                });
                show();
                selectedIndex = 0;
                filterOptions(input.val());
            }
        });

        inputs.on("keydown", function(e) {
            if (shouldSuggest) {
                var code = e.which;
                if (code === 38) { // UP
                    e.preventDefault();
                    selectUp(true);
                }
                if (code === 40) { // DOWN
                    e.preventDefault();
                    selectDown(true);
                }
                if (code === 13 || code === 9) { // Enter or Tab
                    completeInput($(this));
                    suggestBox.hide();
                }
                if (code === 27) { // ESC
                    suggestBox.hide();
                    hideTillNextFocus = true;
                }
                highlightOption();
            }
        });

        inputs.on("keyup", keyUpFunc);

        if (!appended) {
            $("body").append(suggestBox);
            appended = true;

            $(window).on("mousedown", function(e) {
                var target = $(e.target);
                if (target.hasClass("suggestOption") || target.closest(".suggestBox").length === 0) {
                    suggestBox.hide();
                }
            });

            suggestBox.on("mouseup", function() {
                var scrollTop = suggestBox.scrollTop();
                currentInput.focus();
                suggestBox.scrollTop(scrollTop);
            });
        }
    };

    function show() {
        if (!hideTillNextFocus) {
            suggestBox.show();
        }
    }



    function completeInput(input, option) {
        var selectedText = option ? option.text() : options.eq(selectedIndex).text();
        var inputParts = input.val().split("*");
        var lastPart = inputParts[inputParts.length - 1];
        var lastIndex = selectedText.lastIndexOf(lastPart);
        if (inputParts.length > 1) {
            input.val(input.val() + selectedText.substring(lastIndex + lastPart.length));
        } else {
            input.val(selectedText);
        }
        input.data("saveFunc")();
    }

    function filterOptions(inputVal) {
        var searchParts = inputVal.split("*");
        var found;
        var allEmpty = true;
        var search;
        var allHiding = true;
        var option;
        var optionStr;
        var foundIndex;
        var searchedTo;
        var len;
        var x;
        var t = options.length;
        while (t-- > 0) {
            option = options.eq(t);
            optionStr = option.text();
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
            suggestBox.hide();
        } else {
            show();
        }
        if (options.eq(selectedIndex).css("display") === "none") {
            selectUp();
        }
        highlightOption();
    }

    function selectDown(dontTryAgain) {
        var isVisible;
        var oldSelectedIndex = selectedIndex;
        do {
            selectedIndex = Math.min(selectedIndex + 1, numOptions - 1);
            isVisible = options.eq(selectedIndex).css("display") !== "none";
        } while(!isVisible && selectedIndex < numOptions - 1);
        if (!isVisible) {
            selectedIndex = oldSelectedIndex;
            if (!dontTryAgain) {
                selectUp(true);
            }
        }
    }

    function selectUp(dontTryAgain) {
        var isVisible;
        var oldSelectedIndex = selectedIndex;
        do {
            selectedIndex = Math.max(selectedIndex - 1, 0);
            isVisible = options.eq(selectedIndex).css("display") !== "none";
        } while(!isVisible && selectedIndex > 0);
        if (!isVisible) {
            selectedIndex = oldSelectedIndex;
            if (!dontTryAgain) {
                selectDown(true);
            }
        }
    }

    function highlightOption() {
        var divToHighlight = options.eq(selectedIndex);
        options.css("background", "#ffffff");
        divToHighlight.css("background", "#aaaaaa");
        fixScroll(divToHighlight);
    }

    function fixScroll(divToHighlight) {
        var suggestBoxScrollTop = suggestBox.scrollTop();
        var divToHighlightHeight = divToHighlight.height();
        var suggestBoxHeight = suggestBox.height();
        var heightInDiv = divToHighlight.offset().top - suggestBox.offset().top + suggestBoxScrollTop;
        if (heightInDiv + divToHighlightHeight > suggestBoxScrollTop + suggestBoxHeight) {
            suggestBox.scrollTop(heightInDiv - suggestBoxHeight + divToHighlightHeight + 8);
        }
        if (heightInDiv < suggestBoxScrollTop) {
            suggestBox.scrollTop(heightInDiv);
        }
    }

    function setShouldSuggest(val) {
        shouldSuggest = val;
    }

    window.suggest = {
        init: init,
        fillOptions: fillOptions,
        setShouldSuggest: setShouldSuggest
    }
})();
