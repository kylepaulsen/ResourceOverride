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

import {parseHTML} from "./parseHTML.js"

export function removeIntegrityFromHTMLDoc(doc){
    doc.querySelectorAll("[integrity]").forEach(el => {el.removeAttribute("integrity");});
}

export function removeIntegrityFromHTMLDocBytes(sourceBytes){
    let doc = parseHTML(sourceBytes);
    if(doc){
        removeIntegrityFromHTMLDoc(doc);
        let encoder = new TextEncoder();
        return encoder.encode(doc.documentElement.outerHTML)
    }
}

export function removeIntegrity(details){
    let ct = null;
    let headers = details.responseHeaders;
    if(headers){
        for(let h of headers){
            if(h.name == "content-type"){
                ct = h.value;
            }
        }

        if(ct.substring(0, thCT.length) == thCT){
            htmlWebRequestProcessor(details.requestId).then((obj) => {
                let res = removeIntegrityFromHTMLDoc(obj.data)
                if(res){
                    obj.event.target.write(res);
                    obj.event.target.disconnect();
                }
            });
        }
    }

    return {};
}
