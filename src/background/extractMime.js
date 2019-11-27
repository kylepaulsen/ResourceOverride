/* global bgapp */
{
    // This function will try to guess the mime type.
    // The goal is to use the highest ranking mime type that it gets from these sources (highest
    // ranking sources first): The user provided mime type on the first line of the file, the url
    // file extension, the file looks like html, the file looks like xml, the file looks like,
    // JavaScript, the file looks like CSS, can't tell what the file is so default to text/plain.
    bgapp.extractMimeType = function(requestUrl, file) {
        file = file || "";
        const possibleExt = (requestUrl.match(/\.[A-Za-z]{2,4}$/) || [""])[0];
        const looksLikeCSSRegex = /[#.@][^\s\{]+\s*\{/;
        const looksLikeJSRegex = /(var|const|let|function)\s+.+/;
        const looksLikeXMLRegex = /<\?xml(\s+.+\s*)?\?>/i;
        const looksLikeHTMLRegex = /<html(\s+.+\s*)?>/i;
        const mimeInFileRegex = /\/\* *mime: *([-\w\/]+) *\*\//i;
        const firstLine = (file.match(/.*/) || [""])[0];
        let userMime = firstLine.match(mimeInFileRegex);
        userMime = userMime ? userMime[1] : null;
        const extToMime = {
            ".js": "text/javascript",
            ".html": "text/html",
            ".css": "text/css",
            ".xml": "text/xml"
        };
        let mime = extToMime[possibleExt];
        if (!mime) {
            if (looksLikeHTMLRegex.test(file)) {
                mime = "text/html";
            } else if (looksLikeXMLRegex.test(file)) {
                mime = "text/xml";
            } else if (looksLikeJSRegex.test(file)) {
                mime = "text/javascript";
            } else if (looksLikeCSSRegex.test(file)) {
                mime = "text/css";
            } else {
                mime = "text/plain";
            }
        }
        if (userMime) {
            mime = userMime;
            file = file.replace(mimeInFileRegex, "");
        }
        return {mime: mime, file: file};
    };
}
