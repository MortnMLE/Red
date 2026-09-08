import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "fake-indexeddb/auto";

import { storeExists } from "@/services/indexedDB/indexedDbApi";

describe("storeExists", () => {
    const databaseName = "store-exists-test-db";

    beforeEach(async () => {
        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(databaseName);

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
            request.onblocked = resolve;
        });
    });

    afterEach(async () => {
        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(databaseName);

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
            request.onblocked = resolve;
        });
    });

    test("should return false when the database does not exist", async () => {
        const storeObject = {
            database: databaseName,
            name: "users",
        };

        await expect(storeExists(storeObject)).resolves.toBe(false);
    });

    test("should return true when the database and object store exist", async () => {
        const request = indexedDB.open(databaseName, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore("users", {
                keyPath: "id",
            });
        };

        await new Promise((resolve, reject) => {
            request.onsuccess = () => {
                request.result.close();
                resolve();
            };

            request.onerror = () => reject(request.error);
        });

        const storeObject = {
            database: databaseName,
            name: "users",
        };

        await expect(storeExists(storeObject)).resolves.toBe(true);
    });

    test("should return false when the database exists but the object store does not", async () => {
        const request = indexedDB.open(databaseName, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore("users", {
                keyPath: "id",
            });
        };

        await new Promise((resolve, reject) => {
            request.onsuccess = () => {
                request.result.close();
                resolve();
            };

            request.onerror = () => reject(request.error);
        });

        const storeObject = {
            database: databaseName,
            name: "orders",
        };

        await expect(storeExists(storeObject)).resolves.toBe(false);
    });
});