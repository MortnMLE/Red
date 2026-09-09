import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { DELETEdoc } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';
import { authenticatedFetch } from '@/services/authentication';
import { useDocuments } from '@/composables/useDocuments';

// Mock external dependencies, but NOT Validator.
vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
    getLocalRecord: vi.fn(),
}));

vi.mock('@/services/authentication', () => ({
    authenticatedFetch: vi.fn(),
}));

describe('deleteDocument', () => {
    const { documents, deleteDocument } = useDocuments({
        countTempIds: 0, updateCountTempIds: () => {}
    });

    beforeEach(() => {
        vi.clearAllMocks();

        documents.value = [
            {
                id: 'doc0',
                title: 'Document 1',
                flags: {
                    deleted: false,
                },
            },
            {
                id: 'doc-2',
                title: 'Document 2',
                flags: {
                    deleted: false,
                },
            },
        ];

        authenticatedFetch.mockResolvedValue({});
        addOrSetLocalRecord.mockResolvedValue(undefined);
    });

    test('should mark the document as deleted', async () => {
        const doc = documents.value[0];

        await deleteDocument(doc);

        expect(doc.flags.deleted).toBe(true);
    });

    test('should send a DELETE request for the document to the server', async () => {
        const doc = documents.value[0];

        await deleteDocument(doc);

        expect(authenticatedFetch).toHaveBeenCalledWith(
            DELETEdoc,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: doc.id,
                }),
            }
        );
    });

    test('should persist the deleted document locally', async () => {
        const doc = documents.value[0];

        await deleteDocument(doc);

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(
            DB_DOCUMENTS,
            expect.objectContaining({
                id: doc.id,
                flags: expect.objectContaining({
                    deleted: true,
                }),
            })
        );
    });

    test('should persist a cloned document locally instead of the original object', async () => {
        const doc = documents.value[0];

        await deleteDocument(doc);

        const savedDocument = addOrSetLocalRecord.mock.calls[0][1];

        expect(savedDocument).not.toBe(doc);
        expect(savedDocument).toEqual(doc);
    });

    test('should remove the deleted document from the sidebar after successful deletion', async () => {
        const doc = documents.value[0];

        await deleteDocument(doc);

        expect(documents.value).toEqual([
            {
                id: 'doc-2',
                title: 'Document 2',
                flags: {
                    deleted: false,
                },
            },
        ]);
    });

    test('should keep other documents in the sidebar after deleting a document', async () => {
        const doc = documents.value[0];

        await deleteDocument(doc);

        expect(documents.value).toHaveLength(1);
        expect(documents.value[0].id).toBe('doc-2');
    });

    test('should remove the document from the sidebar when the server request fails', async () => {
        const error = new Error('Server request failed');

        authenticatedFetch.mockRejectedValue(error);

        const doc = documents.value[0];

        await expect(deleteDocument(doc)).rejects.toThrow('Server request failed');

        expect(documents.value).not.toContain(doc);
    });

    test('should remove the document from the sidebar when local persistence fails', async () => {
        const error = new Error('Local persistence failed');

        addOrSetLocalRecord.mockRejectedValue(error);

        const doc = documents.value[0];

        await expect(deleteDocument(doc)).rejects.toThrow(
            'Local persistence failed'
        );

        expect(documents.value).not.toContain(doc);
    });

    test('should remove the document from the sidebar when both deletion operations fail', async () => {
        const serverError = new Error('Server request failed');
        const localError = new Error('Local persistence failed');

        authenticatedFetch.mockRejectedValue(serverError);
        addOrSetLocalRecord.mockRejectedValue(localError);

        const doc = documents.value[0];

        await expect(deleteDocument(doc)).rejects.toThrow(
            'Server request failed'
        );

        expect(documents.value).not.toContain(doc);
    });

    test('should not remove other documents when deletion fails', async () => {
        authenticatedFetch.mockRejectedValue(
            new Error('Server request failed')
        );

        const doc = documents.value[0];

        await expect(deleteDocument(doc)).rejects.toThrow();

        expect(documents.value).toHaveLength(1);
        expect(documents.value[0].id).toBe('doc-2');
    });

    test('should start the server and local deletion operations', async () => {
        const doc = documents.value[0];

        await deleteDocument(doc);

        expect(authenticatedFetch).toHaveBeenCalledTimes(1);
        expect(addOrSetLocalRecord).toHaveBeenCalledTimes(1);
    });
});