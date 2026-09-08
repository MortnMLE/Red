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