"use strict";

/*
 This is free and unencumbered software released into the public domain.

 Anyone is free to copy, modify, publish, use, compile, sell, or
 distribute this software, either in source code form or as a compiled
 binary, for any purpose, commercial or non-commercial, and by any
 means.

 In jurisdictions that recognize copyright laws, the author or authors
 of this software dedicate any and all copyright interest in the
 software to the public domain. We make this dedication for the benefit
 of the public at large and to the detriment of our heirs and
 successors. We intend this dedication to be an overt act of
 relinquishment in perpetuity of all present and future rights to this
 software under copyright law.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.

 For more information, please refer to <https://unlicense.org/>
*/

function removeIntegrityIfNeeded(node) {
    if (node.integrity) {
        console.log("Removed integrity from", node);
        node.integrity = ""; // or maybe recalculate
    }
}

if (typeof MutationEvent != "undefined") {
    console.log("Mutation events are supported in this browser. They are slow, deprecated, may be removed in future, but blocking! That's what we need.");

    function mutEventCallback(e) {
        removeIntegrityIfNeeded(e.target)
    }
    window.document.addEventListener("DOMNodeInserted", mutEventCallback, true);
    window.document.addEventListener("DOMNodeInserted", mutEventCallback, true);
} else {
    console.log("Mutation events are not supported in this browser. Maybe they have been dropped. Using mutations observers that by design have no capturing mode. It won't work, the request will be done before we undo the mutation. Need some cooperation to WebRequest to drop the first request fast, and then do the second request after the mutation");

    const mutationsProcessors = new Map([
                ['childList', (m) => m.addedNodes.forEach(removeIntegrityIfNeeded)],
                ['attributes', (m) => removeIntegrityIfNeeded(m.target)],
            ])

    function observe(mutationsList, observer) {
        for (let mutation of mutationsList) {
            mutationsProcessors.get(mutation.type)(mutation);
        }
    };

    const observer = new window.MutationObserver(observe);

    observer.observe(window.document.documentElement, {
        attributes: true,
        attributeFilter: ["integrity"],
        attributeOldValue: false,
        childList: true,
        subtree: true,
        characterData: false,
        characterDataOldValue: false,
    });
}
