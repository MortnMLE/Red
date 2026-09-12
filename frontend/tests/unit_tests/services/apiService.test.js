import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serverRequest } from '@/services/apiService';

describe('serverRequest', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('sends the request payload and returns the parsed response json', async () => {
        const payload = { hello: 'world' };
        const responseJson = { success: true, data: ['ok'] };
        const fetchMock = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue(responseJson)
        });

        vi.stubGlobal('fetch', fetchMock);

        const result = await serverRequest('POST', payload, '/api/test');

        expect(fetchMock).toHaveBeenCalledWith('/api/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual(responseJson);
    });
});
