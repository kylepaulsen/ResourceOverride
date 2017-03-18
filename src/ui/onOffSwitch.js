(function() {
    "use strict";

    /* globals $ */

    const ui = window.app.ui;

    document.registerElement("on-off-switch", {
        prototype: Object.create(HTMLElement.prototype, {
            createdCallback: {

                value: function() {
                    console.log("this",this);
                    this.createShadowRoot().appendChild(document.importNode(
                        ui.onOffSwitchTemplate[0].content, true));
                    const $switchContainer = $(this.shadowRoot.children[1]);
                    console.log("switchcontainer", $switchContainer);
                    $switchContainer.find(".onoffswitch-on").text(
                        this.getAttribute("onText") || "ON");
                    $switchContainer.find(".onoffswitch-off").text(
                        this.getAttribute("offText") ||"OFF");
                    this.checkbox = $switchContainer.find("input");
                }
            },
            isOn: {
                get: function() {
                    return this.checkbox.is(":checked");
                },
                set: function(val) {
                    if (val) {
                        this.checkbox.prop("checked", true);
                    } else {
                        this.checkbox.prop("checked", false);
                    }
                }
            }
        })
    });

})();
