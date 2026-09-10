import { beforeEach, describe, expect, test, vi } from 'vitest';

import { onMounted } from 'vue';
import { useSettings } from '@/composables/useSettings';
import { addOrSetLocalRecord, getLocalRecordsByIndex } from '@/services/indexedDB/indexedDbApi';
import { DB_DOCUMENTS, DB_IMAGES, DB_SETTINGS } from '@/constants/stores';

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

describe('onMounted', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.userId = 'user-1';
        addOrSetLocalRecord.mockResolvedValue(undefined);
    });

    test('should load the Vim setting and update the temporary ID count', async () => {
        getLocalRecordsByIndex
            .mockResolvedValueOnce([{ id: 'temp-document' }])
            .mockResolvedValueOnce([{ key: 'enableVim', value: true }])
            .mockResolvedValueOnce([{ id: 'image-1' }]);

        const composable = useSettings();
        const mountedCallback = onMounted.mock.calls[0][0];

        await mountedCallback();
        await Promise.resolve();

        expect(composable.enableVim.value).toBe(true);
        expect(composable.countTempIds.value).toBe(1);
        expect(getLocalRecordsByIndex).toHaveBeenNthCalledWith(
            2,
            DB_SETTINGS,
            'userId',
            'user-1'
        );
        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_SETTINGS, {
            key: 'countTemporaryIds',
            value: 1,
            userId: 'user-1',
        });
    });

    test('should use false when the Vim setting value is nullish', async () => {
        getLocalRecordsByIndex
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ key: 'enableVim', value: null }])
            .mockResolvedValueOnce([]);

        const composable = useSettings();
        const mountedCallback = onMounted.mock.calls[0][0];

        await mountedCallback();

        expect(composable.enableVim.value).toBe(false);
    });

    test('should log an error when settings cannot be loaded', async () => {
        const error = new Error('settings unavailable');
        getLocalRecordsByIndex
            .mockResolvedValueOnce([])
            .mockRejectedValueOnce(error)
            .mockResolvedValueOnce([]);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const composable = useSettings();
        const mountedCallback = onMounted.mock.calls[0][0];

        await mountedCallback();

        expect(consoleError).toHaveBeenCalledWith(
            'Error initializing local settings database: settings unavailable'
        );
        expect(composable.enableVim.value).toBe(Boolean);

        consoleError.mockRestore();
    });
});