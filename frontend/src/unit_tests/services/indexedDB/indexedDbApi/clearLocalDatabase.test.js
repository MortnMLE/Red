import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "fake-indexeddb/auto";

import { clearLocalDatabase, closeLocalDatabase } from "@/services/indexedDB/indexedDbApi";

describe("clearLocalDatabase", () => {
    const databaseName = "clear-local-database-test-db";
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

    const getAllRecords = async () => {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const records = await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        db.close();

        return records;
    };

    test("should clear all records from the object store", async () => {
        const records = [
            {
                id: 1,
                name: "John",
            },
            {
                id: 2,
                name: "Jane",
            },
            {
                id: 3,
                name: "Alice",
            },
        ];

        await addRecords(records);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        await clearLocalDatabase(storeObject);

        const result = await getAllRecords();

        expect(result).toEqual([]);
    });

    test("should resolve when the object store is already empty", async () => {
        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        await expect(
            clearLocalDatabase(storeObject)
        ).resolves.toBeUndefined();
    });

    test("should leave the object store available after clearing its records", async () => {
        await addRecords([
            {
                id: 1,
                name: "John",
            },
        ]);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        await clearLocalDatabase(storeObject);

        await addRecords([
            {
                id: 2,
                name: "Jane",
            },
        ]);

        const result = await getAllRecords();

        expect(result).toEqual([
            {
                id: 2,
                name: "Jane",
            },
        ]);
    });

    test("should reject when the requested object store does not exist", async () => {
        const storeObject = {
            database: databaseName,
            name: "non-existent-store",
        };

        await expect(
            clearLocalDatabase(storeObject)
        ).rejects.toBeDefined();
    });
});