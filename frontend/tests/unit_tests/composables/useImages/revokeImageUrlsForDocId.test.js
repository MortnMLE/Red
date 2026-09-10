import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/services/images/imageCacheService', () => ({
    revokeAllForDocId: vi.fn(),
}));

import { useImages } from '@/composables/useImages';
import { revokeAllForDocId } from '@/services/images/imageCacheService';

describe('revokeImageUrlsForDocId', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        revokeAllForDocId.mockResolvedValue(undefined);
    });

    test('should revoke all image urls for a document and increment the cache version', async () => {
        const composable = useImages();

        await composable.revokeImageUrlsForDocId('doc-1');

        expect(revokeAllForDocId).toHaveBeenCalledWith('doc-1');
        expect(composable.imageCacheVersion.value).toBe(1);
    });
});