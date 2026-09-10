import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { File as NodeFile } from 'node:buffer';
import { FormData as NodeFormData } from 'undici';

const integrationEnabled = process.env.RUN_FRONTEND_INTEGRATION_TESTS === '1';
const describeIntegration = integrationEnabled ? describe : describe.skip;

const {
    localRecords,
    replaceLocalDbEntry,
    addOrSetLocalRecord,
} = vi.hoisted(() => {
    const records = new Map();
    return {
        localRecords: records,
        replaceLocalDbEntry: vi.fn(async (_store, record, oldId) => {
            records.delete(oldId);
            records.set(record.id, record);
        }),
        addOrSetLocalRecord: vi.fn(async (_store, record) => {
            records.set(record.id, record);
        }),
    };
});

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord,
    replaceLocalDbEntry,
    getLocalRecordsByIndex: vi.fn(async () => [...localRecords.values()]),
    getLocalRecord: vi.fn(async (store, id) => localRecords.get(id)),
}));

import {
    authenticatedFetch,
    getAccessToken,
    setAccessToken,
} from '@/services/authentication';
import { getDocumentsFromServer } from '@/services/documents/documentInitialization';
import {
    tryDeleteServerDocument,
    tryPostNewDocumentToServer,
    tryUpdateServerDocument,
} from '@/services/documents/serverDocumentService';
import {
    deleteImageFromServer,
    newServerImage,
    serverFetchImageIdsForDocuments,
    serverFetchImagesForIds,
} from '@/services/images/imageServerService';
import { postMissingImages } from '@/services/images/imageInitialization';
const apiBaseUrl = process.env.FRONTEND_INTEGRATION_API_URL || 'http://127.0.0.1:5000';
const nativeFetch = globalThis.fetch;

async function assertApiIsAvailable() {
    try {
        await nativeFetch(apiBaseUrl, { signal: AbortSignal.timeout(3000) });
    } catch {
        throw new Error(
            `Integration API is unavailable at ${apiBaseUrl}. ` +
            'Start the server with its integration environment before running this suite.'
        );
    }
}

function createCookieFetch() {
    let cookie = '';
    let refreshRequests = 0;

    const fetchWithCookies = async (input, options = {}) => {
        const headers = new Headers(options.headers);
        if (cookie && !headers.has('Cookie')) {
            headers.set('Cookie', cookie);
        }

        const response = await nativeFetch(input, {
            ...options,
            headers,
        });

        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            cookie = setCookie.split(';', 1)[0];
        }
        if (String(input).endsWith('/auth/refresh')) {
            refreshRequests += 1;
        }

        return response;
    };

    return {
        fetchWithCookies,
        getRefreshRequests: () => refreshRequests,
    };
}

describeIntegration('frontend API integration', () => {
    const username = `frontend-integration-${Date.now()}`;
    const password = 'integration-password';
    const createdDocumentIds = [];
    const createdImageIds = [];
    let fetchWithCookies;
    let getRefreshRequests;
    let userId;

    async function fetchJson(endpoint, options = {}) {
        const response = await fetchWithCookies(`${apiBaseUrl}${endpoint}`, options);
        return { response, body: await response.json() };
    }

    async function createDocument(overrides = {}) {
        const response = await authenticatedFetch(`${apiBaseUrl}/doc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Frontend integration document',
                content: '# Frontend integration',
                version: 1,
                ...overrides,
            }),
        });
        expect(response.status).toBe(201);
        const body = await response.json();
        createdDocumentIds.push(body.id);
        return body.id;
    }

    async function deleteDocument(id) {
        await authenticatedFetch(`${apiBaseUrl}/doc`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
    }

    beforeAll(async () => {
        await assertApiIsAvailable();

        const cookieFetch = createCookieFetch();
        fetchWithCookies = cookieFetch.fetchWithCookies;
        getRefreshRequests = cookieFetch.getRefreshRequests;
        vi.stubGlobal('fetch', fetchWithCookies);
        vi.stubGlobal('File', NodeFile);
        vi.stubGlobal('FormData', NodeFormData);

        const registration = await fetchJson('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        expect(registration.response.status).toBe(200);
        userId = registration.body.id;

        const login = await fetchJson('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        expect(login.response.status).toBe(200);
        setAccessToken(login.body.token);
        localStorage.setItem('userId', userId);
    });

    beforeEach(() => {
        localRecords.clear();
        vi.clearAllMocks();
    });

    afterAll(async () => {
        for (const imageId of createdImageIds) {
            await deleteImageFromServer(imageId);
        }
        for (const documentId of createdDocumentIds) {
            await deleteDocument(documentId);
        }
        setAccessToken(null);
        vi.unstubAllGlobals();
    });

    test('runs the frontend document and image API contract against the live server', async () => {
        const localDocument = {
            id: `local-${Date.now()}`,
            title: 'Frontend-created document',
            content: 'Created through the frontend service',
            version: 1,
            flags: { dirty: true, deleted: false, isNew: true },
        };

        await tryPostNewDocumentToServer(localDocument);
        expect(localDocument.flags.isNew).toBe(false);
        expect(localDocument.id).toMatch(/^[a-f\d]{24}$/);
        createdDocumentIds.push(localDocument.id);

        const loadedDocuments = await getDocumentsFromServer();
        expect(loadedDocuments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: localDocument.id,
                    content: localDocument.content,
                    version: 1,
                }),
            ])
        );

        localDocument.content = 'Updated through the frontend service';
        localDocument.version = 2;
        localDocument.flags.dirty = true;
        await tryUpdateServerDocument(localDocument, {
            ...localDocument,
            content: 'Created through the frontend service',
            version: 1,
            flags: { dirty: false, deleted: false, isNew: false },
        });
        expect(localDocument.flags.dirty).toBe(false);

        const image = new NodeFile(['frontend-image'], 'frontend.png', { type: 'image/png' });
        const imageId = await newServerImage(localDocument.id, image.name, image);
        expect(imageId).toMatch(/^[a-f\d]{24}$/);
        createdImageIds.push(imageId);

        const imageIds = await serverFetchImageIdsForDocuments([localDocument]);
        expect(imageIds).toEqual({ arr: [imageId], serverWasReached: true });

        const downloaded = await serverFetchImagesForIds([imageId]);
        expect(downloaded[0].name).toBe('frontend.png');
        expect(await downloaded[0].image.text()).toBe('frontend-image');

        expect(await deleteImageFromServer(imageId)).toBe(true);
        createdImageIds.splice(createdImageIds.indexOf(imageId), 1);
    }, 30000);

    test('refreshes once and retries concurrent frontend requests with the refresh cookie', async () => {
        const documentId = await createDocument({ title: 'Refresh contract' });
        const refreshCountBefore = getRefreshRequests();
        setAccessToken('expired-access-token');

        const [first, second] = await Promise.all([
            getDocumentsFromServer(),
            getDocumentsFromServer(),
        ]);

        expect(first).toEqual(expect.arrayContaining([expect.objectContaining({ id: documentId })]));
        expect(second).toEqual(expect.arrayContaining([expect.objectContaining({ id: documentId })]));
        expect(getRefreshRequests() - refreshCountBefore).toBe(1);
        expect(getAccessToken()).not.toBe('expired-access-token');
    });

    test('keeps dirty local state after a stale synchronization request fails', async () => {
        const documentId = await createDocument({ title: 'Synchronization contract' });
        const advanceServer = await authenticatedFetch(`${apiBaseUrl}/doc`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: documentId,
                title: 'Synchronization contract',
                content: 'new server content',
                version: 2,
            }),
        });
        expect(advanceServer.status).toBe(200);

        const localDocument = {
            id: documentId,
            title: 'Synchronization contract',
            content: 'stale content',
            version: 2,
            flags: { dirty: true, deleted: false, isNew: false },
        };

        const serverDocument = {
            ...localDocument,
            content: 'old server content',
            version: 1,
            flags: { dirty: false, deleted: false, isNew: false },
        };
        await tryUpdateServerDocument(localDocument, serverDocument);

        expect(localDocument.flags.dirty).toBe(true);
        expect(addOrSetLocalRecord).not.toHaveBeenCalled();

        const temporaryImageId = `temporary-image-${Date.now()}`;
        localRecords.set(temporaryImageId, {
            id: temporaryImageId,
            docId: documentId,
            name: 'sync.png',
            file: new NodeFile(['sync-image'], 'sync.png', { type: 'image/png' }),
        });
        const uploadedImages = await postMissingImages([temporaryImageId], []);
        expect(uploadedImages).toHaveLength(1);
        expect(uploadedImages[0]).toMatchObject({
            image: expect.objectContaining({ id: temporaryImageId }),
            newId: expect.stringMatching(/^[a-f\d]{24}$/),
        });
        const imageId = uploadedImages[0].newId;
        createdImageIds.push(imageId);

        await tryDeleteServerDocument(
            { id: documentId, flags: { deleted: true } },
            { id: documentId, flags: { deleted: false } }
        );
        const deletedDocument = await authenticatedFetch(`${apiBaseUrl}/doc/byId/${documentId}`);
        expect(deletedDocument.status).toBe(200);
        expect((await deletedDocument.json()).flags.deleted).toBe(true);
    }, 30000);
});
