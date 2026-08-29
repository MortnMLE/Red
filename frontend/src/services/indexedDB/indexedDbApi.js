import { Validator } from "../validator";

export function openLocalDatabase(database) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(database);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function createStore(options = {}, request = null) {
    Validator.validateObjectNotNull(options);
    return new Promise((resolve, reject) => {
        const { storeObject, keyPath, indexes } = options;

        if (request === null) {
            request = indexedDB.open(storeObject.database);
        }

        request.onsuccess = () => {
            const db = request.result;

            if (db.objectStoreNames.contains(storeObject.name)) {
                resolve(db);
                return;
            }

            const newVersion = db.version + 1;
            db.close();

            const upgradeRequest = indexedDB.open(
                storeObject.database,
                newVersion
            );

            upgradeRequest.onupgradeneeded = (event) => {
                const upgradeDb = event.target.result;

                const store = upgradeDb.createObjectStore(
                    storeObject.name,
                    { keyPath }
                );

                for (const index of indexes) {
                    store.createIndex(
                        index.indexName,
                        index.keyPath,
                        index.options
                    );
                }
            };

            upgradeRequest.onsuccess = () => {
                console.log(`Created: ${options.storeObject.name}`);
                resolve(upgradeRequest.result);
            };

            upgradeRequest.onerror = () => {
                reject(upgradeRequest.error);
            };
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(storeObject.name)) {
                const store = db.createObjectStore(
                    storeObject.name,
                    { keyPath }
                );

                for (const index of indexes) {
                    store.createIndex(
                        index.indexName,
                        index.keyPath,
                        index.options
                    );
                }
            }
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function storeExists(storeObject) {
    const databases = await indexedDB.databases();

    const dbExists = databases.some(
        db => db.name === storeObject.database
    );

    if (!dbExists) {
        return false;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(storeObject.database);

        request.onsuccess = () => {
            const db = request.result;

            const storeExists = db.objectStoreNames.contains(
                storeObject.name
            );

            db.close();
            resolve(storeExists);
        }

        request.onerror = () => {
            reject(request.error);
        }
    });
}

export async function addOrSetLocalRecord(storeObject, record) {
    const db = await openLocalDatabase(storeObject.database);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeObject.name, 'readwrite');
        const store = transaction.objectStore(storeObject.name);

        const request = store.put(record);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function getLocalRecordsByIndex(storeObject, indexName, indexValue) {
    const db = await openLocalDatabase(storeObject.database);

    return new Promise((resolve, reject) => {
        const store = db
            .transaction(storeObject.name, 'readonly')
            .objectStore(storeObject.name);
        
        const index = store.index(indexName);
        const request = index.openCursor(IDBKeyRange.only(indexValue));

        const results = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;

            if (cursor) {
                results.push(cursor.value);

                cursor.continue();
            } else {
                resolve(results);
            }
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function localEntryExists(storeObject, id) {
    const db = await openLocalDatabase(storeObject.database);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeObject.name, 'readonly');
        const store = transaction.objectStore(storeObject.name);

        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result !== undefined);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function getLocalRecord(storeObject, key) {
    const db = await openLocalDatabase(storeObject.database);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeObject.name, 'readonly');
        const store = transaction.objectStore(storeObject.name);

        const request = store.get(key);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function deleteLocalRecord(storeObject, key) {
    const db = await openLocalDatabase(storeObject.database);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeObject.name, 'readwrite');
        const store = transaction.objectStore(storeObject.name);

        const request = store.delete(key);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function clearLocalDatabase(storeObject) {
    const db = await openLocalDatabase(storeObject.database);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeObject.name, 'readwrite');
        const store = transaction.objectStore(storeObject.name);
        const request = store.clear();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };    
    });
}

export async function replaceLocalDbEntry(store, newEntry, oldId) {
    Validator.validateObjectNotNull(store);
    Validator.validateObjectNotNull(newEntry);
    Validator.validateStringEmptyNotAllowed(oldId);

    let result = true;

    try {
        await addOrSetLocalRecord(store, newEntry);
        await deleteLocalRecord(store, oldId);
    } catch (err) {
        console.error(err);
        result = false;
    }

    return result;
}