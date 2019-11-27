/* global bgapp */
{
    bgapp.requestIdTracker = (function() {
        let head;
        let tail;
        let length = 0;
        const tracker = {};
        const maxSize = 1000;

        function pop() {
            const val = head.val;
            head = head.next;
            length--;
            delete tracker[val];
        }

        function push(obj) {
            const newNode = {
                val: obj,
                next: undefined
            };
            if (length > 0) {
                tail.next = newNode;
                tail = newNode;
            } else {
                head = newNode;
                tail = newNode;
            }
            length++;
            tracker[obj] = true;
            while (length > maxSize) {
                pop();
            }
        }

        function has(id) {
            return tracker[id];
        }

        return {
            push: push,
            has: has
        };
    })();
}
