const keyvalDB = (dbName, schemaDef, version, options) => {
    "use strict";
    options = options || {};
    const schema = {};
    if (Object.prototype.toString.call(schemaDef) === "[object Array]") {
        for (let t = 0, len = schemaDef.length; t < len; ++t) {
            schema[schemaDef[t].store] = schemaDef[t];
        }
    }
    let db;
    let isDBOpen = false;
    version = version || 1;

    function storeAccess(dbStoreName, dbKeyName) {
        function getObjectStore(store_name, mode) {
            const tx = db.transaction(store_name, mode);
            return tx.objectStore(store_name);
        }

        function clearStore(cb) {
            const store = getObjectStore(dbStoreName, "readwrite");
            const req = store.clear();
            cb = cb || function() {};
            req.onsuccess = function(evt) {
                cb(null, evt);
            };
            req.onerror = function(evt) {
                console.error("clearObjectStore:", evt.target.errorCode);
                cb(evt);
            };
        }

        function insert(key, obj, cb) {
            const store = getObjectStore(dbStoreName, "readwrite");
            let req;
            cb = cb || function() {};

            obj[dbKeyName] = key;
            req = store.add(obj);

            req.onsuccess = function(evt) {
                cb(null, evt);
            };
            req.onerror = function(evt) {
                console.error("insert:", evt.target.error);
                cb(evt.target.error);
            };
        }

        function update(key, obj, cb) {
            const store = getObjectStore(dbStoreName, "readwrite");
            let req;
            cb = cb || function() {};

            obj[dbKeyName] = key;
            req = store.put(obj);

            req.onsuccess = function(evt) {
                cb(null, evt);
            };
            req.onerror = function(evt) {
                console.error("update:", evt.target.error);
                cb(evt.target.error);
            };
        }

        function remove(key, cb) {
            const store = getObjectStore(dbStoreName, "readwrite");
            let req;
            cb = cb || function() {};

            req = store.delete(key);

            req.onsuccess = function(evt) {
                cb(null, evt);
            };
            req.onerror = function(evt) {
                console.error("delete:", evt.target.error);
                cb(evt.target.error);
            };
        }

        function get(key, cb) {
            const store = getObjectStore(dbStoreName, "readonly");
            const req = store.get(key);
            cb = cb || ((e, r) => console.log(e, r));
            req.onsuccess = function(evt) {
                const record = evt.target.result;
                cb(null, record);
            };
            req.onerror = function (evt) {
                console.error("get:", evt.target.errorCode);
                cb(evt.target.error);
            };
        }

        function getAll(cb) {
            const ans = [];
            const store = getObjectStore(dbStoreName, "readonly");
            const myCursor = store.openCursor();
            cb = cb || ((e, r) => console.log(e, r));
            myCursor.onsuccess = function(evt) {
                const cursor = evt.target.result;
                if (cursor) {
                    ans.push(cursor.value);
                    cursor.continue();
                } else {
                    cb(null, ans);
                }
            };
            myCursor.onerror = function(evt) {
                console.error("getAll:", evt.target.errorCode);
                cb(evt.target.error);
            };
        }

        const methods = {
            insert: insert,
            update: update,
            upsert: update,
            remove: remove,
            clearStore: clearStore,
            get: get,
            getAll: getAll
        };

        methods.delete = remove;

        return methods;
    }

    function open(cb) {
        cb = cb || function() {};
        if (isDBOpen) {
            // var err = "Db is already open.";
            // console.warn(err);
            cb();
            return;
        }
        const req = indexedDB.open(dbName, version);

        req.onsuccess = function(evt) {
            db = req.result;
            isDBOpen = true;
            cb(null, evt);
        };
        req.onerror = function(evt) {
            console.error("openDb:", evt.target.errorCode);
            cb(evt);
        };
        req.onupgradeneeded = function(evt) {
            const storeNames = req.result.objectStoreNames;
            for (let name in schema) {
                if (schema.hasOwnProperty(name) && !storeNames.contains(name)) {
                    evt.currentTarget.result.createObjectStore(name, {keyPath: schema[name].key});
                }
            }
            if (options.onUpgrade) {
                options.onUpgrade(evt.target.result);
            }
        };
    }

    function close() {
        isDBOpen = false;
        db.close();
    }

    function isOpen() {
        return isDBOpen;
    }

    function deleteDatabase(cb) {
        cb = cb || function() {};
        if (isDBOpen) {
            const err = "Can't delete db while it is open! Call close first!";
            console.error(err);
            cb(err);
            return;
        }
        const req = indexedDB.deleteDatabase(dbName);

        req.onsuccess = function(evt) {
            cb(null, evt);
        };
        req.onerror = function(evt) {
            console.error("deleteDb:", evt.target.errorCode);
            cb(evt.target.error);
        };
    }

    const usingStore = function(store, key) {
        const keyName = key || schema[store].key;
        return storeAccess(store, keyName);
    };

    return {
        open: open,
        close: close,
        isOpen: isOpen,
        deleteDatabase: deleteDatabase,
        usingStore: usingStore
    };
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = keyvalDB;
}

export default keyvalDB;
