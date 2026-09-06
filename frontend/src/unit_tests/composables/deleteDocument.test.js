import { afterEach, vi } from 'vitest';

vi.mock('@/services/accessToken', () => ({
    authenticatedFetch: vi.fn(),
}));

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
}));

import { authenticatedFetch } from '@/services/accessToken';
import { addOrSetLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { DELETEdoc } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';
import { useDocuments } from '@/composables/useDocuments';

const { deleteDocument } = useDocuments();

describe('useDocuments.deleteDocument', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('should fetch and set the local document', async () => {
        const document = {id: '123', flags: {deleted: false}};
        authenticatedFetch.mockResolvedValue({success: true});
        addOrSetLocalRecord.mockResolvedValue({});

        await expect(deleteDocument(document)).resolves.not.toThrow();

        expect(authenticatedFetch).toHaveBeenCalledWith(DELETEdoc, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: '123'
            }),
        });

        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, 
            document
        );
    });
});