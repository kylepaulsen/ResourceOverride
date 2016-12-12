(function() {
    "use strict";

    /* globals $ */

    const ui = {};

    // pre-fetch all major ui.
    $("[id]").each(function(idx, el) {
        ui[el.id] = $(el);
    });

    const app = {
        ui: ui
    };
    window.app = app;
})();
