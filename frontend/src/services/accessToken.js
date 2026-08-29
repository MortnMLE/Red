import { POSTrefreshAccessToken } from '@/constants/endpoints';

let accessToken = null;

let refreshPromise = null;

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token) {
    accessToken = token
}

export async function fetchAccessToken() {
    const response = await fetch(POSTrefreshAccessToken, {
        method: 'POST',
        credentials: 'include'
    });

    const data = await response.json();

    if (!data.success) {
        accessToken = setAccessToken(null);
        return false;
    }

    accessToken = setAccessToken(data.token);

    return true;
}

export async function authenticatedFetch(endpoint, options = {}) {
    const makeRequest = async () => {
        const token = getAccessToken();
        console.log(`fetch with token: ${token}`);

        return await fetch(endpoint, {
            ...options,
            headers: {
                ...options.headers,
                authorization: `Bearer ${token}`,
            },
        });
    };

    const response = await makeRequest();

    if (response.status !== 401 && response.status !== 403) {
        return response;
    }

    if (!refreshPromise) {
        refreshPromise = fetchAccessToken()
            .finally(() => {
                refreshPromise = null;
            });
    }

    const refreshed = await refreshPromise;

    if (!refreshed) {
        return response;
    }

    return await makeRequest();
}