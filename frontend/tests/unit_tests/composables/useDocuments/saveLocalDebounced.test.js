import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';
import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { DB_DOCUMENTS } from '@/constants/stores';

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

import { authenticatedFetch } from '@/services/authentication';

describe('saveLocalDebounced', () => {
    const document = {
        id: 'doc-1',
        content: 'Updated content',
        title: 'Document',
        version: 1,
        flags: { deleted: false, dirty: true, isNew: false },
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        addOrSetLocalRecord.mockResolvedValue(undefined);
        authenticatedFetch.mockResolvedValue({ status: 200 });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('should save the active document locally after the debounce delay', async () => {
        const composable = useDocuments();
        composable.documents.value = [structuredClone(document)];
        composable.setActiveDocument(document.id);

        composable.updateDocumentContent(document.content, document.title);

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(500);

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(
            DB_DOCUMENTS,
            expect.objectContaining({
                id: document.id,
                version: 2,
            }),
        );
    });

    test('should increment the document version before saving locally', async () => {
        const composable = useDocuments();
        composable.documents.value = [structuredClone(document)];
        composable.setActiveDocument(document.id);

        composable.updateDocumentContent(document.content, document.title);
        await vi.advanceTimersByTimeAsync(500);

        expect(composable.activeDocument.value.version).toBe(2);
    });
});