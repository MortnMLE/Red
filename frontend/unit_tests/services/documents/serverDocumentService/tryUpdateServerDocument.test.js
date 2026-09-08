import { vi } from 'vitest';

vi.mock('@/services/authentication', () => ({
    authenticatedFetch: vi.fn(),
}));

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn()
}));

import { authenticatedFetch } from '@/services/authentication';
import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { PATCHdocument } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';
import { tryUpdateServerDocument } from '@/services/documents/serverDocumentService';

describe('serverDoucmentService -> tryUpdateServerDocument', () => {
    test('should not fetch and addOrSet if localversion <= serverversion', async () => {
        const localDocument = {version: 1, flags: {dirty: true}};
        const serverDocument = {version: 2, flags: {deleted: false}};

        authenticatedFetch.mockResolvedValue({});
        addOrSetLocalRecord.mockResolvedValue({});

        await tryUpdateServerDocument(localDocument, serverDocument);

        expect(authenticatedFetch).not.toHaveBeenCalled();
        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });

    test('should not fetch and addOrSet if local document is not dirty', async () => {
        const localDocument = {version: 3, flags: {dirty: false}};
        const serverDocument = {version: 2, flags: {dirty: true}};

        authenticatedFetch.mockResolvedValue({});
        addOrSetLocalRecord.mockResolvedValue({});

        await tryUpdateServerDocument(localDocument, serverDocument);

        expect(authenticatedFetch).not.toHaveBeenCalled();
        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });

    test('should not fetch and addOrSet if serverDocument is deleted', async () => {
        const localDocument = {version: 3, flags: {dirty: true}};
        const serverDocument = {version: 2, flags: {dirty: true, deleted: true}};

        authenticatedFetch.mockResolvedValue({});
        addOrSetLocalRecord.mockResolvedValue({});

        await tryUpdateServerDocument(localDocument, serverDocument);

        expect(authenticatedFetch).not.toHaveBeenCalled();
        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });

    test('should fetch and addOrSet if fetch returns 200', async () => {
        const localDocument = {
            id: '123',
            content: 'content',
            title: 'title',
            version: 3, 
            flags: { dirty: true }
        };
        const serverDocument = {version: 2, flags: {dirty: true, deleted: false}};

        authenticatedFetch.mockResolvedValue({
            status: 200, 
            json: async () => {
                return {
                    id: '123',
                    newSyncedVersion: 3,
                    success: true
                };
            }
        });

        addOrSetLocalRecord.mockResolvedValue({});
        await tryUpdateServerDocument(localDocument, serverDocument);

        localDocument.flags.dirty = true;

        expect(authenticatedFetch).toHaveBeenCalledWith(PATCHdocument, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(localDocument)
        });

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, localDocument);
    });

    test('should not addOrSet if fetch fails', async () => {
        const localDocument = {
            id: '123',
            content: 'content',
            title: 'title',
            version: 3, 
            flags: { dirty: true }
        };
        const serverDocument = {version: 2, flags: {dirty: true, deleted: false}};

        authenticatedFetch.mockResolvedValue({
            status: 500, 
        });
        addOrSetLocalRecord.mockResolvedValue({});
        await tryUpdateServerDocument(localDocument, serverDocument);

        expect(authenticatedFetch).toHaveBeenCalledWith(PATCHdocument, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(localDocument)
        });

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });

    test('should handle errors silently', async () => {
        const localDocument = {
            id: '123',
            content: 'content',
            title: 'title',
            version: 3, 
            flags: { dirty: true }
        };
        const serverDocument = {version: 2, flags: {dirty: true, deleted: false}};

        authenticatedFetch.mockRejectedValue(new Error(''));
        addOrSetLocalRecord.mockResolvedValue({});

        await expect(tryUpdateServerDocument(localDocument, serverDocument)).resolves.not.toThrow();

        expect(authenticatedFetch).toHaveBeenCalledWith(PATCHdocument, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(localDocument),
        });

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });
});