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

function concatTypedArrays(...arrs) {
    let c_sumLen = 0, a_pos;
    for (a_pos of arrs)
        c_sumLen += a_pos.length;
    c_sumLen = new arrs[0].constructor(c_sumLen);
    a_pos = 0;
    for (let a of arrs)
        c_sumLen.set(a, a_pos), a_pos += a.length;
    return c_sumLen
}

function htmlWebRequestProcessor(requestId){
    let filter = browser.webRequest.filterResponseData(requestId);
    let buffers = [];
    filter.ondata = (evt) => {
        buffers.push(new Uint8Array(evt.data));
    };
    return new Promise((resolve, reject) => {
        filter.onstop = (evt) => {
            resolve({"data": concatTypedArrays(...buffers), "event": evt});
        };
    });
}
