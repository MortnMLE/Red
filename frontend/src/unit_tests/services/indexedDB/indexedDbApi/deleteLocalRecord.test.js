import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "fake-indexeddb/auto";
import { deleteLocalRecord, closeLocalDatabase } from "@/services/indexedDB/indexedDbApi";

describe("deleteLocalRecord", () => {
    const databaseName = "delete-local-record-test-db";
    const storeName = "users";

    beforeEach(async () => {
        closeLocalDatabase();

        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(databaseName);

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
            request.onblocked = resolve;
        });

        await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName, 1);

            request.onupgradeneeded = () => {
                request.result.createObjectStore(storeName, {
                    keyPath: "id",
                });
            };

            request.onsuccess = () => {
                request.result.close();
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    });

    afterEach(async () => {
        closeLocalDatabase();

        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(databaseName);

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
            request.onblocked = resolve;
        });
    });

    const addRecords = async (records) => {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);

            records.forEach((record) => {
                store.put(record);
            });

            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });

        db.close();
    };

    const getRecord = async (key) => {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const result = await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        db.close();

        return result;
    };

    test("should delete the record matching the provided key", async () => {
        const record = {
            id: 1,
            name: "John",
            email: "john@example.com",
        };

        await addRecords([record]);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        await deleteLocalRecord(storeObject, 1);

        const result = await getRecord(1);

        expect(result).toBeUndefined();
    });

    test("should leave other records unchanged when deleting a record", async () => {
        const records = [
            {
                id: 1,
                name: "John",
                email: "john@example.com",
            },
            {
                id: 2,
                name: "Jane",
                email: "jane@example.com",
            },
            {
                id: 3,
                name: "Alice",
                email: "alice@example.com",
            },
        ];

        await addRecords(records);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        await deleteLocalRecord(storeObject, 2);

        expect(await getRecord(1)).toEqual(records[0]);
        expect(await getRecord(2)).toBeUndefined();
        expect(await getRecord(3)).toEqual(records[2]);
    });

    test("should resolve when deleting a key that does not exist", async () => {
        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        await expect(
            deleteLocalRecord(storeObject, 999)
        ).resolves.toBeUndefined();
    });

    test("should delete a record using a string key", async () => {
        const databaseNameWithStringKey = "delete-local-record-string-key-db";
        const stringStoreName = "items";
        const key = "item-1";

        await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseNameWithStringKey, 1);

            request.onupgradeneeded = () => {
                request.result.createObjectStore(stringStoreName, {
                    keyPath: "id",
                });
            };

            request.onsuccess = () => {
                request.result.close();
                resolve();
            };

            request.onerror = () => reject(request.error);
        });

        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseNameWithStringKey);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const record = {
            id: key,
            value: "test",
        };

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(
                stringStoreName,
                "readwrite"
            );
            const store = transaction.objectStore(stringStoreName);

            store.put(record);

            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });

        db.close();

        await deleteLocalRecord(
            {
                database: databaseNameWithStringKey,
                name: stringStoreName,
            },
            key
        );

        const verifyDb = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseNameWithStringKey);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const result = await new Promise((resolve, reject) => {
            const transaction = verifyDb.transaction(
                stringStoreName,
                "readonly"
            );
            const store = transaction.objectStore(stringStoreName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        verifyDb.close();

        expect(result).toBeUndefined();

        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(
                databaseNameWithStringKey
            );

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
            request.onblocked = resolve;
        });
    });

    test("should reject when the requested object store does not exist", async () => {
        const storeObject = {
            database: databaseName,
            name: "non-existent-store",
        };

        await expect(
            deleteLocalRecord(storeObject, 1)
        ).rejects.toBeDefined();
    });
});