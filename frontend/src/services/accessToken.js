import endpointRefreshAccessToken from '@/constants/endpoints';

let accessToken = null;

let refreshInProgress = false;

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token) {
    accessToken = token
}

export async function fetchAccessToken() {
    const response = await fetch(endpointRefreshAccessToken, {
        method: 'POST',
        credentials: 'include'
    });

    if (!response) {
        accessToken = setAccessToken(null);
        return false;
    }

    const data = await response.json();
    accessToken = setAccessToken(data.accessToken);

    return true;
}

export async function authenticatedFetch(endpoint, options = {}) {
    while (refreshInProgress) {
        await new Promise(r => setTimeout(r, 100));
    }

    const token = getAccessToken();

    const response = await fetch(endpoint, {
        ...options, 
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });
    
    if (response.status !== 401 && response.status !== 403) {
        return response;
    }

    refreshInProgress = true;

    try {
        if (await fetchAccessToken()){
            return await fetch(endpoint, {
                ...options, 
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${token}`,
                },
            });
        }
    } finally {
        refreshInProgress = false;
    }
}