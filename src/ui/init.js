"use strict";

/* globals $ */

const ui = {};

// pre-fetch all major ui.
$("[id]").each(function(idx, el) {
    ui[el.id] = $(el);
});

const app = {};

export { app, ui };