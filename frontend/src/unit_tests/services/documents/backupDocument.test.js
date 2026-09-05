import { afterEach, vi } from 'vitest';

vi.mock('@/services/accessToken', () => ({
    authenticatedFetch: vi.fn(),
}));

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
}));

import { authenticatedFetch } from '@/services/accessToken';
import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { createDocument, createDocumentFlags} from '@/services/documents/documentFactory';
import { backupDocument } from '@/services/documents/backupDocument';
import { POSTnewDocument } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';

describe('backupDocument', () => {

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should call authenticatedFetch & createDocument & addOrSet with new id', async () => {
        const flags = createDocumentFlags(true,false,false);
        const document = createDocument(
            '123', 'content', 'title', 1, flags
        );

        authenticatedFetch.mockResolvedValue({
            status: 201,
            json: async () => {
                return {id: 'newId'};
            }
        });

        const backuptitle = document.title + ' - backup';

        await backupDocument(document);

        expect(authenticatedFetch).toHaveBeenCalledWith(POSTnewDocument, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: backuptitle,
                content: document.content,
                version: document.version,
                flags: { dirty: false, deleted: false, isNew: false}
            })
        });

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, createDocument(
            'newId',
            document.content,
            backuptitle,
            1,
            createDocumentFlags(false, false, true)
        ));
    });

    test('should call authenticatedFetch & createDocument & addOrSet with backup id', async () => {
        const flags = createDocumentFlags(true,false,false);
        const document = createDocument(
            '123', 'content', 'title', 1, flags
        );

        authenticatedFetch.mockResolvedValue({
            status: 500,
        });

        const backuptitle = document.title + ' - backup';

        await backupDocument(document);

        expect(authenticatedFetch).toHaveBeenCalledWith(POSTnewDocument, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: backuptitle,
                content: document.content,
                version: document.version,
                flags: { dirty: false, deleted: false, isNew: false}
            })
        });

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, createDocument(
            '123_backup',
            document.content,
            backuptitle,
            1,
            createDocumentFlags(false, false, true)
        ));
    });

    test('should throw if authenthicatedFetch throws', async () => {
        const flags = createDocumentFlags(true,false,false);
        const document = createDocument(
            '123', 'content', 'title', 1, flags
        );

        authenticatedFetch.mockRejectedValue(new Error(''))

        const backuptitle = document.title + ' - backup';

        await expect(backupDocument(document)).rejects.toThrow();

        expect(authenticatedFetch).toHaveBeenCalledWith(POSTnewDocument, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: backuptitle,
                content: document.content,
                version: document.version,
                flags: { dirty: false, deleted: false, isNew: false}
            })
        });

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();       
    });
});