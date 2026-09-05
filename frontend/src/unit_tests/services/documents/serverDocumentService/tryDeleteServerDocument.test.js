import { afterEach, beforeEach, vi } from 'vitest';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
}));

vi.mock('@/services/accessToken', () => ({
    authenticatedFetch: vi.fn(),
}));

import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { authenticatedFetch } from '@/services/accessToken';
import { tryDeleteServerDocument } from '@/services/documents/serverDocumentService';
import { DELETEdoc } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';

describe('serverDocumentService => tryDeleteServerDocument', () => {
    let localDocument;
    let serverDocument;
    beforeEach(() => {
        localDocument  = {
            id: '123',
            title: 'title',
            content: 'content',
            version: 1,
            flags: {dirty: false, deleted: true, isNew: false}
        };

        serverDocument = {
            flags: {dirty: false, deleted: false, isNew: false}
        };
    })

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should not fetch if the localDocument is not deleted', async () => {
        localDocument.flags.deleted = false;

        authenticatedFetch.mockResolvedValue({});

        await tryDeleteServerDocument(localDocument, serverDocument);

        expect(authenticatedFetch).not.toHaveBeenCalled();
    });

    test('should not fetch if the localDocument is new', async () => {
        localDocument.flags.isNew = true;

        authenticatedFetch.mockResolvedValue({});

        await tryDeleteServerDocument(localDocument, serverDocument);

        expect(authenticatedFetch).not.toHaveBeenCalled();
    });

    test('should not fetch if the serverDocument is already marked as deleted', async () => {
        serverDocument.flags.deleted = true;

        await tryDeleteServerDocument(localDocument, serverDocument);

        expect(authenticatedFetch).not.toHaveBeenCalled();       
    });

    test('should fetch', async () => {
        authenticatedFetch.mockResolvedValue({
            status: 200
        });

        addOrSetLocalRecord.mockResolvedValue({});

        await tryDeleteServerDocument(localDocument, serverDocument);

        expect(authenticatedFetch).toHaveBeenCalledWith(DELETEdoc, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({id: localDocument.id}),
        });
    });

    test('should not throw on error', async () => {
        authenticatedFetch.mockRejectedValue(new Error(''));

        addOrSetLocalRecord.mockResolvedValue({});

        await expect(tryDeleteServerDocument(localDocument, serverDocument)).resolves.not.toThrow();

        expect(authenticatedFetch).toHaveBeenCalledWith(DELETEdoc, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({id: localDocument.id}),
        });
    });
});