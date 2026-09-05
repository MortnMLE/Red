import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/documents/localDocumentService', () => ({
    tryCreateNewLocalDocument: vi.fn(),
    tryDeleteLocalDocument: vi.fn(),
    tryUpdateLocalDocument: vi.fn(),
}));

vi.mock('@/services/documents/serverDocumentService', () => ({
    tryPostNewDocumentToServer: vi.fn(),
}));

import { syncLocalDocument } from '@/services/documents/documentSync';
import {
    tryCreateNewLocalDocument,
    tryDeleteLocalDocument,
    tryUpdateLocalDocument
} from '@/services/documents/localDocumentService';
import { tryPostNewDocumentToServer } from '@/services/documents/serverDocumentService';

describe('syncLocalDocument', () => {

    beforeEach(() => {
        tryDeleteLocalDocument.mockResolvedValue(undefined);
        tryUpdateLocalDocument.mockResolvedValue(undefined);
        tryPostNewDocumentToServer.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('throws when serverDocuments is null', async () => {
        const localDocument = { id: '1' };

        await expect(syncLocalDocument(localDocument)).rejects.toThrow();
    });

    test('throws when serverDocuments is not an array', async () => {
        const localDocument = { id: '1' };

        await expect(syncLocalDocument(localDocument, true)).rejects.toThrow();
    });

    test('throws when localDocument is null or undefined', async () => {
        const serverDocuments = [];

        await expect(syncLocalDocument(null, serverDocuments)).rejects.toThrow();
        await expect(syncLocalDocument(undefined, serverDocuments)).rejects.toThrow();
    });

    test('calls tryDeleteLocalDocument and tryUpdateLocalDocument', async () => {
        const localDocument = { id: '1', name: 'local' };
        const serverDocument = { id: '1', name: 'server' };
        const serverDocuments = [serverDocument];

        await syncLocalDocument(localDocument, serverDocuments);

        expect(tryDeleteLocalDocument).toHaveBeenCalledWith(
            localDocument,
            serverDocument
        );
        expect(tryUpdateLocalDocument).toHaveBeenCalledWith(
        localDocument,
        serverDocument
        );

        expect(tryPostNewDocumentToServer).not.toHaveBeenCalled();
    });

    test('calls tryCreateNewLocalDocument', async () => {
        const localDocument = { id: '1', name: 'local' };
        const serverDocuments = [
            { id: '2', name: 'different document' },
        ];

        await syncLocalDocument(localDocument, serverDocuments);

        expect(tryDeleteLocalDocument).not.toHaveBeenCalled();
        expect(tryPostNewDocumentToServer).toHaveBeenCalledWith(localDocument);
        expect(tryUpdateLocalDocument).not.toHaveBeenCalled();
    });
});