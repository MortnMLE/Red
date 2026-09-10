import { describe, expect, test, vi, afterEach } from 'vitest';

vi.mock('@/services/authentication', () => ({
    authenticatedFetch: vi.fn(),
}));

vi.mock('@/services/documents/documentFactory', () => ({
    createDocuments: vi.fn(),
}));

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    getLocalRecordsByIndex: vi.fn(),
}));

import { 
    getDocumentsFromLocalStorage, 
    getDocumentsFromServer 
} from '@/services/documents/documentInitialization';
import { authenticatedFetch } from '@/services/authentication';
import { createDocuments } from '@/services/documents/documentFactory';
import { getLocalRecordsByIndex } from '@/services/indexedDB/indexedDbApi';
import { GETdocsForUser } from '@/constants/endpoints';
import { DB_DOCUMENTS } from '@/constants/stores';

// loadDocuments is not explicitly tested as it only calls 
// getDocumentsFromServer and getDocumentsFromLocalStorage

describe('documentInitialization', () => {
    describe('getDocumentsFromServer', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            localStorage.clear();
        });

        test('should get the userId from localStorage', async () => {
            authenticatedFetch.mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    success: false,
                }),
            });

            createDocuments.mockReturnValue([]);

            await getDocumentsFromServer();

            expect(authenticatedFetch).toHaveBeenCalledWith(
                GETdocsForUser
            );
        });

        test('should fetch documents using the userId', async () => {
            authenticatedFetch.mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    success: true,
                    documents: [{ id: 1 }],
                }),
            });

            createDocuments.mockReturnValue([]);

            await getDocumentsFromServer();

            expect(authenticatedFetch).toHaveBeenCalledTimes(1);
            expect(authenticatedFetch).toHaveBeenCalledWith(
                GETdocsForUser
            );
        });

        test('should create documents from the documents returned by the server', async () => {
            const serverDocuments = [{ id: 1 }, { id: 2 }];
            const createdDocuments = [{ id: 1 }, { id: 2 }];

            authenticatedFetch.mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    success: true,
                    documents: serverDocuments,
                }),
            });

            createDocuments.mockReturnValue(createdDocuments);

            const result = await getDocumentsFromServer();

            expect(createDocuments).toHaveBeenCalledWith(serverDocuments);
            expect(result).toBe(createdDocuments);
        });

        test('should pass an empty array to createDocuments when the server response is unsuccessful', async () => {
            authenticatedFetch.mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    success: false,
                    documents: [{ id: 1 }],
                }),
            });

            createDocuments.mockReturnValue([]);

            await getDocumentsFromServer();

            expect(createDocuments).toHaveBeenCalledWith([]);
        });

        test('should return an empty array when authenticatedFetch throws an error', async () => {
            authenticatedFetch.mockRejectedValue(new Error('Network error'));

            const result = await getDocumentsFromServer();

            expect(result).toEqual([]);
            expect(createDocuments).not.toHaveBeenCalled();
        });

        test('should return an empty array when response.json throws an error', async () => {
            authenticatedFetch.mockResolvedValue({
                json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
            });

            const result = await getDocumentsFromServer();

            expect(result).toEqual([]);
            expect(createDocuments).not.toHaveBeenCalled();
        });

        test('should return an empty array when createDocuments throws an error', async () => {
            authenticatedFetch.mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    success: true,
                    documents: [{ id: 1 }],
                }),
            });

            createDocuments.mockImplementation(() => {
                throw new Error('Document creation failed');
            });

            const result = await getDocumentsFromServer();

            expect(result).toEqual([]);
        });
    });

    describe('getDocumentsFromLocalStorage', () => {
        test('should get the userId from localStorage', async () => {
            localStorage.setItem('userId', '123');

            getLocalRecordsByIndex.mockResolvedValue([]);
            createDocuments.mockReturnValue([]);

            await getDocumentsFromLocalStorage();

            expect(getLocalRecordsByIndex).toHaveBeenCalledWith(
                DB_DOCUMENTS,
                'userId',
                '123'
            );
        });

        test('should get local documents using the documents store and userId', async () => {
            localStorage.setItem('userId', '123');

            const localDocuments = [{ id: 1 }, { id: 2 }];

            getLocalRecordsByIndex.mockResolvedValue(localDocuments);
            createDocuments.mockReturnValue([]);

            await getDocumentsFromLocalStorage();

            expect(getLocalRecordsByIndex).toHaveBeenCalledTimes(1);
            expect(getLocalRecordsByIndex).toHaveBeenCalledWith(
                DB_DOCUMENTS,
                'userId',
                '123'
            );
        });

        test('should create documents from the local documents', async () => {
            localStorage.setItem('userId', '123');

            const localDocuments = [{ id: 1 }, { id: 2 }];
            const createdDocuments = [{ id: 1 }, { id: 2 }];

            getLocalRecordsByIndex.mockResolvedValue(localDocuments);
            createDocuments.mockReturnValue(createdDocuments);

            const result = await getDocumentsFromLocalStorage();

            expect(createDocuments).toHaveBeenCalledWith(localDocuments);
            expect(result).toBe(createdDocuments);
        });

        test('should return an empty array when no local documents are found', async () => {
            localStorage.setItem('userId', '123');

            getLocalRecordsByIndex.mockResolvedValue([]);
            createDocuments.mockReturnValue([]);

            const result = await getDocumentsFromLocalStorage();

            expect(createDocuments).toHaveBeenCalledWith([]);
            expect(result).toEqual([]);
        });

        test('should return an empty array when getLocalRecordsByIndex throws an error', async () => {
            localStorage.setItem('userId', '123');

            getLocalRecordsByIndex.mockRejectedValue(
                new Error('IndexedDB error')
            );

            const result = await getDocumentsFromLocalStorage();

            expect(result).toEqual([]);
            expect(createDocuments).not.toHaveBeenCalled();
        });

        test('should return an empty array when createDocuments throws an error', async () => {
            localStorage.setItem('userId', '123');

            const localDocuments = [{ id: 1 }];

            getLocalRecordsByIndex.mockResolvedValue(localDocuments);
            createDocuments.mockImplementation(() => {
                throw new Error('Document creation failed');
            });

            const result = await getDocumentsFromLocalStorage();

            expect(result).toEqual([]);
        });
    });
});