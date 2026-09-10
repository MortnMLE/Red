import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDB } from '@/services/indexedDB/databaseReset';
import { clearLocalDatabase } from '@/services/indexedDB/indexedDbApi';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    clearLocalDatabase: vi.fn(),
}));

describe('databaseSetup.resetDB', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('throws on wrong inputs', async () => {
        await expect(resetDB(null, async () => {})).rejects.toThrow();
        await expect(resetDB('1', async () => {})).rejects.toThrow();
        await expect(resetDB(1, async () => {})).rejects.toThrow();
        await expect(resetDB([], async () => {})).rejects.toThrow();

        await expect(resetDB({id: 1}, () => {})).rejects.toThrow();
        await expect(resetDB({id: 1}, '1')).rejects.toThrow();
        await expect(resetDB({id: 1}, 1)).rejects.toThrow();
        await expect(resetDB({id: 1}, [])).rejects.toThrow();
        await expect(resetDB({id: 1}, null)).rejects.toThrow();
    });

    test('should call clearLocalDatabase and create function, and return true', async () => {
        const storeObject = {};

        let funcCalled = false;
        
        const asyncFunc = async () => {
            funcCalled = true;
            return true;
        };

        const result = await resetDB(storeObject, asyncFunc);

        expect(clearLocalDatabase).toHaveBeenCalled();
        expect(funcCalled).toBe(true);
        expect(result).toBe(true);
    });

    test('should call clearLocalDatabase and create function, and return false', async () => {
        const storeObject = {};

        let funcCalled = false;
        const asyncFunc = async () => {
            funcCalled = true;
            return false;
        };       

        const result = await resetDB(storeObject, asyncFunc);

        expect(clearLocalDatabase).toHaveBeenCalled();
        expect(funcCalled).toBe(true);
        expect(result).toBe(false);
    });

    test('should return false if clearLocalDatabase throws', async () => {
        const storeObject = {};

        let funcCalled = false;
        const asyncFunc = async () => {
            funcCalled = true;
            throw (new Error('error'));
        };       

        const result = await resetDB(storeObject, asyncFunc);

        expect(clearLocalDatabase).toHaveBeenCalled();
        expect(funcCalled).toBe(true);
        expect(result).toBe(false);
    });
});