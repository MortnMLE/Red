import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "fake-indexeddb/auto";

import { closeLocalDatabase, getLocalRecord } from "@/services/indexedDB/indexedDbApi";

describe("getLocalRecord", () => {
    const databaseName = "get-local-record-test-db";
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

    test("should return the record matching the provided key", async () => {
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

        const result = await getLocalRecord(storeObject, 1);

        expect(result).toEqual(record);
    });

    test("should return undefined when no record matches the provided key", async () => {
        await addRecords([
            {
                id: 1,
                name: "John",
                email: "john@example.com",
            },
        ]);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const result = await getLocalRecord(storeObject, 999);

        expect(result).toBeUndefined();
    });

    test("should return the correct record when multiple records exist", async () => {
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

        const result = await getLocalRecord(storeObject, 2);

        expect(result).toEqual(records[1]);
    });

    test("should return a record using a string key", async () => {
        const databaseNameWithStringKey = "get-local-record-string-key-db";
        const stringStoreName = "items";

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
            id: "item-1",
            value: "test",
        };

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(stringStoreName, "readwrite");
            const store = transaction.objectStore(stringStoreName);

            store.put(record);

            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });

        db.close();

        const result = await getLocalRecord(
            {
                database: databaseNameWithStringKey,
                name: stringStoreName,
            },
            "item-1"
        );

        expect(result).toEqual(record);

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
            getLocalRecord(storeObject, 1)
        ).rejects.toBeDefined();
    });
});