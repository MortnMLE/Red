import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
    fetchAccessToken,
    getAccessToken,
    setAccessToken,
    authenticatedFetch
} from '@/services/authentication';
import { POSTrefreshAccessToken } from '@/constants/endpoints';

describe ('authentication', () => {

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        setAccessToken(null);
    });

    describe('fetchAccessToken', () => {
        test('should fetch the access token with the correct request configuration', async () => {
            const response = {
                json: vi.fn().mockResolvedValue({
                    success: true,
                    token: 'access-token'
                })
            };

            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

            await fetchAccessToken();

            expect(fetch).toHaveBeenCalledWith(POSTrefreshAccessToken, {
                method: 'POST',
                credentials: 'include'
            });
        });

        test('should set the access token and return true when the response is successful', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    json: vi.fn().mockResolvedValue({
                        success: true,
                        token: 'access-token'
                    })
                })
            );

            const result = await fetchAccessToken();

            expect(result).toBe(true);
            expect(getAccessToken()).toBe('access-token');
        });

        test('should clear the access token and return false when the response is unsuccessful', async () => {
            setAccessToken('existing-token');

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    json: vi.fn().mockResolvedValue({
                        success: false
                    })
                })
            );

            const result = await fetchAccessToken();

            expect(result).toBe(false);
            expect(getAccessToken()).toBe(null);
        });

        test('should parse the response body before processing the result', async () => {
            const json = vi.fn().mockResolvedValue({
                success: true,
                token: 'access-token'
            });

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({ json })
            );

            await fetchAccessToken();

            expect(json).toHaveBeenCalledOnce();
        });

        test('should replace an existing access token when the response is successful', async () => {
            setAccessToken('old-token');

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    json: vi.fn().mockResolvedValue({
                        success: true,
                        token: 'new-token'
                    })
                })
            );

            const result = await fetchAccessToken();

            expect(result).toBe(true);
            expect(getAccessToken()).toBe('new-token');
        });
    });

    describe('authenticatedFetch', () => {
        test('should make a request with the access token in the authorization header', async () => {
            setAccessToken('access-token');

            const response = { status: 200 };
            const fetchMock = vi.fn().mockResolvedValue(response);

            vi.stubGlobal('fetch', fetchMock);

            const result = await authenticatedFetch('/api/resource');

            expect(result).toBe(response);
            expect(fetchMock).toHaveBeenCalledOnce();
            expect(fetchMock).toHaveBeenCalledWith('/api/resource', {
                headers: {
                    authorization: 'Bearer access-token'
                }
            });
        });

        test('should preserve existing request options', async () => {
            setAccessToken('access-token');

            const response = { status: 200 };
            const fetchMock = vi.fn().mockResolvedValue(response);

            vi.stubGlobal('fetch', fetchMock);

            const options = {
                method: 'POST',
                body: JSON.stringify({ name: 'test' }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Custom-Header': 'custom-value'
                }
            };

            await authenticatedFetch('/api/resource', options);

            expect(fetchMock).toHaveBeenCalledWith('/api/resource', {
                method: 'POST',
                body: JSON.stringify({ name: 'test' }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Custom-Header': 'custom-value',
                    authorization: 'Bearer access-token'
                }
            });
        });

        test('should return the response when the request succeeds', async () => {
            setAccessToken('access-token');

            const response = { status: 200 };
            const fetchMock = vi.fn().mockResolvedValue(response);

            vi.stubGlobal('fetch', fetchMock);

            const result = await authenticatedFetch('/api/resource');

            expect(result).toBe(response);
        });

        test('should return the response for a non-authentication error status', async () => {
            setAccessToken('access-token');

            const response = { status: 500 };
            const fetchMock = vi.fn().mockResolvedValue(response);

            vi.stubGlobal('fetch', fetchMock);

            const result = await authenticatedFetch('/api/resource');

            expect(result).toBe(response);
            expect(fetchMock).toHaveBeenCalledOnce();
        });

        test('should refresh the access token when the response status is 401', async () => {
            setAccessToken('expired-token');

            const unauthorizedResponse = { status: 401 };
            const authorizedResponse = { status: 200 };

            const fetchMock = vi.fn()
                .mockResolvedValueOnce(unauthorizedResponse)
                .mockResolvedValueOnce({
                    json: vi.fn().mockResolvedValue({
                        success: true,
                        token: 'new-token'
                    })
                })
                .mockResolvedValueOnce(authorizedResponse);

            vi.stubGlobal('fetch', fetchMock);

            const result = await authenticatedFetch('/api/resource');

            expect(result).toBe(authorizedResponse);
            expect(getAccessToken()).toBe('new-token');

            expect(fetchMock).toHaveBeenCalledTimes(3);
            expect(fetchMock).toHaveBeenNthCalledWith(
                1,
                '/api/resource',
                {
                    headers: {
                        authorization: 'Bearer expired-token'
                    }
                }
            );
            expect(fetchMock).toHaveBeenNthCalledWith(
                2,
                POSTrefreshAccessToken,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );
            expect(fetchMock).toHaveBeenNthCalledWith(
                3,
                '/api/resource',
                {
                    headers: {
                        authorization: 'Bearer new-token'
                    }
                }
            );
        });

        test('should refresh the access token when the response status is 403', async () => {
            setAccessToken('expired-token');

            const forbiddenResponse = { status: 403 };
            const authorizedResponse = { status: 200 };

            const fetchMock = vi.fn()
                .mockResolvedValueOnce(forbiddenResponse)
                .mockResolvedValueOnce({
                    json: vi.fn().mockResolvedValue({
                        success: true,
                        token: 'new-token'
                    })
                })
                .mockResolvedValueOnce(authorizedResponse);

            vi.stubGlobal('fetch', fetchMock);

            const result = await authenticatedFetch('/api/resource');

            expect(result).toBe(authorizedResponse);
            expect(getAccessToken()).toBe('new-token');
        });

        test('should return the original response when token refresh fails', async () => {
            setAccessToken('expired-token');

            const unauthorizedResponse = { status: 401 };

            const fetchMock = vi.fn()
                .mockResolvedValueOnce(unauthorizedResponse)
                .mockResolvedValueOnce({
                    json: vi.fn().mockResolvedValue({
                        success: false
                    })
                });

            vi.stubGlobal('fetch', fetchMock);

            const result = await authenticatedFetch('/api/resource');

            expect(result).toBe(unauthorizedResponse);
            expect(getAccessToken()).toBe(null);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        test('should use the refreshed access token for the retry request', async () => {
            setAccessToken('expired-token');

            const unauthorizedResponse = { status: 401 };
            const authorizedResponse = { status: 200 };

            const fetchMock = vi.fn()
                .mockResolvedValueOnce(unauthorizedResponse)
                .mockResolvedValueOnce({
                    json: vi.fn().mockResolvedValue({
                        success: true,
                        token: 'refreshed-token'
                    })
                })
                .mockResolvedValueOnce(authorizedResponse);

            vi.stubGlobal('fetch', fetchMock);

            await authenticatedFetch('/api/resource');

            expect(fetchMock).toHaveBeenNthCalledWith(
                3,
                '/api/resource',
                {
                    headers: {
                        authorization: 'Bearer refreshed-token'
                    }
                }
            );
        });

        test('should not refresh the access token for a successful response', async () => {
            setAccessToken('access-token');

            const fetchMock = vi.fn().mockResolvedValue({
                status: 204
            });

            vi.stubGlobal('fetch', fetchMock);

            await authenticatedFetch('/api/resource');

            expect(fetchMock).toHaveBeenCalledOnce();
        });

        test('should share the same token refresh request between concurrent requests', async () => {
            setAccessToken('expired-token');

            const firstUnauthorizedResponse = { status: 401 };
            const secondUnauthorizedResponse = { status: 401 };
            const firstAuthorizedResponse = { status: 200 };
            const secondAuthorizedResponse = { status: 200 };

            let resolveRefresh;

            const refreshResponse = {
                json: vi.fn().mockResolvedValue({
                    success: true,
                    token: 'new-token'
                })
            };

            const refreshPromiseMock = new Promise((resolve) => {
                resolveRefresh = resolve;
            });

            const fetchMock = vi.fn()
                .mockResolvedValueOnce(firstUnauthorizedResponse)
                .mockResolvedValueOnce(secondUnauthorizedResponse)
                .mockReturnValueOnce(refreshPromiseMock)
                .mockResolvedValueOnce(firstAuthorizedResponse)
                .mockResolvedValueOnce(secondAuthorizedResponse);

            vi.stubGlobal('fetch', fetchMock);

            const firstRequest = authenticatedFetch('/api/resource-1');
            const secondRequest = authenticatedFetch('/api/resource-2');

            expect(fetchMock).toHaveBeenCalledTimes(2);

            resolveRefresh(refreshResponse);

            const [firstResult, secondResult] = await Promise.all([
                firstRequest,
                secondRequest
            ]);

            expect(firstResult).toBe(firstAuthorizedResponse);
            expect(secondResult).toBe(secondAuthorizedResponse);

            expect(getAccessToken()).toBe('new-token');

            expect(fetchMock).toHaveBeenCalledTimes(5);
        });
    });
});