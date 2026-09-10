import { describe, test, expect, vi, beforeEach } from 'vitest';

import { onMounted } from 'vue';
import { useDocuments } from '@/composables/useDocuments';
import { getDocumentsFromLocalStorage, loadDocuments } from '@/services/documents/documentInitialization';
import { syncLocalDocument, syncServerDocument } from '@/services/documents/documentSync';

vi.mock('vue', async () => {
    const actual = await vi.importActual('vue');

    return {
        ...actual,
        onMounted: vi.fn(),
    };
});

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

vi.mock('@/services/documents/documentLinks', () => ({
    updateDocumentTitleLinks: vi.fn(),
}));

describe('onMounted', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        loadDocuments.mockResolvedValue({
            localDocuments: [],
            serverDocuments: [],
        });
        getDocumentsFromLocalStorage.mockResolvedValue([]);
        syncLocalDocument.mockResolvedValue(undefined);
        syncServerDocument.mockResolvedValue(undefined);
    });

    test('should initialize documents by synchronizing local and server documents', async () => {
        const localDocument = { id: 'local-1', flags: { deleted: false } };
        const serverDocument = { id: 'server-1', flags: { deleted: false } };
        const updatedDocuments = [localDocument, serverDocument];

        loadDocuments.mockResolvedValue({
            localDocuments: [localDocument],
            serverDocuments: [serverDocument],
        });
        getDocumentsFromLocalStorage.mockResolvedValue(updatedDocuments);

        const composable = useDocuments();
        const mountedCallback = onMounted.mock.calls[0][0];

        await mountedCallback();

        expect(syncLocalDocument).toHaveBeenCalledWith(localDocument, [serverDocument]);
        expect(syncServerDocument).toHaveBeenCalledWith(serverDocument, [localDocument]);
        expect(composable.docsInitialized.value).toBe(true);
        expect(composable.documents.value).toEqual(updatedDocuments);
    });

    test('should exclude deleted documents after initialization', async () => {
        const visibleDocument = { id: 'visible', flags: { deleted: false } };
        const deletedDocument = { id: 'deleted', flags: { deleted: true } };
        getDocumentsFromLocalStorage.mockResolvedValue([visibleDocument, deletedDocument]);

        const composable = useDocuments();
        const mountedCallback = onMounted.mock.calls[0][0];

        await mountedCallback();

        expect(composable.documents.value).toEqual([visibleDocument]);
    });

    test('should skip loading when documents are already available', async () => {
        const composable = useDocuments();
        composable.documents.value = [{ id: 'existing', flags: { deleted: false } }];
        const mountedCallback = onMounted.mock.calls[0][0];

        await mountedCallback();

        expect(loadDocuments).not.toHaveBeenCalled();
        expect(composable.docsInitialized.value).toBe(true);
    });
});