import { beforeEach, afterEach, describe, expect, test } from "vitest";
import "fake-indexeddb/auto";
import { closeLocalDatabase, createStore } from "@/services/indexedDB/indexedDbApi";

describe("createStore", () => {
    const databaseName = "create-store-test-db";

    const createOptions = (overrides = {}) => ({
        storeObject: {
            database: databaseName,
            name: "users",
        },
        keyPath: "id",
        indexes: [],
        ...overrides,
    });

    beforeEach(async () => {
        closeLocalDatabase();

        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(databaseName);

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
            request.onblocked = resolve;
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

    test("should create the object store with the specified key path", async () => {
        const options = createOptions({
            keyPath: "userId",
        });

        const db = await createStore(options);

        const transaction = db.transaction("users", "readonly");
        const store = transaction.objectStore("users");

        expect(store.keyPath).toBe("userId");

        db.close();
    });

    test("should create all configured indexes", async () => {
        const options = createOptions({
            indexes: [
                {
                    indexName: "email",
                    keyPath: "email",
                    options: { unique: true },
                },
                {
                    indexName: "name",
                    keyPath: "name",
                    options: { unique: false },
                },
            ],
        });

        const db = await createStore(options);

        const transaction = db.transaction("users", "readonly");
        const store = transaction.objectStore("users");

        expect(store.indexNames.contains("email")).toBe(true);
        expect(store.indexNames.contains("name")).toBe(true);

        expect(store.index("email").unique).toBe(true);
        expect(store.index("email").keyPath).toBe("email");

        expect(store.index("name").unique).toBe(false);
        expect(store.index("name").keyPath).toBe("name");

        db.close();
    });

    test("should return the existing database without creating the object store again", async () => {
        const firstDb = await createStore(createOptions());

        const firstVersion = firstDb.version;
        firstDb.close();

        const secondDb = await createStore(createOptions());

        expect(secondDb.objectStoreNames.contains("users")).toBe(true);
        expect(secondDb.version).toBe(firstVersion);

        secondDb.close();
    });

    test("should create a missing object store in an existing database", async () => {
        const firstDb = await createStore(
            createOptions({
                storeObject: {
                    database: databaseName,
                    name: "users",
                },
            })
        );

        firstDb.close();

        const secondDb = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        expect(secondDb.objectStoreNames.contains("users")).toBe(true);

        secondDb.close();
    });

    test("should increment the database version when adding a missing object store", async () => {
        const firstDb = await createStore(createOptions());
        const initialVersion = firstDb.version;

        firstDb.close();

        const request = indexedDB.open(databaseName);

        const existingDb = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        existingDb.close();

        const secondDb = await createStore(
            createOptions({
                storeObject: {
                    database: databaseName,
                    name: "orders",
                },
            }),
            request
        );

        expect(secondDb.version).toBe(initialVersion + 1);
        expect(secondDb.objectStoreNames.contains("orders")).toBe(true);

        secondDb.close();
    });

    test("should create indexes when adding a missing object store to an existing database", async () => {
        const firstDb = await createStore(createOptions());
        firstDb.close();

        // Verify that the database exists.
        const existingDb = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });

        existingDb.close();

        // createStore() now needs to open the DB again and upgrade it.
        const db = await createStore(
            createOptions({
                storeObject: {
                    database: databaseName,
                    name: "orders",
                },
                keyPath: "orderId",
                indexes: [
                    {
                        indexName: "customerId",
                        keyPath: "customerId",
                        options: { unique: false },
                    },
                ],
            })
        );

        const transaction = db.transaction("orders", "readonly");
        const store = transaction.objectStore("orders");

        expect(store.keyPath).toBe("orderId");
        expect(store.indexNames.contains("customerId")).toBe(true);
        expect(store.index("customerId").keyPath).toBe("customerId");

        db.close();
    });

    test("should reject when creating an invalid object store fails", async () => {
        const options = createOptions({
            keyPath: "invalid key path",
        });

        await expect(createStore(options)).rejects.toBeDefined();
    });

    test("should reject when creating a duplicate index fails during upgrade", async () => {
        const options = createOptions({
            indexes: [
                {
                    indexName: "email",
                    keyPath: "email",
                    options: {},
                },
                {
                    indexName: "email",
                    keyPath: "anotherEmail",
                    options: {},
                },
            ],
        });

        await expect(createStore(options)).rejects.toBeDefined();
    });
});