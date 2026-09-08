import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/documents/serverDocumentService', () => ({
    tryDeleteServerDocument: vi.fn(),
    tryUpdateServerDocument: vi.fn(),
}));

vi.mock('@/services/documents/localDocumentService', () => ({
    tryCreateNewLocalDocument: vi.fn(),
}));

import { syncServerDocument } from '@/services/documents/documentSync';
import {
    tryDeleteServerDocument,
    tryUpdateServerDocument
} from '@/services/documents/serverDocumentService';
import { tryCreateNewLocalDocument } from '@/services/documents/localDocumentService';

describe('syncServerDocument', () => {

    beforeEach(() => {
        tryDeleteServerDocument.mockResolvedValue(undefined);
        tryUpdateServerDocument.mockResolvedValue(undefined);
        tryCreateNewLocalDocument.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('throws when localDocuments is null', async () => {
        const serverDocument = { id: '1' };

        await expect(syncServerDocument(serverDocument)).rejects.toThrow();
    });

    test('throws when localDocuments is not an array', async () => {
        const serverDocument = { id: '1' };

        await expect(syncServerDocument(serverDocument, true)).rejects.toThrow();
    });

    test('throws when serverDocument is null or undefined', async () => {
        const localDocuments = [];

        await expect(syncServerDocument(null, localDocuments)).rejects.toThrow();
        await expect(syncServerDocument(undefined, localDocuments)).rejects.toThrow();
    });

    test('calls tryDeleteServerDocument and tryUpdateServerDocument', async () => {
        const serverDocument = { id: '1', name: 'local' };
        const localDocument = { id: '1', name: 'server' };
        const localDocuments = [localDocument];

        await syncServerDocument(serverDocument, localDocuments);

        expect(tryDeleteServerDocument).toHaveBeenCalledWith(
            localDocument,
            serverDocument
        );
        expect(tryUpdateServerDocument).toHaveBeenCalledWith(
            localDocument,
            serverDocument
        );

        expect(tryCreateNewLocalDocument).not.toHaveBeenCalled();
    });

    test('calls tryCreateNewLocalDocument', async () => {
        const localDocument = { id: '1', name: 'local' };
        const serverDocuments = [
            { id: '2', name: 'different document' },
        ];

        await syncServerDocument(localDocument, serverDocuments);

        expect(tryDeleteServerDocument).not.toHaveBeenCalled();
        expect(tryCreateNewLocalDocument).toHaveBeenCalledWith(localDocument);
        expect(tryUpdateServerDocument).not.toHaveBeenCalled();
    });
});