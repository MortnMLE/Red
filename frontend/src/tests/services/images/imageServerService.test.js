import { describe, expect, spyOn, afterEach, mock } from 'vitest';

vi.mock('@/services/apiService', () => ({
    serverRequest: vi.fn()
}));

import { 
    deleteImageFromServer, newServerImage,
    serverFetchImageIdsForDocuments, serverFetchImagesForIds 
} from '@/services/images/imageServerService';
import { serverRequest } from '@/services/apiService';

describe('imageServerService', () => {
    const validFile = new File(['Hallo'], 'hallo.txt');    

    afterEach(() => {
        vi.clearAllMocks()
    });

    describe('newServerImage', () => {
        test('should throw on invalid inputs', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch');

            await expect(newServerImage('', 'name', validFile)).rejects.toThrow();
            await expect(newServerImage(null, 'name', validFile)).rejects.toThrow();
            await expect(newServerImage(undefined, 'name', validFile)).rejects.toThrow(); 

            await expect(newServerImage('id', '', validFile)).rejects.toThrow();
            await expect(newServerImage('id', null, validFile)).rejects.toThrow();
            await expect(newServerImage('id', undefined, validFile)).rejects.toThrow();

            await expect(newServerImage('id', 'name', null)).rejects.toThrow();
            await expect(newServerImage('id', 'name', {})).rejects.toThrow();

            expect(fetchSpy).not.toHaveBeenCalled();
        });
        
        test('should return empty string on unsuccessful answer from server', async() => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    id: '',
                    success: false,
                })
            });

            const result = await newServerImage('docId', 'name', validFile);
            
            expect(result).toBe('');
        });

        test('should return the correct id on successful answer from server', async() => {
            const insertedId = 'insertedId';
            
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    id: 'insertedId',
                    success: true,
                }),
            });

            const result = await newServerImage('docId', 'name', validFile);

            expect(result).toBe(insertedId);
        });

        test('should return empty string on error inside try catch block', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            const result = await newServerImage('docId', 'name', validFile);

            expect(result).toBe('');
        });
    });

    describe('deleteImageFromServer', () => {
        test('should throw on invalid inputs', async () => {
            await expect(deleteImageFromServer('')).rejects.toThrow();
            await expect(deleteImageFromServer({})).rejects.toThrow();
            await expect(deleteImageFromServer(null)).rejects.toThrow();
            await expect(deleteImageFromServer(undefined)).rejects.toThrow();

            expect(serverRequest).not.toHaveBeenCalled();            
        });

        test('should return false on unsuccessful request', async () => {
            vi.mocked(serverRequest).mockResolvedValue({
                success: false
            });

            const result = await deleteImageFromServer('id');

            expect(result).toBe(false);
        });

        test('should return false on error', async () => {
            vi.mocked(serverRequest).mockRejectedValue(new Error('Server Error'));

            const result = await deleteImageFromServer('id');
            
            expect(result).toBe(false);
        });

        test('should return true on successful request', async () => {
            vi.mocked(serverRequest).mockResolvedValue({
                success: true
            });

            const result = await deleteImageFromServer('id');

            expect(result).toBe(true);
        });
    });

    describe('serverFetchImageIdsForDocuments', () => {
        test('should throw on invalid inputs', async () => {
            await expect(serverFetchImageIdsForDocuments({})).rejects.toThrow();
            await expect(serverFetchImageIdsForDocuments('')).rejects.toThrow();
            await expect(serverFetchImageIdsForDocuments(5)).rejects.toThrow();
            await expect(serverFetchImageIdsForDocuments(null)).rejects.toThrow();
            await expect(serverFetchImageIdsForDocuments(undefined)).rejects.toThrow();
        });

        test('should return empty result.arr with serverWasReached true on empty input arr', async () => {
            const result = await serverFetchImageIdsForDocuments([]);

            expect(result.arr.length).toBe(0);
            expect(result.serverWasReached).toBe(true);
        });

        test('should return serverWasReached is false if fetch throws', async () => {
            vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Error'));

            const result = await serverFetchImageIdsForDocuments(['id1', 'id2']);

            expect(result.serverWasReached).toBe(false);
        });

        test('should return empty array if fetch returns no images', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    images: [],
                    serverWasReached: true
                })
            });

            const result = await serverFetchImageIdsForDocuments(['id1']);

            expect(result.serverWasReached).toBe(true);
            expect(result.arr.length).toBe(0);
        });

        test('should return array of imageIds if fetch returns images', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    images: ['id1', 'id2'],
                    serverWasReached: true
                })
            });

            const result = await serverFetchImageIdsForDocuments(['docId1']);

            expect(result.serverWasReached).toBe(true);
            expect(result.arr.length).toBe(2);
            expect(result.arr[0]).toBe('id1');
            expect(result.arr[1]).toBe('id2');
        });

        test('should not throw in case of response.json error', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: vi.fn().mockRejectedValue(new Error('invalid json'))
            });

            const result = await serverFetchImageIdsForDocuments(['docId1']);

            expect(result).toBeDefined();
            expect(result.arr.length).toBe(0);
            expect(result.serverWasReached).toBe(false);
        });
    });

    describe('serverFetchImagesForIds', () => {
        test('should throw on invalid inputs', async () => {
            await expect(serverFetchImagesForIds('')).rejects.toThrow();
            await expect(serverFetchImagesForIds(null)).rejects.toThrow();
            await expect(serverFetchImagesForIds(undefined)).rejects.toThrow();
            await expect(serverFetchImagesForIds(5)).rejects.toThrow();
        });

        test('should return empty array on empty input', async () => {
            const result = await serverFetchImagesForIds([]);

            expect(result).toBeDefined();
            expect(result.length).toBe(0);
        });

        test('should not throw on fetch error', async () => {
            vi.spyOn(global, 'fetch').mockRejectedValue(new Error('error'));

            const result = await serverFetchImagesForIds(['id']);

            expect(result).toBeDefined();
            expect(result.length).toBe(0);
        });

        test('should return array of b', async () => {
            const response = new Response(new Uint8Array([1, 2, 3]));

            vi.spyOn(global, 'fetch').mockResolvedValue(response);

            const result = await serverFetchImagesForIds(['id1']);
            console.log(`here: ${typeof result}`);
            expect(result.length).toBe(1);
            expect(result[0]).toBeDefined();
        });
    });
});