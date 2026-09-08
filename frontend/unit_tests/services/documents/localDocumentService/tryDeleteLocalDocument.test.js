import { afterEach, vi } from 'vitest';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
}));

import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { tryDeleteLocalDocument } from '@/services/documents/localDocumentService';
import { DB_DOCUMENTS } from '@/constants/stores';

describe('localDocumentService -> tryDeleteLocalDocument', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should return without calling addOrSet if localdocument is marked as deleted', async () => {
        let localDocument = { flags: { deleted: true }};
        let serverDocument = { flags: { deleted: true }};

        await tryDeleteLocalDocument(localDocument, serverDocument);

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });

    test('should return without calling addOrSet if serverDocument is not marked as deleted', async () => {
        let localDocument = { flags: { deleted: false }};
        let serverDocument = { flags: { deleted: false }};

        await tryDeleteLocalDocument(localDocument, serverDocument);

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });

    test('should call addOrSet', async () => {
        let localDocument = { flags: { deleted: false }};
        let serverDocument = { flags: { deleted: true }};       

        await tryDeleteLocalDocument(localDocument, serverDocument);

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(
            DB_DOCUMENTS, localDocument
        );
    });
})