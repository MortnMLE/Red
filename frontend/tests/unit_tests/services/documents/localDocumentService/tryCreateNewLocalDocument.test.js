import { afterEach, describe, expect, vi } from 'vitest';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
}));

import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { tryCreateNewLocalDocument } from '@/services/documents/localDocumentService';
import { DB_DOCUMENTS } from '@/constants/stores';

describe('localDocumentService -> tryCreateNewLocalDocument', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });
    
    test('should call addOrSet and return true', async () => {
        addOrSetLocalRecord.mockResolvedValue({});
        const document = {};
        await tryCreateNewLocalDocument(document);
        
        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, document);
    });

    test('should return false if addOrSet throws', async () => {
        addOrSetLocalRecord.mockRejectedValue(new Error(''));
        const document = {};
        await tryCreateNewLocalDocument(document);

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, document);
    });
});