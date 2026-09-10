import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/services/images/imageCacheService', () => ({
    createCacheEntriesForDocument: vi.fn(),
}));

import { useImages } from '@/composables/useImages';
import { createCacheEntriesForDocument } from '@/services/images/imageCacheService';

describe('initializeImageCacheForDocument', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createCacheEntriesForDocument.mockResolvedValue(undefined);
    });

    test('should create cache entries and increment the cache version', async () => {
        const composable = useImages();

        await composable.initializeImageCacheForDocument('doc-1');

        expect(createCacheEntriesForDocument).toHaveBeenCalledWith('doc-1');
        expect(composable.imageCacheVersion.value).toBe(1);
    });

    test('should reject an empty document id', async () => {
        const composable = useImages();

        await expect(composable.initializeImageCacheForDocument('')).rejects.toThrow();
        expect(createCacheEntriesForDocument).not.toHaveBeenCalled();
    });
});