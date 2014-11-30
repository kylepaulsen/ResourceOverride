
(function() {
    "use strict";
    // Chrome crashes when I try to access chrome.devtools.inspectedWindow in a non dev tools tab.
    // So I need to know way ahead of time if this is a normal tab. (There is no other way to
    // detect if you are in a dev tools tab)

    window.isNormalTab = true;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "devtoolstab.html", true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            var html = xhr.responseText;
            var headStart = html.indexOf("<head>") + 7;
            var headEnd = html.indexOf("</head>");
            var bodyStart = html.indexOf("<body>") + 7;
            var bodyEnd = html.indexOf("</body>");

            document.head.innerHTML = html.substring(headStart, headEnd);
            document.body.innerHTML = html.substring(bodyStart, bodyEnd);
            window.init();
        }
    };

    xhr.send();
})();
