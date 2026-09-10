import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "fake-indexeddb/auto";

import { addOrSetLocalRecord, closeLocalDatabase, getLocalRecord } from "@/services/indexedDB/indexedDbApi";

describe("addOrSetLocalRecord", () => {
    const databaseName = "add-or-set-local-record-test-db";
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

    test("should add a new record to the object store", async () => {
        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const record = {
            id: 1,
            name: "John",
            email: "john@example.com",
        };

        const result = await addOrSetLocalRecord(storeObject, record);

        expect(result).toBe(1);
    });

    test("should set an existing record in the object store", async () => {
        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const initialRecord = {
            id: 1,
            name: "John",
            email: "john@example.com",
        };

        const updatedRecord = {
            id: 1,
            name: "Jane",
            email: "jane@example.com",
        };

        await addOrSetLocalRecord(storeObject, initialRecord);
        await addOrSetLocalRecord(storeObject, updatedRecord);

        const entry = await getLocalRecord(storeObject, updatedRecord.id);
        expect(entry).toEqual(updatedRecord);
    });

    test("should return the key of the added record", async () => {
        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const record = {
            id: 42,
            name: "Alice",
        };

        const result = await addOrSetLocalRecord(storeObject, record);

        expect(result).toBe(42);
    });

    test("should reject when the record cannot be added to the object store", async () => {
        const storeObject = {
            database: databaseName,
            name: storeName,
        };

        const record = {
            name: "Record without an id",
        };

        await expect(
            addOrSetLocalRecord(storeObject, record)
        ).rejects.toBeDefined();
    });

    test("should reject when the object store does not exist", async () => {
        const storeObject = {
            database: databaseName,
            name: "non-existent-store",
        };

        const record = {
            id: 1,
            name: "John",
        };

        await expect(
            addOrSetLocalRecord(storeObject, record)
        ).rejects.toBeDefined();
    });
});