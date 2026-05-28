export async function serverRequest(method, body, endpoint) {
    const response = await fetch(endpoint, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
    });
    
    const json = await response.json();

    return json;
}