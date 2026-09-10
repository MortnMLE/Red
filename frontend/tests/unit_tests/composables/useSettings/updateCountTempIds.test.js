import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('vue', async () => {
    const actual = await vi.importActual('vue');

    return {
        ...actual,
        onMounted: vi.fn(),
    };
});

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
    getLocalRecordsByIndex: vi.fn(),
}));

import { useSettings } from '@/composables/useSettings';
import { addOrSetLocalRecord, getLocalRecordsByIndex } from '@/services/indexedDB/indexedDbApi';
import { DB_DOCUMENTS, DB_IMAGES, DB_SETTINGS } from '@/constants/stores';

describe('updateCountTempIds', () => {
    let composable;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.userId = 'user-1';
        addOrSetLocalRecord.mockResolvedValue(undefined);
        composable = useSettings();
    });

    test('should count temporary document and image IDs and persist the count', async () => {
        getLocalRecordsByIndex
            .mockResolvedValueOnce([
                { id: 'temp-document' },
                { id: 'document-1' },
                { id: 'another-temp-document' },
            ])
            .mockResolvedValueOnce([
                { id: 'image-1' },
                { id: 'temp-image' },
            ]);

        await composable.updateCountTempIds();

        expect(getLocalRecordsByIndex).toHaveBeenNthCalledWith(
            1,
            DB_DOCUMENTS,
            'userId',
            'user-1'
        );
        expect(getLocalRecordsByIndex).toHaveBeenNthCalledWith(
            2,
            DB_IMAGES,
            'userId',
            'user-1'
        );
        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_SETTINGS, {
            key: 'countTemporaryIds',
            value: 3,
            userId: 'user-1',
        });
        expect(composable.countTempIds.value).toBe(3);
    });

    test('should persist and expose zero when no temporary IDs exist', async () => {
        getLocalRecordsByIndex.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

        await composable.updateCountTempIds();

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_SETTINGS, {
            key: 'countTemporaryIds',
            value: 0,
            userId: 'user-1',
        });
        expect(composable.countTempIds.value).toBe(0);
    });
});