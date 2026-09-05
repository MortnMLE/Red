import { beforeEach, vi } from 'vitest';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(), 
}));

vi.mock('@/services/documents/backupDocument', () => ({
    backupDocument: vi.fn(),
}));

import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { backupDocument } from '@/services/documents/backupDocument';
import { tryUpdateLocalDocument } from '@/services/documents/localDocumentService';
import { DB_DOCUMENTS } from '@/constants/stores';

describe('localDocumentService -> tryUpdateLocalDocument', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should return without calling addOrSet when localDocument flagged as deleted', async () => {
        const localDocument = {flags: {deleted: true}};
        const serverDocument = {flags: {deleted: false}};

        addOrSetLocalRecord.mockResolvedValue({});

        await tryUpdateLocalDocument(localDocument, serverDocument);

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });

    test('should return without calling addOrSet when serverDocument is not flagged as deleted', async () => {
        const localDocument = {flags: {deleted: false}};
        const serverDocument = {flags: {deleted: true}};

        addOrSetLocalRecord.mockResolvedValue({});

        await tryUpdateLocalDocument(localDocument, serverDocument);

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();       
    });

    test('should not call addOrSet serverDocument.version is smaller than localdocument.version', async () => {
        const localDocument = {flags: {deleted: false}, version: 2};
        const serverDocument = {flags: {deleted: false}, version: 1};

        addOrSetLocalRecord.mockResolvedValue({});

        await tryUpdateLocalDocument(localDocument, serverDocument);

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();       
    });

    test('should not call addOrSet if versions are equal', async () => {
        const localDocument = {flags: {deleted: false}, version: 1};
        const serverDocument = {flags: {deleted: false}, version: 1};

        addOrSetLocalRecord.mockResolvedValue({});

        await tryUpdateLocalDocument(localDocument, serverDocument);

        expect(addOrSetLocalRecord).not.toHaveBeenCalled();       
    });

    test('should call backupDocument and addOrSet if localDocument is dirty', async () => {
        const localDocument = {flags: {deleted: false, dirty: true}, version: 1};
        const serverDocument = {flags: {deleted: false}, version: 2};

        addOrSetLocalRecord.mockResolvedValue({});
        backupDocument.mockResolvedValue(1);

        await tryUpdateLocalDocument(localDocument, serverDocument);

        expect(backupDocument).toHaveBeenCalledWith(localDocument);
        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, localDocument);
    });

    test('should call addOrSet only', async () => {
        const localDocument = {flags: {deleted: false, dirty: false}, version: 1};
        const serverDocument = {flags: {deleted: false}, version: 2};

        addOrSetLocalRecord.mockResolvedValue({});
        backupDocument.mockResolvedValue(1);

        await tryUpdateLocalDocument(localDocument, serverDocument);

        expect(backupDocument).not.toHaveBeenCalled();
        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, localDocument);
    });

    test('should not call addOrSet if backupDocument throws', async () => {
        const localDocument = {flags: {deleted: false, dirty: true}, version: 1};
        const serverDocument = {flags: {deleted: false}, version: 2};

        addOrSetLocalRecord.mockResolvedValue({});
        backupDocument.mockRejectedValue(new Error('error'));

        await tryUpdateLocalDocument(localDocument, serverDocument);

        expect(backupDocument).toHaveBeenCalledWith(localDocument);
        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });
});