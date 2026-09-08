import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "fake-indexeddb/auto";

import { closeLocalDatabase, getLocalRecordsByIndex } from "@/services/indexedDB/indexedDbApi";

describe("getLocalRecordsByIndex", () => {
    const databaseName = "get-local-records-by-index-test-db";
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
                const store = request.result.createObjectStore(storeName, {
                    keyPath: "id",
                });

                store.createIndex("email", "email", {
                    unique: false,
                });

                store.createIndex("status", "status", {
                    unique: false,
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

    test("should return all records matching the index value", async () => {
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
                name: "John Doe",
                email: "john@example.com",
            },
        ];

        await addRecords(records);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const result = await getLocalRecordsByIndex(
            storeObject,
            "email",
            "john@example.com"
        );

        expect(result).toHaveLength(2);
        expect(result).toEqual([
            records[0],
            records[2],
        ]);
    });

    test("should return a single record when only one record matches the index value", async () => {
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
        ];

        await addRecords(records);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const result = await getLocalRecordsByIndex(
            storeObject,
            "email",
            "jane@example.com"
        );

        expect(result).toEqual([records[1]]);
    });

    test("should return an empty array when no records match the index value", async () => {
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

        const result = await getLocalRecordsByIndex(
            storeObject,
            "email",
            "not-found@example.com"
        );

        expect(result).toEqual([]);
    });

    test("should return all records with the same index value", async () => {
        const records = [
            {
                id: 1,
                name: "John",
                status: "active",
            },
            {
                id: 2,
                name: "Jane",
                status: "inactive",
            },
            {
                id: 3,
                name: "Alice",
                status: "active",
            },
        ];

        await addRecords(records);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const result = await getLocalRecordsByIndex(
            storeObject,
            "status",
            "active"
        );

        expect(result).toHaveLength(2);
        expect(result).toEqual([
            records[0],
            records[2],
        ]);
    });

    test("should only return records whose index value exactly matches the requested value", async () => {
        const records = [
            {
                id: 1,
                name: "John",
                status: "active",
            },
            {
                id: 2,
                name: "Jane",
                status: "inactive",
            },
            {
                id: 3,
                name: "Alice",
                status: "actively-processing",
            },
        ];

        await addRecords(records);

        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const result = await getLocalRecordsByIndex(
            storeObject,
            "status",
            "active"
        );

        expect(result).toEqual([records[0]]);
    });

    test("should reject when the requested index does not exist", async () => {
        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        await expect(
            getLocalRecordsByIndex(
                storeObject,
                "non-existent-index",
                "value"
            )
        ).rejects.toBeDefined();
    });
});