export const DB_DOCUMENTS = 'RedDB';
export const DB_SETTINGS = 'RedSettings';
export const DB_IMAGES = 'RedImages';
const DB_VERSION = 1;

export function openLocalDatabase(storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(storeName, DB_VERSION);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function createLocalDatabase(storeName, keyPath, indexes) { 
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(storeName, DB_VERSION);

        request.onupgradeneeded = (event) => { 
            const db = event.target.result; 

            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { keyPath: keyPath });
                
                for (const index of indexes) {
                    store.createIndex(
                        index.indexName,
                        index.keyPath, 
                        index.options
                    );
                }
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function localDbExists(storeName) {
    const databases = await indexedDB.databases();
    const exists = databases.some(db => db.name === storeName);
    return exists;
}

export async function addOrSetLocalRecord(storeName, record) {
    const db = await openLocalDatabase(storeName);
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        const request = store.put(record);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function getLocalRecordsByIndex(storeName, indexName, indexValue) {
    const db = await openLocalDatabase(storeName);

    return new Promise((resolve, reject) => {
        const store = db
            .transaction(storeName, 'readonly')
            .objectStore(storeName);
        
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

export async function localEntryExists(storeName, id) {
    const db = await openLocalDatabase(storeName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result !== undefined);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function getLocalRecord(storeName, key) {
    const db = await openLocalDatabase(storeName);
    console.log(key);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        let request = store.get(key);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function deleteLocalRecord(storeName, key) {
    const db = await openLocalDatabase(storeName);
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        const request = store.delete(key);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function getAllForStore(dbName, storeName) {
    const db = await openLocalDatabase(dbName);
    return new Promise((resolve, reject) => {
        const store = db
            .transaction(dbName, 'readonly')
            .objectStore(dbName)
            .index('_id');
        
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result);
        }

        getAllRequest.onerror = () => {
            reject(getAllRequest.error);
        }
    });
}

export async function clearLocalDatabase(storeName) {
    const db = await openLocalDatabase(storeName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };    
    });
}