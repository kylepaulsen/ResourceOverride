var keyvalDB = function(dbName, schemaDef, version, options) {
    "use strict";
    options = options || {};
    var schema = {};
    if (Object.prototype.toString.call(schemaDef) === "[object Array]") {
        for (var t = 0, len = schemaDef.length; t < len; ++t) {
            schema[schemaDef[t].store] = schemaDef[t];
        }
    }
    var db;
    var isDBOpen = false;
    version = version || 1;

    function storeAccess(dbStoreName, dbKeyName) {
        function getObjectStore(store_name, mode) {
            var tx = db.transaction(store_name, mode);
            return tx.objectStore(store_name);
        }

        function clearStore(cb) {
            var store = getObjectStore(dbStoreName, "readwrite");
            var req = store.clear();
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
            var store = getObjectStore(dbStoreName, "readwrite");
            var req;
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
            var store = getObjectStore(dbStoreName, "readwrite");
            var req;
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
            var store = getObjectStore(dbStoreName, "readwrite");
            var req;
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
            var store = getObjectStore(dbStoreName, "readonly");
            var req = store.get(key);
            cb = cb || function(e,r) { console.log(e,r); };
            req.onsuccess = function(evt) {
                var record = evt.target.result;
                cb(null, record);
            };
            req.onerror = function (evt) {
                console.error("get:", evt.target.errorCode);
                cb(evt.target.error);
            };
        }

        function getAll(cb) {
            var ans = [];
            var store = getObjectStore(dbStoreName, "readonly");
            var myCursor = store.openCursor();
            cb = cb || function(e,r) { console.log(e,r); };
            myCursor.onsuccess = function(evt) {
                var cursor = evt.target.result;
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

        var methods = {
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
            var err = "Db is already open.";
            console.warn(err);
            cb();
            return;
        }
        var req = indexedDB.open(dbName, version);

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
            var storeNames = req.result.objectStoreNames;
            for (var name in schema) {
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
            var err = "Can't delete db while it is open! Call close first!";
            console.error(err);
            cb(err);
            return;
        }
        var req = indexedDB.deleteDatabase(dbName);

        req.onsuccess = function(evt) {
            cb(null, evt);
        };
        req.onerror = function(evt) {
            console.error("deleteDb:", evt.target.errorCode);
            cb(evt.target.error);
        };
    }

    var usingStore = function(store, key) {
        var keyName = key || schema[store].key;
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
