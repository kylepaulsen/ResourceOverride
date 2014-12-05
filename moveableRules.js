function moveableRules(parent, handleSelector) {
    "use strict";
    var children;
    var handles = Array.prototype.slice.call(parent.querySelectorAll(handleSelector));
    var mouseDown = false;
    var currentMovingEl;
    var offsetX;
    var offsetY;
    var currentIndex;
    var grid;
    var onMove = function() {};
    var placeholder = document.createElement("div");
    placeholder.className = "sortable-placeholder";

    var regetChildren = function() {
        children = Array.prototype.slice.call(parent.children);
    };
    regetChildren();

    var setBorders = function() {
        children.forEach(function(el) {
            el.style.background = "transparent";
        });
    };

    var getElFullHeight = function(el) {
        var innerHeight = el.getBoundingClientRect().height;
        var compStyle = window.getComputedStyle(el);
        return innerHeight + parseInt(compStyle["margin-top"]);
    };

    var getChildIndex = function(el) {
        var children = parent.children;
        var idx = children.length;
        while (idx-- > 0) {
            if (children[idx] === el) {
                return idx;
            }
        }
        return null;
    };

    var getQualifiedChild = function(el) {
        var lastEl;
        while (el && el !== parent) {
            lastEl = el;
            el = el.parentElement;
        }
        return lastEl;
    };

    var after = function(parent, newEl, targetEl) {
        var nextSib = targetEl.nextElementSibling;
        if (!nextSib) {
            parent.appendChild(newEl);
        } else {
            parent.insertBefore(newEl, nextSib);
        }
    };

    var remove = function(el) {
        el.parentElement.removeChild(el);
    };

    var makeGrid = function() {
        grid = [];
        regetChildren();
        var currentOffset = 0;
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

    var getElFromGridWithY = function(y) {
        if (y < 0) {
            return null;
        }
        for (var x = 0, len = grid.length; x < len; ++x) {
            if (y < grid[x].offset) {
                return grid[x].el;
            }
        }
        return null;
    };

    var lastDropTarget;
    document.addEventListener("mousemove", function(e) {
        if (mouseDown) {
            e.preventDefault();
            currentMovingEl.style.top = e.clientY - offsetY + "px";
            var mouseParentY = e.pageY - parent.getBoundingClientRect().top;
            var dropTarget = getElFromGridWithY(mouseParentY);
            if (dropTarget !== lastDropTarget) {
                setBorders();
                if (dropTarget) {
                    dropTarget.style.background = "#eeeeee";
                }
                lastDropTarget = dropTarget;
            }
        }
    });

    document.addEventListener("mouseup", function(e) {
        mouseDown = false;
        if (currentMovingEl) {
            var mouseParentY = e.pageY - parent.getBoundingClientRect().top;
            var dropTarget = getElFromGridWithY(mouseParentY) || placeholder;
            var dropIndex = getChildIndex(dropTarget);
            if (dropIndex > currentIndex) {
                after(parent, currentMovingEl, dropTarget);
            } else {
                parent.insertBefore(currentMovingEl, dropTarget);
            }
            remove(placeholder);

            currentMovingEl.style.position = "";
            currentMovingEl.style.width = "";
            currentMovingEl.style.height = "";
            currentMovingEl.style.opacity = 1;
            currentMovingEl = null;
            setBorders();
            onMove();
        }
    });

    var assignHandleListener = function(handle) {
        var el = getQualifiedChild(handle);
        var compStyle = window.getComputedStyle(el);

        handle.addEventListener("mousedown", function(e) {
            var boundingRect = el.getBoundingClientRect();
            mouseDown = true;
            currentMovingEl = el;
            currentIndex = getChildIndex(el);
            offsetX = e.offsetX + parseInt(compStyle["margin-left"]);
            offsetY = e.offsetY + parseInt(compStyle["margin-top"]);
            el.style.position = "absolute";
            el.parentElement.insertBefore(placeholder, el);
            el.style.width = boundingRect.width + "px";
            el.style.height = boundingRect.height + "px";
            el.style.top = e.clientY - offsetY + "px";
            el.style.opacity = 0.5;
            makeGrid();
        });
    };

    handles.forEach(assignHandleListener);

    return {
        assignHandleListener: assignHandleListener,
        onMove: function(fn) { onMove = fn; }
    };
}
