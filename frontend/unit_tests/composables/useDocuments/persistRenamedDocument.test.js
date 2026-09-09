import { describe, test, expect, vi, beforeEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';
import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { authenticatedFetch } from '@/services/authentication';
import { DB_DOCUMENTS } from '@/constants/stores';
import { PATCHdocument } from '@/constants/endpoints';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
    getLocalRecord: vi.fn(),
}));

vi.mock('@/services/authentication', () => ({
    authenticatedFetch: vi.fn(),
}));

vi.mock('@/services/documents/documentInitialization', () => ({
    getDocumentsFromLocalStorage: vi.fn(),
    loadDocuments: vi.fn(),
}));

vi.mock('@/services/documents/documentSync', () => ({
    syncLocalDocument: vi.fn(),
    syncServerDocument: vi.fn(),
}));

describe('persistRenamedDocument', () => {
    let composable;
    let document;

    beforeEach(() => {
        vi.clearAllMocks();

        document = {
            id: 'doc-1',
            content: 'Updated content',
            title: 'Updated title',
            version: 3,
            flags: { deleted: false, dirty: true, isNew: false },
        };

        composable = useDocuments();
        addOrSetLocalRecord.mockResolvedValue(undefined);
        authenticatedFetch.mockResolvedValue({ status: 200 });
    });

    test('should increment the document version', async () => {
        await composable.persistRenamedDocument(document);

        expect(document.version).toBe(4);
    });

    test('should persist the renamed document locally before syncing', async () => {
        await composable.persistRenamedDocument(document);

        expect(addOrSetLocalRecord).toHaveBeenNthCalledWith(1, DB_DOCUMENTS, expect.objectContaining({
            id: 'doc-1',
            title: 'Updated title',
            version: 4,
        }));
    });

    test('should send the renamed document to the server', async () => {
        await composable.persistRenamedDocument(document);

        expect(authenticatedFetch).toHaveBeenCalledWith(PATCHdocument, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: 'doc-1',
                content: 'Updated content',
                title: 'Updated title',
                version: 4,
            }),
        });
    });

    test('should clear the dirty flag after a successful server response', async () => {
        await composable.persistRenamedDocument(document);

        expect(document.flags.dirty).toBe(false);
    });

    test('should keep the dirty flag when the server response is unsuccessful', async () => {
        authenticatedFetch.mockResolvedValue({ status: 500 });

        await composable.persistRenamedDocument(document);

        expect(document.flags.dirty).toBe(true);
    });

    test('should not propagate persistence errors', async () => {
        authenticatedFetch.mockRejectedValue(new Error('Network error'));

        await expect(composable.persistRenamedDocument(document)).resolves.toBeUndefined();
    });
});