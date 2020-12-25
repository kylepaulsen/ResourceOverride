"use strict";

/* globals $ */

const ui = {};

// pre-fetch all major ui.
document.querySelectorAll("[id]").forEach(function(el) {
    ui[el.id] = el;
});

const app = {};
export const capabilities = {};

export { app, ui };
