import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    storeExists: vi.fn(),
    addOrSetLocalRecord: vi.fn(),
}));

vi.mock('@/services/images/imageCacheService', () => ({
    setImageCache: vi.fn(),
    createCacheEntriesForDocument: vi.fn(),
    revokeAllForDocId: vi.fn(),
}));

import { useImages } from '@/composables/useImages';
import { addOrSetLocalRecord, storeExists } from '@/services/indexedDB/indexedDbApi';
import { DB_IMAGES } from '@/constants/stores';

describe('createNewLocalImage', () => {
    let composable;
    let imageCache;
    const file = new File(['image'], 'image.png', { type: 'image/png' });

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.userId = 'user-1';
        storeExists.mockResolvedValue(true);
        addOrSetLocalRecord.mockResolvedValue(undefined);
        imageCache = { setUrl: vi.fn() };
        composable = useImages({ countTempIds: ref(4), imageCache });
    });

    test('should create a temporary image record and cache its file', async () => {
        const id = await composable.createNewLocalImage('doc-1', 'image.png', file);

        expect(id).toBe('temp-5');
        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_IMAGES, {
            id: 'temp-5',
            name: 'image.png',
            docId: 'doc-1',
            userId: 'user-1',
            file,
        });
        expect(imageCache.setUrl).toHaveBeenCalledWith('temp-5', file);
        expect(composable.imageCacheVersion.value).toBe(1);
    });

    test('should reject invalid image arguments', async () => {
        await expect(composable.createNewLocalImage('', 'image.png', file)).rejects.toThrow();
        await expect(composable.createNewLocalImage('doc-1', '', file)).rejects.toThrow();
        await expect(composable.createNewLocalImage('doc-1', 'image.png', null)).rejects.toThrow();
        expect(storeExists).not.toHaveBeenCalled();
    });
});