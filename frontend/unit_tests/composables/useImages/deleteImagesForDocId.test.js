import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    deleteLocalRecord: vi.fn(),
}));

vi.mock('@/services/images/imageCacheService', () => ({
    revokeAllForDocId: vi.fn(),
}));

vi.mock('@/services/images/imageServerService', () => ({
    deleteImageFromServer: vi.fn(),
}));

import { useImages } from '@/composables/useImages';
import { deleteLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { deleteImageFromServer } from '@/services/images/imageServerService';
import { DB_IMAGES } from '@/constants/stores';

describe('deleteImagesForDocId', () => {
    let composable;
    let imageCache;

    beforeEach(() => {
        vi.clearAllMocks();
        deleteImageFromServer.mockResolvedValue(true);
        deleteLocalRecord.mockResolvedValue(undefined);
        imageCache = { revokeUrl: vi.fn() };
        composable = useImages({ imageCache });
    });

    test('should delete embedded images from the server, local storage, and cache', async () => {
        await composable.deleteImagesForDocId({
            content: '![image](image-1)\n![image](image-2)',
        });

        expect(deleteImageFromServer).toHaveBeenNthCalledWith(1, 'image-1');
        expect(deleteImageFromServer).toHaveBeenNthCalledWith(2, 'image-2');
        expect(deleteLocalRecord).toHaveBeenNthCalledWith(1, DB_IMAGES, 'image-1');
        expect(deleteLocalRecord).toHaveBeenNthCalledWith(2, DB_IMAGES, 'image-2');
        expect(imageCache.revokeUrl).toHaveBeenCalledWith('image-1');
        expect(imageCache.revokeUrl).toHaveBeenCalledWith('image-2');
        expect(composable.imageCacheVersion.value).toBe(1);
    });

    test('should reject a null document', async () => {
        await expect(composable.deleteImagesForDocId(null)).rejects.toThrow();
        expect(deleteImageFromServer).not.toHaveBeenCalled();
    });
});