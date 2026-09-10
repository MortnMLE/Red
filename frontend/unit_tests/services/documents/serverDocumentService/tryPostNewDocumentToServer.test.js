import { afterEach, vi } from 'vitest';

vi.mock('@/services/authentication', () => ({
    authenticatedFetch: vi.fn(),    
}));

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    replaceLocalDbEntry: vi.fn(),
}));

import { authenticatedFetch } from '@/services/authentication';
import { replaceLocalDbEntry } from '@/services/indexedDB/indexedDbApi';
import { tryPostNewDocumentToServer } from '@/services/documents/serverDocumentService';
import { POSTnewDocument } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';

describe('serverDocumentServer -> tryPostNewDocumentToServer', () => {
    let document;

    afterEach(() => {
        vi.clearAllMocks();
    });

    beforeEach(() => {
        document = {
            id: '123',
            content: 'content',
            title: 'title',
            version: 1,
            flags: {isNew: true, deleted: false}
        };
    });

    test('should fetch if document is not new', async () => {
        document.flags.isNew = false;

        authenticatedFetch.mockResolvedValue({
            status: 500,
        });

        await tryPostNewDocumentToServer(document);

        expect(authenticatedFetch).toHaveBeenCalledWith(POSTnewDocument, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: document.title,
                content: document.content,
                version: document.version,
                flags: document.flags
            }),
        });
    });

    test('should not fetch if document is deleted', async () => {
        document.flags.deleted = true;

        authenticatedFetch.mockResolvedValue({});

        await tryPostNewDocumentToServer(document);

        expect(authenticatedFetch).not.toHaveBeenCalled();        
    });

    test('should fetch, but not replace local document', async () => {
        authenticatedFetch.mockResolvedValue({
            status: 500,
        });

        await tryPostNewDocumentToServer(document);

        expect(authenticatedFetch).toHaveBeenCalledWith(POSTnewDocument, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: document.title,
                content: document.content,
                version: document.version,
                flags: document.flags
            }),
        });
    });

    test('should fetch and replace local document', async () => {
        authenticatedFetch.mockResolvedValue({
            status: 201,
            json: async () => {
                return {id: 'newId'}
            }
        });

        replaceLocalDbEntry.mockResolvedValue({});
        await tryPostNewDocumentToServer(document);
        
        const expectedFlags = {isNew: true, deleted: false}; 
        expect(authenticatedFetch).toHaveBeenCalledWith(POSTnewDocument, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: document.title,
                content: document.content,
                version: document.version,
                flags: expectedFlags
            }),
        });

        expect(replaceLocalDbEntry).toHaveBeenCalledWith(DB_DOCUMENTS, document, '123');
    });
});