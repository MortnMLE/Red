import { describe, test, expect, vi, beforeEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';
import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { authenticatedFetch } from '@/services/authentication';
import { updateDocumentTitleLinks } from '@/services/documents/documentLinks';
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

vi.mock('@/services/documents/documentLinks', () => ({
    updateDocumentTitleLinks: vi.fn(),
}));

vi.mock('@/services/debouncer', () => ({
    debouncer: vi.fn(callback => callback),
}));

describe('updateDocumentContent', () => {
    let composable;
    let activeDocument;

    beforeEach(() => {
        vi.clearAllMocks();

        activeDocument = {
            id: 'doc-1',
            content: 'Old content',
            title: 'Old title',
            version: 1,
            flags: { deleted: false, dirty: false, isNew: false },
        };

        composable = useDocuments();
        composable.documents.value = [activeDocument];
        composable.setActiveDocument('doc-1');

        authenticatedFetch.mockResolvedValue({ status: 200 });
        addOrSetLocalRecord.mockResolvedValue(undefined);
        updateDocumentTitleLinks.mockReturnValue([]);
    });

    test('should update the active document content and title', async () => {
        composable.updateDocumentContent('New content', 'New title');
        await Promise.resolve();

        expect(activeDocument.content).toBe('New content');
        expect(activeDocument.title).toBe('New title');
    });

    test('should use Title when the new title is empty', () => {
        composable.updateDocumentContent('New content', '');

        expect(activeDocument.title).toBe('Title');
    });

    test('should mark the active document as dirty', () => {
        composable.updateDocumentContent('New content', 'New title');

        expect(activeDocument.flags.dirty).toBe(true);
    });

    test('should persist the updated document locally and remotely', async () => {
        composable.updateDocumentContent('New content', 'Old title');
        await Promise.resolve();

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, expect.objectContaining({
            id: 'doc-1',
            content: 'New content',
            version: 2,
        }));
        expect(authenticatedFetch).toHaveBeenCalledWith(PATCHdocument, expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('New content'),
        }));
    });

    test('should update linked documents when the title changes', () => {
        const linkedDocument = {
            id: 'doc-2',
            content: 'See [Old title](Old title)',
            title: 'Second document',
            version: 1,
            flags: { deleted: false, dirty: false, isNew: false },
        };
        composable.documents.value.push(linkedDocument);
        updateDocumentTitleLinks.mockReturnValue([{ ...linkedDocument, content: 'See [New title](New title)' }]);

        composable.updateDocumentContent('New content', 'New title');

        expect(linkedDocument.content).toBe('See [New title](New title)');
        expect(linkedDocument.flags.dirty).toBe(true);
    });

    test('should leave the welcome document unchanged', () => {
        composable.setActiveDocument('welcome');
        const previousContent = composable.activeDocument.value.content;

        composable.updateDocumentContent('Changed content', 'Changed title');

        expect(composable.activeDocument.value.content).toBe(previousContent);
    });
});