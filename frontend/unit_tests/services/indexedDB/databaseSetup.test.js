import { afterEach, beforeEach, vi } from 'vitest';
import { 
    createDocumentStore,
    createImageStore,
    createSettingStore
} from '@/services/indexedDB/storeCreation';
import { ensureDBs } from '@/services/indexedDB/databaseSetup';
import { Validator } from '@/services/validator';
import { resetDB } from '@/services/indexedDB/databaseReset';
import { DB_DOCUMENTS, DB_IMAGES, DB_SETTINGS } from '@/constants/stores';

vi.mock('@/services/indexedDB/storeCreation', () => ({
    createDocumentStore: vi.fn(),
    createImageStore: vi.fn(),
    createSettingStore: vi.fn(),
}));

vi.mock('@/services/indexedDB/databaseReset', () => ({
    resetDB: vi.fn(),
}));

vi.mock('@/services/validator', () => ({
    Validator: {
        validateAsyncFunction: vi.fn(),
        validateObjectNotNull: vi.fn(),
    },
}));

describe('ensureDBs', () => {
    beforeEach(() => {
        vi.mocked(Validator.validateAsyncFunction).mockImplementation(() => true);
        vi.mocked(Validator.validateObjectNotNull).mockImplementation(() => true);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should start all store creation operations before handling failures', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(false);
        vi.mocked(createImageStore).mockResolvedValue(true);
        vi.mocked(createSettingStore).mockResolvedValue(true);
        vi.mocked(resetDB).mockResolvedValue(true);

        await ensureDBs();

        expect(createDocumentStore).toHaveBeenCalledOnce();
        expect(createImageStore).toHaveBeenCalledOnce();
        expect(createSettingStore).toHaveBeenCalledOnce();
    });

    test('should call all create functions', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(true);
        vi.mocked(createImageStore).mockResolvedValue(true);
        vi.mocked(createSettingStore).mockResolvedValue(true);

        await ensureDBs();

        expect(createDocumentStore).toHaveBeenCalledOnce();
        expect(createImageStore).toHaveBeenCalledOnce();
        expect(createSettingStore).toHaveBeenCalledOnce();
        expect(resetDB).not.toHaveBeenCalled();
    });

    test('should reset the document store when creation fails', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(false);
        vi.mocked(createImageStore).mockResolvedValue(true);
        vi.mocked(createSettingStore).mockResolvedValue(true);
        vi.mocked(resetDB).mockResolvedValue(true);

        await ensureDBs();

        expect(resetDB).toHaveBeenCalledOnce();
        expect(resetDB).toHaveBeenCalledWith(
            DB_DOCUMENTS,
            createDocumentStore
        );
    });

    test('should reset the image store when creation fails', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(true);
        vi.mocked(createImageStore).mockResolvedValue(false);
        vi.mocked(createSettingStore).mockResolvedValue(true);
        vi.mocked(resetDB).mockResolvedValue(true);

        await ensureDBs();

        expect(resetDB).toHaveBeenCalledOnce();
        expect(resetDB).toHaveBeenCalledWith(
            DB_IMAGES,
            createImageStore
        );
    });

    test('should reset the setting store when creation fails', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(true);
        vi.mocked(createImageStore).mockResolvedValue(true);
        vi.mocked(createSettingStore).mockResolvedValue(false);
        vi.mocked(resetDB).mockResolvedValue(true);

        await ensureDBs();

        expect(resetDB).toHaveBeenCalledOnce();
        expect(resetDB).toHaveBeenCalledWith(
            DB_SETTINGS,
            createSettingStore
        );
    });

    test('should reset all failed stores', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(false);
        vi.mocked(createImageStore).mockResolvedValue(false);
        vi.mocked(createSettingStore).mockResolvedValue(false);
        vi.mocked(resetDB).mockResolvedValue(true);

        await ensureDBs();

        expect(resetDB).toHaveBeenCalledTimes(3);

        expect(resetDB).toHaveBeenNthCalledWith(
            1,
            DB_SETTINGS,
            createSettingStore
        );
        expect(resetDB).toHaveBeenNthCalledWith(
            2,
            DB_DOCUMENTS,
            createDocumentStore
        );

        expect(resetDB).toHaveBeenNthCalledWith(
            3,
            DB_IMAGES,
            createImageStore
        );
    });

    test('should throw when document reset fails', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(false);
        vi.mocked(createImageStore).mockResolvedValue(true);
        vi.mocked(createSettingStore).mockResolvedValue(true);
        vi.mocked(resetDB).mockResolvedValue(false);

        await expect(ensureDBs()).rejects.toThrow();
    });

    test('should throw when image reset fails', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(true);
        vi.mocked(createImageStore).mockResolvedValue(false);
        vi.mocked(createSettingStore).mockResolvedValue(true);
        vi.mocked(resetDB).mockResolvedValue(false);

        await expect(ensureDBs()).rejects.toThrow();
    });

    test('should throw when setting reset fails', async () => {
        vi.mocked(createDocumentStore).mockResolvedValue(true);
        vi.mocked(createImageStore).mockResolvedValue(true);
        vi.mocked(createSettingStore).mockResolvedValue(false);
        vi.mocked(resetDB).mockResolvedValue(false);

        await expect(ensureDBs()).rejects.toThrow();
    });
});

