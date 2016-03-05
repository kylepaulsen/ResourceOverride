(function() {
    "use strict";

    const app = window.app;

    function moveableRules(parent, handleSelector) {
        const placeholder = document.createElement("div");
        const handles = Array.prototype.slice.call(parent.querySelectorAll(handleSelector));
        let children;
        let mouseDown = false;
        let currentMovingEl;
        let offsetY;
        let currentIndex;
        let grid;
        let onMove = function() {};
        placeholder.className = "sortable-placeholder";

        const regetChildren = function() {
            children = Array.prototype.slice.call(parent.children);
        };
        regetChildren();

        const setBorders = function() {
            children.forEach(function(el) {
                el.style.background = "transparent";
            });
        };

        const getElFullHeight = function(el) {
            const innerHeight = el.getBoundingClientRect().height;
            const compStyle = window.getComputedStyle(el);
            return innerHeight + parseInt(compStyle["margin-top"]);
        };

        const getChildIndex = function(el) {
            const children = parent.children;
            let idx = children.length;
            while (idx-- > 0) {
                if (children[idx] === el) {
                    return idx;
                }
            }
            return null;
        };

        const getQualifiedChild = function(el) {
            let lastEl;
            while (el && el !== parent) {
                lastEl = el;
                el = el.parentElement;
            }
            return lastEl;
        };

        const after = function(parent, newEl, targetEl) {
            const nextSib = targetEl.nextElementSibling;
            if (!nextSib) {
                parent.appendChild(newEl);
            } else {
                parent.insertBefore(newEl, nextSib);
            }
        };

        const remove = function(el) {
            el.parentElement.removeChild(el);
        };

        const makeGrid = function() {
            grid = [];
            regetChildren();
            let currentOffset = 0;
            children.forEach(function(el) {
                if (el !== currentMovingEl) {
                    currentOffset += getElFullHeight(el);
                    grid.push({
                        el: el,
                        offset: currentOffset
                    });
                }
            });
        };

        const getElFromGridWithY = function(y) {
            if (y < 0) {
                return null;
            }
            for (let x = 0, len = grid.length; x < len; ++x) {
                if (y < grid[x].offset) {
                    return grid[x].el;
                }
            }
            return null;
        };

        let lastDropTarget;
        document.addEventListener("mousemove", function(e) {
            if (mouseDown) {
                e.preventDefault();
                currentMovingEl.style.top = e.pageY - offsetY + "px";
                const mouseParentY = e.clientY - parent.getBoundingClientRect().top;
                const dropTarget = getElFromGridWithY(mouseParentY);
                if (dropTarget !== lastDropTarget) {
                    setBorders();
                    if (dropTarget) {
                        dropTarget.style.background = "#dddddd";
                    }
                    lastDropTarget = dropTarget;
                }
            }
        });

        document.addEventListener("mouseup", function(e) {
            mouseDown = false;
            if (currentMovingEl) {
                const mouseParentY = e.clientY - parent.getBoundingClientRect().top;
                const dropTarget = getElFromGridWithY(mouseParentY) || placeholder;
                const dropIndex = getChildIndex(dropTarget);
                if (dropIndex > currentIndex) {
                    after(parent, currentMovingEl, dropTarget);
                } else {
                    parent.insertBefore(currentMovingEl, dropTarget);
                }
                // this prevents a reflow from changing scroll position.
                setTimeout(function() {
                    remove(placeholder);
                }, 1);

                currentMovingEl.style.position = "";
                currentMovingEl.style.width = "";
                currentMovingEl.style.height = "";
                currentMovingEl.style.opacity = "";
                currentMovingEl = null;
                setBorders();
                onMove();
            }
        });

        const assignHandleListener = function(handle) {
            const el = getQualifiedChild(handle);
            const compStyle = window.getComputedStyle(el);

            handle.addEventListener("mousedown", function(e) {
                const boundingRect = el.getBoundingClientRect();
                mouseDown = true;
                currentMovingEl = el;
                currentIndex = getChildIndex(el);
                offsetY = e.offsetY + parseInt(compStyle["margin-top"]);
                el.style.position = "absolute";
                el.parentElement.insertBefore(placeholder, el);
                el.style.width = boundingRect.width + "px";
                el.style.height = boundingRect.height + "px";
                el.style.top = e.pageY - offsetY + "px";
                el.style.opacity = 0.5;
                makeGrid();
            });
        };

        handles.forEach(assignHandleListener);

        return {
            assignHandleListener: assignHandleListener,
            onMove: function(fn) {
                onMove = fn;
            }
        };
    }

    app.moveableRules = moveableRules;
})();
