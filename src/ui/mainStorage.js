import keyvalDB from "./keyvalDB.js";

const createDBHandle = (dbName, storeName) => {
    const db = keyvalDB(dbName, [{store: storeName, key: "id"}], 1);
    const domainStore = db.usingStore(storeName);

    const put = function(domainData) {
        return new Promise(function(res, rej) {
            db.open(function(err) {
                if (err) {
                    console.error(err);
                    rej(err);
                } else {
                    domainStore.upsert(domainData.id, domainData, function(err) {
                        if (err) {
                            console.error(err);
                            rej(err);
                        } else {
                            res();
                        }
                    });
                }
            });
        });
    };

    const getAll = function() {
        return new Promise(function(res, rej) {
            db.open(function(err) {
                if (err) {
                    console.error(err);
                    rej(err);
                } else {
                    domainStore.getAll(function(err, ans) {
                        if (err) {
                            console.error(err);
                            rej(err);
                        } else {
                            res(ans);
                        }
                    });
                }
            });
        });
    };

    const remove = function(id) {
        return new Promise(function(res, rej) {
            db.open(function(err) {
                if (err) {
                    console.error(err);
                    rej(err);
                } else {
                    domainStore.delete(id, function(err) {
                        if (err) {
                            console.error(err);
                            rej(err);
                        } else {
                            res();
                        }
                    });
                }
            });
        });
    };

    return {
        put: put,
        getAll: getAll,
        delete: remove
    };
};

export const mainStorage = createDBHandle("OverrideDB", "domains");
// app.mainStorage = app.createDBHandle("OverrideDB", "rules");
// app.oldStorage = app.createDBHandle("OverrideDB", "domains");

export default createDBHandle;
