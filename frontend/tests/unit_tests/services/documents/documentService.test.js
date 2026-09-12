import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DB_DOCUMENTS } from '@/constants/stores';
import {
    addOrSetLocalRecord,
    getLocalRecord
} from '@/services/indexedDB/indexedDbApi';
import { replaceImageIdForStoredDocument } from '@/services/documents/documentService';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
    getLocalRecord: vi.fn()
}));

describe('documentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('replaces an image id in the stored document and saves it', async () => {
        const doc = {
            id: 'doc-1',
            content: '![image](old-id) and old-id should be replaced'
        };

        getLocalRecord.mockResolvedValue(doc);

        const result = await replaceImageIdForStoredDocument('old-id', 'new-id', 'doc-1');

        expect(getLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, 'doc-1');
        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, {
            ...doc,
            content: '![image](new-id) and new-id should be replaced'
        });
        expect(result).toBe(1);
    });

    it('returns early when the document does not exist locally', async () => {
        getLocalRecord.mockResolvedValue(null);

        const result = await replaceImageIdForStoredDocument('old-id', 'new-id', 'doc-1');

        expect(result).toBeUndefined();
        expect(addOrSetLocalRecord).not.toHaveBeenCalled();
    });

    it('throws for invalid string input before touching local storage', async () => {
        await expect(
            replaceImageIdForStoredDocument('', 'new-id', 'doc-1')
        ).rejects.toThrow('Input must not be empty');

        expect(getLocalRecord).not.toHaveBeenCalled();
    });
});
