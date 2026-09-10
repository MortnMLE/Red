import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';
import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { authenticatedFetch } from '@/services/authentication';
import { PATCHdocument } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';
import { updateDocumentTitleLinks } from '@/services/documents/documentLinks';

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

describe('syncRemoteDebounced', () => {
    const document = {
        id: 'doc-1',
        content: 'Updated content',
        title: 'Document',
        version: 1,
        flags: { deleted: false, dirty: false, isNew: false },
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        addOrSetLocalRecord.mockResolvedValue(undefined);
        authenticatedFetch.mockResolvedValue({ status: 200 });
        updateDocumentTitleLinks.mockReturnValue([]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('should send the updated document to the server after the debounce delay', async () => {
        const composable = useDocuments();
        composable.documents.value = [structuredClone(document)];
        composable.setActiveDocument(document.id);

        composable.updateDocumentContent('New content', 'New title');
        await vi.advanceTimersByTimeAsync(1000);

        expect(authenticatedFetch).toHaveBeenCalledWith(
            PATCHdocument,
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({
                    id: document.id,
                    content: 'New content',
                    title: 'New title',
                    version: 2,
                }),
            }),
        );
    });

    test('should clear the dirty flag and save the synchronized document locally', async () => {
        const composable = useDocuments();
        composable.documents.value = [structuredClone(document)];
        composable.setActiveDocument(document.id);

        composable.updateDocumentContent('New content', document.title);
        await vi.advanceTimersByTimeAsync(1000);

        expect(composable.activeDocument.value.flags.dirty).toBe(false);
        expect(addOrSetLocalRecord).toHaveBeenLastCalledWith(
            DB_DOCUMENTS,
            expect.objectContaining({
                id: document.id,
                content: 'New content',
                version: 2,
                flags: expect.objectContaining({ dirty: false }),
            }),
        );
    });
});