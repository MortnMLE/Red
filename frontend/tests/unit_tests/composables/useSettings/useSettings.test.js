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

describe('useSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should expose a zero temporary ID count', () => {
        const composable = useSettings();

        expect(composable.countTempIds.value).toBe(0);
    });

    test('should expose the default Vim setting', () => {
        const composable = useSettings();

        expect(composable.enableVim.value).toBe(Boolean);
    });

    test('should expose the temporary ID update function', () => {
        const composable = useSettings();

        expect(composable.updateCountTempIds).toEqual(expect.any(Function));
    });
});