/* global bgapp, keyvalDB */
{
    bgapp.mainStorage = (function() {
        const db = keyvalDB("OverrideDB", [{store: "domains", key: "id"}], 1);
        const domainStore = db.usingStore("domains");

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

        const getDomains = function() {
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

        const deleteDomain = function(id) {
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
            getAll: getDomains,
            delete: deleteDomain
        };
    })();
}
