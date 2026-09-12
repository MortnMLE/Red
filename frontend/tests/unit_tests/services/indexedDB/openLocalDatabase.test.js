import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openLocalDatabase } from '@/services/indexedDB/openLocalDatabase';

describe('openLocalDatabase', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resolves with the database instance when the request succeeds', async () => {
        const database = { name: 'RedDB' };
        let request;

        vi.stubGlobal('indexedDB', {
            open: vi.fn(() => {
                request = { result: database, error: new Error('failed') };
                return request;
            })
        });

        const promise = openLocalDatabase('RedDB');

        request.onsuccess();

        await expect(promise).resolves.toBe(database);
    });

    it('rejects with the indexedDB error when the request fails', async () => {
        const error = new Error('database open failed');
        let request;

        vi.stubGlobal('indexedDB', {
            open: vi.fn(() => {
                request = { result: null, error };
                return request;
            })
        });

        const promise = openLocalDatabase('RedDB');

        request.onerror();

        await expect(promise).rejects.toBe(error);
    });
});
