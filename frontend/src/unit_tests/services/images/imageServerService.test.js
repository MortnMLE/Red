import { describe, expect, spyOn, afterEach, mock } from 'vitest';

vi.mock('@/services/authentication', () => ({
    authenticatedFetch: vi.fn()
}));

import { 
    deleteImageFromServer, newServerImage,
    serverFetchImageIdsForDocuments, serverFetchImagesForIds 
} from '@/services/images/imageServerService';
import { authenticatedFetch } from '@/services/authentication';

describe('imageServerService', () => {
    const validFile = new File(['Hallo'], 'hallo.txt');    

    afterEach(() => {
        vi.clearAllMocks()
    });

    describe('newServerImage', () => {
        test('should throw on invalid inputs', async () => {
            authenticatedFetch.mockResolvedValue({});

            await expect(newServerImage('', 'name', validFile)).rejects.toThrow();
            await expect(newServerImage(null, 'name', validFile)).rejects.toThrow();
            await expect(newServerImage(undefined, 'name', validFile)).rejects.toThrow(); 

            await expect(newServerImage('id', '', validFile)).rejects.toThrow();
            await expect(newServerImage('id', null, validFile)).rejects.toThrow();
            await expect(newServerImage('id', undefined, validFile)).rejects.toThrow();

            await expect(newServerImage('id', 'name', null)).rejects.toThrow();
            await expect(newServerImage('id', 'name', {})).rejects.toThrow();

            expect(authenticatedFetch).not.toHaveBeenCalled();
        });
        
        test('should return undefined on unsuccessful answer from server', async() => {
            authenticatedFetch.mockResolvedValue({
                json: vi.fn().mockResolvedValue({
                    id: '',
                    success: false,
                })
            });

            const result = await newServerImage('docId', 'name', validFile);
            
            expect(result).toBe(undefined);
        });

        test('should return the id on successful answer from server', async() => {
            const insertedId = 'insertedId';
            
            authenticatedFetch.mockResolvedValue({
                status: 200,
                json: vi.fn().mockResolvedValue({
                    id: 'insertedId',
                    success: true,
                }),
            });

            const result = await newServerImage('docId', 'name', validFile);

            expect(result).toBe(insertedId);
        });

        test('should return undefined on error inside try catch block', async () => {
            authenticatedFetch.mockResolvedValue({
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            const result = await newServerImage('docId', 'name', validFile);

            expect(result).toBe(undefined);
        });
    });

    describe('deleteImageFromServer', () => {
        test('should throw on invalid inputs', async () => {
            await expect(deleteImageFromServer('')).rejects.toThrow();
            await expect(deleteImageFromServer({})).rejects.toThrow();
            await expect(deleteImageFromServer(null)).rejects.toThrow();
            await expect(deleteImageFromServer(undefined)).rejects.toThrow();

            expect(authenticatedFetch).not.toHaveBeenCalled();            
        });

        test('should return false on unsuccessful request', async () => {
            authenticatedFetch.mockResolvedValue({
                success: false
            });

            const result = await deleteImageFromServer('id');

            expect(result).toBe(false);
        });

        test('should return false on error', async () => {
            authenticatedFetch.mockRejectedValue(new Error('Server Error'));

            const result = await deleteImageFromServer('id');
            
            expect(result).toBe(false);
        });

        test('should return true on successful request', async () => {
            authenticatedFetch.mockResolvedValue({
                json: vi.fn(() => {
                    return {success: true}
                }),
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
            authenticatedFetch.mockRejectedValue(new Error('Error'));

            const result = await serverFetchImageIdsForDocuments(['id1', 'id2']);

            expect(result.serverWasReached).toBe(false);
        });

        test('should return empty array if fetch returns no images', async () => {
            authenticatedFetch.mockResolvedValue({
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
            authenticatedFetch.mockResolvedValue({
                status: 200,
                json: vi.fn().mockResolvedValue({
                    images: ['id1', 'id2'],
                    success: true,
                }),
            });

            const result = await serverFetchImageIdsForDocuments(['docId1']);

            expect(result.arr.length).toBe(2);
            expect(result.arr[0]).toBe('id1');
            expect(result.arr[1]).toBe('id2');
        });

        test('should not throw in case of response.json error', async () => {
            authenticatedFetch.mockResolvedValue({
                json: vi.fn().mockRejectedValue(new Error('invalid json'))
            });

            const result = await serverFetchImageIdsForDocuments(['docId1']);

            expect(result).toBeDefined();
            expect(result.arr.length).toBe(0);
        });
    });

    describe('serverFetchImagesForIds', () => {
        test('should throw on invalid inputs', async () => {
            await expect(serverFetchImagesForIds('')).rejects.toThrow();
            await expect(serverFetchImagesForIds(null)).rejects.toThrow();
            await expect(serverFetchImagesForIds(undefined)).rejects.toThrow();
            await expect(serverFetchImagesForIds(5)).rejects.toThrow();
            await expect(serverFetchImagesForIds(true)).rejects.toThrow();
            await expect(serverFetchImagesForIds({})).rejects.toThrow();
        });

        test('should return empty array on empty input', async () => {
            const result = await serverFetchImagesForIds([]);

            expect(result).toBeDefined();
            expect(result.length).toBe(0);
        });

        test('should not throw and return empty array on fetch error', async () => {
            authenticatedFetch.mockRejectedValue(new Error('error'));

            const result = await serverFetchImagesForIds(['id']);

            expect(result).toEqual([]);
        });

        test('should return array of objects', async () => {
            const file = new File(['123'], 'image.png');

            authenticatedFetch.mockResolvedValue({
                status: 200,
                blob: async () => {
                    return file
                },
                headers: new Headers({
                    'Content-Disposition': "filename=\"image.png\""
                }),
            });

            const result = await serverFetchImagesForIds(['id1']);
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('id1');
            expect(result[0].name).toBe('image.png');
            expect(result[0].image).toBeInstanceOf(File);
            expect(result[0].image.name).toBe('image.png');
            expect(await result[0].image.text()).toBe(await file.text());
        });
    });
});