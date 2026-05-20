export const DB_DOCUMENTS = "RedDB";
export const DB_SETTINGS = "RedSettings";
const DB_VERSION = 1;

export function openLocalDatabase(dbName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, DB_VERSION);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function createLocalDatabase(dbName, keyPath) { 
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, DB_VERSION);

        request.onupgradeneeded = (event) => { 
            const db = event.target.result; 

            if (!db.objectStoreNames.contains(dbName)) {
                const store = db.createObjectStore(dbName, { keyPath: keyPath });

                store.createIndex("user_id", "user_id", { unique: false });
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

export async function localDbExists(dbName) {
    const databases = await indexedDB.databases();
    const exists = databases.some(db => db.name === dbName);
    console.log(databases);
    return exists;
}

export async function addLocalRecord(dbName, record) {
    const db = await openLocalDatabase(dbName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(dbName, "readwrite");
        const store = transaction.objectStore(dbName);
        const request = store.add(record);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function getLocalDocumentVersionsByUserId(userId) {
    const db = await openLocalDatabase(DB_DOCUMENTS);

    return new Promise((resolve, reject) => {
        const store = db
            .transaction(DB_DOCUMENTS, "readonly")
            .objectStore(DB_DOCUMENTS);
        
        console.log('found store');
        const index = store.index("user_id");
        const request = index.openCursor(IDBKeyRange.only(userId));

        const results = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;

            if (cursor) {
                results.push({
                    _id: cursor.value._id,
                    version: cursor.value.version
                });

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

export async function getLocalRecord(dbName, indexName, value) {
    const db = await openLocalDatabase(dbName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(dbName, "readonly");
        const store = transaction.objectStore(dbName);
        //const index = store.index(indexName);
        //const request = index.get(value);
        const request = store.get(value);
        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function updateLocalRecordPartial(dbName, indexValue,
    fieldsToUpdate, valuesToUpdate) {
        
    const db = await openLocalDatabase(dbName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(dbName, "readwrite");
        const store = transaction.objectStore(dbName);
        const request = store.get(indexValue);

        request.onsuccess = (event) => {
            const data = event.target.result; 
            
            fieldsToUpdate.forEach((field, index) => {
                data[field] = valuesToUpdate[index];
            })

            const updateRequest = store.put(data);

            updateRequest.onsuccess = () => {
                resolve(updateRequest.result);
            };

            updateRequest.onerror = () => {
                reject(updateRequest.error);
            };
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function updateLocalRecordFull(dbName, indexValue, newRecord) {
    const db = await openLocalDatabase(dbName);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(dbName, "readwrite");
        const store = transaction.objectStore(dbName);
        const request = store.get(indexValue);

        request.onsuccess = (event) => {
            const data = event.target.result; 
            data = newRecord;

            const updateRequest = store.put(data);

            updateRequest.onsuccess = () => {
                resolve(updateRequest.result);
            };

            updateRequest.onerror = () => {
                reject(updateRequest.error);
            };
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export async function deleteLocalRecord(dbName, indexValue) {
    const db = await openLocalDatabase(dbName);
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(dbName, "readwrite");
        const store = transaction.objectStore(dbName);
        const request = store.delete(indexValue);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}