import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/indexedDB/indexedDbApi", () => ({
    storeExists: vi.fn(),
    createStore: vi.fn(),
    addOrSetLocalRecord: vi.fn(),
}));

import { DB_DOCUMENTS, DB_IMAGES, DB_SETTINGS } from "@/constants/stores";
import { documentStoreOptions } from "@/constants/storeOptions";
import { storeExists, createStore, addOrSetLocalRecord } from "@/services/indexedDB/indexedDbApi";
import { createDocumentStore, createImageStore, createSettingStore } from "@/services/indexedDB/storeCreation";
import { settingStoreOptions, documentStoreOptions, imageStoreOptions } from "@/constants/storeOptions";

describe('storeCreation', () => { 
    
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.userId = "test-user-id";
    });

    describe("createDocumentStore", () => {


        test("should return true when the document store already exists", async () => {
            storeExists.mockResolvedValue(true);

            const result = await createDocumentStore();

            expect(result).toBe(true);
            expect(storeExists).toHaveBeenCalledWith(DB_DOCUMENTS);
            expect(createStore).not.toHaveBeenCalled();
        });

        test("should create the document store when it does not exist", async () => {
            storeExists.mockResolvedValue(false);
            createStore.mockResolvedValue(undefined);

            const result = await createDocumentStore();

            expect(result).toBe(true);
            expect(storeExists).toHaveBeenCalledWith(DB_DOCUMENTS);
            expect(createStore).toHaveBeenCalledWith(documentStoreOptions);
        });

        test("should return false when creating the document store throws an error", async () => {
            const error = new Error("Failed to create store");

            storeExists.mockResolvedValue(false);
            createStore.mockRejectedValue(error);

            const result = await createDocumentStore();

            expect(result).toBe(false);
            expect(storeExists).toHaveBeenCalledWith(DB_DOCUMENTS);
            expect(createStore).toHaveBeenCalledWith(documentStoreOptions);
        });
    });

    describe("createSettingStore", () => {
        test("should return true when the settings store already exists", async () => {
            storeExists.mockResolvedValue(true);

            const result = await createSettingStore();

            expect(result).toBe(true);
            expect(storeExists).toHaveBeenCalledWith(DB_SETTINGS);
            expect(createStore).not.toHaveBeenCalled();
            expect(addOrSetLocalRecord).not.toHaveBeenCalled();
        });

        test("should create the settings store and add default settings when it does not exist", async () => {
            storeExists.mockResolvedValue(false);
            createStore.mockResolvedValue(undefined);
            addOrSetLocalRecord.mockResolvedValue(undefined);

            const result = await createSettingStore();

            expect(result).toBe(true);

            expect(storeExists).toHaveBeenCalledWith(DB_SETTINGS);
            expect(createStore).toHaveBeenCalledWith(settingStoreOptions);

            expect(addOrSetLocalRecord).toHaveBeenCalledTimes(2);

            expect(addOrSetLocalRecord).toHaveBeenNthCalledWith(
                1,
                DB_SETTINGS,
                {
                    key: "countTemporaryIds",
                    value: 0,
                    userId: "test-user-id",
                },
            );

            expect(addOrSetLocalRecord).toHaveBeenNthCalledWith(
                2,
                DB_SETTINGS,
                {
                    key: "enableVim",
                    value: true,
                    userId: "test-user-id",
                },
            );
        });

        test("should return false when creating the settings store throws an error", async () => {
            storeExists.mockResolvedValue(false);
            createStore.mockRejectedValue(new Error("Failed to create store"));

            const result = await createSettingStore();

            expect(result).toBe(false);
            expect(storeExists).toHaveBeenCalledWith(DB_SETTINGS);
            expect(createStore).toHaveBeenCalledWith(settingStoreOptions);
            expect(addOrSetLocalRecord).not.toHaveBeenCalled();
        });

        test("should return false when adding the first default setting throws an error", async () => {
            storeExists.mockResolvedValue(false);
            createStore.mockResolvedValue(undefined);
            addOrSetLocalRecord.mockRejectedValueOnce(
                new Error("Failed to add setting"),
            );

            const result = await createSettingStore();

            expect(result).toBe(false);
            expect(addOrSetLocalRecord).toHaveBeenCalledTimes(1);
            expect(addOrSetLocalRecord).toHaveBeenNthCalledWith(
                1,
                DB_SETTINGS,
                {
                    key: "countTemporaryIds",
                    value: 0,
                    userId: "test-user-id",
                },
            );
        });

        test("should return false when adding the second default setting throws an error", async () => {
            storeExists.mockResolvedValue(false);
            createStore.mockResolvedValue(undefined);
            addOrSetLocalRecord
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error("Failed to add setting"));

            const result = await createSettingStore();

            expect(result).toBe(false);
            expect(addOrSetLocalRecord).toHaveBeenCalledTimes(2);
            expect(addOrSetLocalRecord).toHaveBeenNthCalledWith(
                2,
                DB_SETTINGS,
                {
                    key: "enableVim",
                    value: true,
                    userId: "test-user-id",
                },
            );
        });
    });

    describe("createImageStore", () => {
        test("should return true when the image store already exists", async () => {
            storeExists.mockResolvedValue(true);

            const result = await createImageStore();

            expect(result).toBe(true);
            expect(storeExists).toHaveBeenCalledWith(DB_IMAGES);
            expect(createStore).not.toHaveBeenCalled();
        });

        test("should create the image store when it does not exist", async () => {
            storeExists.mockResolvedValue(false);
            createStore.mockResolvedValue(undefined);

            const result = await createImageStore();

            expect(result).toBe(true);
            expect(storeExists).toHaveBeenCalledWith(DB_IMAGES);
            expect(createStore).toHaveBeenCalledWith(imageStoreOptions);
        });

        test("should return false when creating the image store throws an error", async () => {
            storeExists.mockResolvedValue(false);
            createStore.mockRejectedValue(new Error("Failed to create store"));

            const result = await createImageStore();

            expect(result).toBe(false);
            expect(storeExists).toHaveBeenCalledWith(DB_IMAGES);
            expect(createStore).toHaveBeenCalledWith(imageStoreOptions);
        });
    });
});