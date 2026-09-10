import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';

import {
    addOrSetLocalRecord,
} from '@/services/indexedDB/indexedDbApi';

import { authenticatedFetch } from '@/services/authentication';

import {
    createDocument,
    createDocumentFlags,
} from '@/services/documents/documentFactory';

import { POSTnewDocument } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
    getLocalRecord: vi.fn(),
}));

vi.mock('@/services/authentication', () => ({
    authenticatedFetch: vi.fn(),
}));

vi.mock('@/services/documents/documentFactory', () => ({
    createDocument: vi.fn(),
    createDocumentFlags: vi.fn(),
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
    debouncer: vi.fn(fn => fn),
}));

describe('handleDocumentCreation', () => {
    let composable;
    let handleDocumentCreation;
    let countTempIds;
    let updateCountTempIds;

    const createdDocument = {
        id: 'temp-1',
        content: '',
        title: 'Title',
        version: 1,
        flags: {
            deleted: false,
            dirty: false,
            isNew: true,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();

        createdDocument.id = 'temp-1';
        createdDocument.content = '';
        createdDocument.title = 'Title';
        createdDocument.version = 1;
        createdDocument.flags = {
            deleted: false,
            dirty: false,
            isNew: true,
        };

        countTempIds = { value: 0 };
        updateCountTempIds = vi.fn().mockResolvedValue(undefined);

        createDocumentFlags.mockReturnValue(createdDocument.flags);
        createDocument.mockImplementation((id, content, title, version, flags) => {
            createdDocument.id = id;
            createdDocument.content = content;
            createdDocument.title = title;
            createdDocument.version = version;
            createdDocument.flags = flags;
            return createdDocument;
        });

        addOrSetLocalRecord.mockResolvedValue(undefined);

        authenticatedFetch.mockResolvedValue({
            json: vi.fn().mockResolvedValue({
                success: true,
                id: 'server-1',
            }),
        });

        localStorage.clear();
        localStorage.userId = 'user-1';

        composable = useDocuments({
            countTempIds,
            updateCountTempIds,
        });

        handleDocumentCreation = composable.handleDocumentCreation;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('should create a document using the next temporary ID', async () => {
        countTempIds.value = 4;

        await handleDocumentCreation();

        expect(createDocument).toHaveBeenCalledWith(
            'temp-5',
            '',
            'Title',
            1,
            createdDocument.flags,
        );
    });

    test('should create the document with new-document flags', async () => {
        await handleDocumentCreation();

        expect(createDocumentFlags).toHaveBeenCalledWith(false, false, true);
    });

    test('should add the created document to the documents collection', async () => {
        await handleDocumentCreation();

        expect(composable.documents.value.some(doc => doc.id === createdDocument.id)).toBe(true);
    });

    test('should open the newly created document', async () => {
        await handleDocumentCreation();

        expect(composable.documents.value.some(doc => doc.id === createdDocument.id)).toBe(true);
    });

    test('should set the newly created document as the active document', async () => {
        await handleDocumentCreation();

        expect(composable.documents.value[0].id).toBe('server-1');
    });

    test('should send the document to the server', async () => {
        await handleDocumentCreation();

        expect(authenticatedFetch).toHaveBeenCalledWith(
            POSTnewDocument,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'user-1',
                    title: 'Title',
                    content: '',
                    version: 1,
                    flags: {
                        deleted: false,
                        dirty: false,
                        isNew: true,
                    },
                }),
            },
        );
    });

    test('should use the current local storage user ID when creating the document', async () => {
        localStorage.userId = 'another-user';

        await handleDocumentCreation();

        expect(authenticatedFetch).toHaveBeenCalledWith(
            POSTnewDocument,
            expect.objectContaining({
                body: expect.stringContaining('"userId":"another-user"'),
            }),
        );
    });

    test('should replace the temporary ID with the server ID when creation succeeds', async () => {
        await handleDocumentCreation();

        expect(createdDocument.id).toBe('server-1');
    });

    test('should mark the document as no longer new when creation succeeds', async () => {
        await handleDocumentCreation();

        expect(createdDocument.flags.isNew).toBe(false);
    });

    test('should persist the server-created document locally', async () => {
        await handleDocumentCreation();

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, createdDocument);
    });

    test('should update the temporary ID count after creation', async () => {
        await handleDocumentCreation();

        expect(updateCountTempIds).toHaveBeenCalledTimes(1);
    });

    test('should persist the document when server creation is unsuccessful', async () => {
        authenticatedFetch.mockResolvedValue({
            json: vi.fn().mockResolvedValue({ success: false }),
        });

        await handleDocumentCreation();

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, createdDocument);
    });

    test('should keep the temporary ID when server creation is unsuccessful', async () => {
        authenticatedFetch.mockResolvedValue({
            json: vi.fn().mockResolvedValue({ success: false }),
        });

        await handleDocumentCreation();

        expect(createdDocument.id).toBe('temp-1');
    });

    test('should keep the document marked as new when server creation is unsuccessful', async () => {
        authenticatedFetch.mockResolvedValue({
            json: vi.fn().mockResolvedValue({ success: false }),
        });

        await handleDocumentCreation();

        expect(createdDocument.flags.isNew).toBe(true);
    });

    test('should persist the document when the server request fails', async () => {
        authenticatedFetch.mockRejectedValue(new Error('Network error'));

        await handleDocumentCreation();

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, createdDocument);
    });

    test('should update the temporary ID count when the server request fails', async () => {
        authenticatedFetch.mockRejectedValue(new Error('Network error'));

        await handleDocumentCreation();

        expect(updateCountTempIds).toHaveBeenCalledTimes(1);
    });

    test('should not propagate a server creation error', async () => {
        authenticatedFetch.mockRejectedValue(new Error('Network error'));

        await expect(handleDocumentCreation()).resolves.toBeUndefined();
    });

    test('should create a second document using the same temporary ID count when the count is not updated', async () => {
        await handleDocumentCreation();

        createdDocument.id = 'temp-1';
        createdDocument.flags.isNew = true;

        await handleDocumentCreation();

        expect(createDocument).toHaveBeenNthCalledWith(
            1,
            'temp-1',
            '',
            'Title',
            1,
            createdDocument.flags,
        );

        expect(createDocument).toHaveBeenNthCalledWith(
            2,
            'temp-1',
            '',
            'Title',
            1,
            createdDocument.flags,
        );
    });

    test('should wait for an existing creation to finish before creating another document', async () => {
        const pendingResponses = [];

        authenticatedFetch.mockImplementation(() => {
            let resolveResponse;
            const promise = new Promise(resolve => {
                resolveResponse = resolve;
            });

            pendingResponses.push(resolveResponse);
            return promise;
        });

        const firstCreation = handleDocumentCreation();
        await new Promise(resolve => setTimeout(resolve, 0));

        const secondCreation = handleDocumentCreation();
        await new Promise(resolve => setTimeout(resolve, 25));

        expect(createDocument).toHaveBeenCalledTimes(1);

        pendingResponses[0]({
            json: vi.fn().mockResolvedValue({
                success: true,
                id: 'server-1',
            }),
        });

        await firstCreation;
        await new Promise(resolve => setTimeout(resolve, 25));

        expect(createDocument).toHaveBeenCalledTimes(2);

        if (pendingResponses[1]) {
            pendingResponses[1]({
                json: vi.fn().mockResolvedValue({
                    success: true,
                    id: 'server-2',
                }),
            });
        }

        await secondCreation;
    });

    test('should call updateCountTempIds after local persistence', async () => {
        const calls = [];

        addOrSetLocalRecord.mockImplementation(async () => {
            calls.push('local');
        });

        updateCountTempIds.mockImplementation(async () => {
            calls.push('count');
        });

        await handleDocumentCreation();

        expect(calls).toEqual(['local', 'count']);
    });
});
