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

export const thCT = "text/html";

export function _parseHTML(data, encoding, fatality) {
    let decoder = new TextDecoder(encoding, {
        fatal: fatality
    });
    let dp = new DOMParser();
    let doc = dp.parseFromString(decoder.decode(data), thCT);
    return doc;
}

export function detectCharset(doc) {
    let charsetEls = doc.querySelectorAll("meta[charset]");

    let detectedCharset = null;
    if (charsetEls.length) {
        detectedCharset = charsetEls[charsetEls.length - 1].getAttribute("charset");
    }

    if (!detectedCharset) {
        detectedCharset = "utf-8";
    }
    return detectedCharset;
}

export function parseHTML(data) {
    const initialCharset = "ascii";
    let doc = _parseHTML(data, initialCharset, false);
    let actualCharset = detectCharset(doc);

    if (initialCharset === actualCharset) {
        return doc;
    } else {
        return _parseHTML(data, actualCharset, true);
    }
}
