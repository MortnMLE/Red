import { describe, expect, vi } from 'vitest';

vi.mock('@/services/images/imageServerService', () => ({
    serverFetchImageIdsForDocuments: vi.fn(),
    serverFetchImagesForIds: vi.fn(),
    newServerImage: vi.fn()
}));

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    localEntryExists: vi.fn(),
    addOrSetLocalRecord: vi.fn(),
    getLocalRecord: vi.fn(),
}));

import { 
    fetchMissingImages,
    getEmbeddedImageIds, 
    getServerImageIds,
    addServerImageToLocalStorage,
    requiresFetch,
    postMissingImages
} from '@/services/images/imageInitialization';

import { Parser } from '@/services/parser';

import { 
    newServerImage,
    serverFetchImageIdsForDocuments,
    serverFetchImagesForIds
} from '@/services/images/imageServerService';
import { 
    getLocalRecord, 
    localEntryExists, 
    getLocalRecord, 
    addOrSetLocalRecord
} from '@/services/indexedDB/indexedDbApi';

describe('imageInitialization', () => {
    let parser;

    beforeEach(() => {
        parser = new Parser();
    });

    afterEach(() => {
        vi.clearAllMocks()
    });

    describe('getEmbeddedImageIds', () => {
        test('should throw on invalid inputs', () => {
            const dic = new Map();
            expect(() => getEmbeddedImageIds(null, dic)).toThrow();
            expect(() => getEmbeddedImageIds(undefined, dic)).toThrow();
            expect(() => getEmbeddedImageIds('', dic)).toThrow();
            expect(() => getEmbeddedImageIds(6, dic)).toThrow();
            expect(() => getEmbeddedImageIds(true, dic)).toThrow();
            

            const documents = [];
            expect(() => getEmbeddedImageIds(documents, null)).toThrow();
            expect(() => getEmbeddedImageIds(documents, undefined)).toThrow();
            expect(() => getEmbeddedImageIds(documents, '')).toThrow();
            expect(() => getEmbeddedImageIds(documents, 6)).toThrow();
            expect(() => getEmbeddedImageIds(documents, true)).toThrow();
        });
        
        test('should return empty array and map on zero documents', () => {
            const map = new Map();
            const result = getEmbeddedImageIds([], map);

            expect(result).toEqual([]);
            expect(map.size).toBe(0);
        });

        test('should return empty array and map if document content does not contain ids', () => {
            vi.spyOn(Parser.prototype, 'parseImageIds').mockReturnValue([]);

            const map = new Map();
            const result = getEmbeddedImageIds([{id: 'id', content: 'content'}], map);

            expect(result).toEqual([]);
            expect(map.size).toBe(0);
        });


        test('should return ids and map with entries', () => {
            const spy = vi.spyOn(Parser.prototype, 'parseImageIds')
                .mockReturnValueOnce(['id1'])
                .mockReturnValueOnce(['id2']);
            
            const map = new Map();
            const documents = [
                {id: 'docId1', content: '!(image)[id1]'},
                {id: 'docId2', content: '!(image)[id2]'}
            ];

            const result = getEmbeddedImageIds(documents, map);

            expect(spy).toHaveBeenCalled();
            expect(result).toEqual(['id1', 'id2']);
            expect(map.get('id1')).toBe('docId1');
            expect(map.get('id2')).toBe('docId2');
        });

        test('should return empty on error in parseImageIds', () => {
            vi.spyOn(Parser.prototype, 'parseImageIds').mockThrow('error');
            
            const map = new Map();
            const documents = [
                {id: 'docId1', content: '!(image)[id1]'},
                {id: 'docId2', content: '!(image)[id2]'}
            ];

            const result = getEmbeddedImageIds(documents, map);
            expect(result).toEqual([]);
            expect(map.size).toBe(0);
        })
    });

    describe('getServerImageIds', async () => {
        test('should throw on invalid input', async () => {
            await expect(getServerImageIds('')).rejects.toThrow();
            await expect(getServerImageIds(true)).rejects.toThrow();
            await expect(getServerImageIds(123)).rejects.toThrow();
            await expect(getServerImageIds({})).rejects.toThrow();
            await expect(getServerImageIds(new Map())).rejects.toThrow();
        });

        test('should return empty array and serverWasReached is true on empty documents', async () => {
            const result = await getServerImageIds([]);

            expect(result.arr).toEqual([]);
            expect(result.serverWasReached).toBe(true);
        });

        test('should return empty array and serverWasReached is false', async () => {

        });

        test('should return empty array even if result.arr has entries and serverWasReached is false', async () => {
            vi.mocked(serverFetchImageIdsForDocuments).mockResolvedValue({
                arr: ['id1', 'id2'],
                serverWasReached: false
            });

            const result = await getServerImageIds(['doc1', 'doc2']);
            
            expect(result.arr).toEqual([]);
            expect(result.serverWasReached).toBe(false);
        });

        test('should return a valid result', async () => {
            vi.mocked(serverFetchImageIdsForDocuments).mockResolvedValue({
                arr: ['id1', 'id2'],
                serverWasReached: true
            });

            const result = await getServerImageIds(['doc1', 'doc2']);

            expect(result.arr).toEqual(['id1', 'id2']);
            expect(result.serverWasReached).toBe(true);
        });
    });

    describe('fetchMissingImages', async () => {
        test('should throw on invalid inputs', async () => {
            await expect(fetchMissingImages(123, [])).rejects.toThrow();
            await expect(fetchMissingImages('', [])).rejects.toThrow();
            await expect(fetchMissingImages({}, [])).rejects.toThrow();
            await expect(fetchMissingImages(true, [])).rejects.toThrow();
            await expect(fetchMissingImages(null, [])).rejects.toThrow();
            await expect(fetchMissingImages(undefined, [])).rejects.toThrow();
            
            await expect(fetchMissingImages([], 123)).rejects.toThrow();
            await expect(fetchMissingImages([], '')).rejects.toThrow();
            await expect(fetchMissingImages([], {})).rejects.toThrow();
            await expect(fetchMissingImages([], true)).rejects.toThrow();
            await expect(fetchMissingImages([], null)).rejects.toThrow();
            await expect(fetchMissingImages([], undefined)).rejects.toThrow();
        });

        test('should throw on invalid types of embeddedImageIds elements', async () => {
            await expect(fetchMissingImages([1], [])).rejects.toThrow();
            await expect(fetchMissingImages([true], [])).rejects.toThrow();
            await expect(fetchMissingImages([{}], [])).rejects.toThrow();
            await expect(fetchMissingImages([null], [])).rejects.toThrow();
            await expect(fetchMissingImages([undefined], [])).rejects.toThrow();
        });

        test('should return empty array, if serverImageIds is empty', async () => {
           vi.mocked(localEntryExists).mockResolvedValue(false);

            const result = await fetchMissingImages(['id1'], []);

            expect(result).toEqual([]);
        });

        test('should return empty array, if fetch from server is empty', async () => {
            vi.mocked(localEntryExists).mockResolvedValue(false);
            vi.mocked(serverFetchImagesForIds).mockResolvedValue([]);
            
            const result = await fetchMissingImages(
                ['id1'], ['id1'], new Map()
            );
            
            expect(result).toEqual([]);
        });

        test('should return array with object', async () => {
            const obj = new Object();
            
            vi.mocked(serverFetchImagesForIds).mockResolvedValue([
                {image: obj, id: 'serverImageId'}
            ]);

            const result = await fetchMissingImages(
                ['serverImageId'], ['serverImageId']
            );

            expect(result).toEqual([{image: obj, id: 'serverImageId'}])
        });
    });

    describe('addServerImageToLocalStorage', async () => {
        test('should throw on invalid inputs', async () => {
            await expect(addServerImageToLocalStorage(1, 'id')).rejects.toThrow();
            await expect(addServerImageToLocalStorage(true, 'id')).rejects.toThrow();
            await expect(addServerImageToLocalStorage([], 'id')).rejects.toThrow();
            await expect(addServerImageToLocalStorage('string', 'id')).rejects.toThrow();

            await expect(addServerImageToLocalStorage({}, 1)).rejects.toThrow();
            await expect(addServerImageToLocalStorage({}, true)).rejects.toThrow();
            await expect(addServerImageToLocalStorage({}, [])).rejects.toThrow();
            await expect(addServerImageToLocalStorage({}, {})).rejects.toThrow();
            await expect(addServerImageToLocalStorage({}, '')).rejects.toThrow();
        });

        test('should return 0 on error', async () => {
            const image = {
                id: 'imageId',
                file: new Blob(['test']),
                name: 'name',
                userId: 'userId',
                docId: 'docId'
            };

            addOrSetLocalRecord.mockRejectedValue(new Error(''));

            const result = await addServerImageToLocalStorage(image, 'docId');

            expect(result).toBe(0);
        });

        test('should return 1', async () => {
            const image = {
                id: 'imageId',
                file: new Blob(['test']),
                name: 'name',
                userId: 'userId',
                docId: 'docId'
            };

            addOrSetLocalRecord.mockResolvedValue({});

            const result = await addServerImageToLocalStorage(image, 'id');

            expect(result).toBe(1);
        });
    });

    describe('requiresFetch', async () => {
        test('should throw on invalid input', async () => {
            await expect(requiresFetch(1, [])).rejects.toThrow();
            await expect(requiresFetch(true, [])).rejects.toThrow();
            await expect(requiresFetch({}, [])).rejects.toThrow();
            await expect(requiresFetch([], [])).rejects.toThrow();
            await expect(requiresFetch('', [])).rejects.toThrow();

            await expect(requiresFetch('id', 1)).rejects.toThrow();
            await expect(requiresFetch('id', true)).rejects.toThrow();
            await expect(requiresFetch('id', {})).rejects.toThrow();
            await expect(requiresFetch('id', 'string')).rejects.toThrow();
        });

        test('should return false when localEntryExists throws', async () => {
            getLocalRecord.mockRejectedValue(new Error(''));

            const result = await requiresFetch('id', ['id']);

            expect(result).toBe(false);
        });

        test('should return true', async () => {
            getLocalRecord.mockResolvedValue(null);

            const result = await requiresFetch('id', ['id']);

            expect(result).toBe(true);
        });
    });

    describe('postMissingImages', async () => {
        test('should throw on invalid input', async () => {
            await expect(postMissingImages(1, [])).rejects.toThrow();
            await expect(postMissingImages(true, [])).rejects.toThrow();
            await expect(postMissingImages({}, [])).rejects.toThrow();
            await expect(postMissingImages('', [])).rejects.toThrow();

            await expect(postMissingImages([], 1)).rejects.toThrow();
            await expect(postMissingImages([], true)).rejects.toThrow();
            await expect(postMissingImages([], {})).rejects.toThrow();
            await expect(postMissingImages([], '')).rejects.toThrow();
        });

        test('should return empty array', async () => {
            const result = await postMissingImages([], []);

            expect(result).toEqual([]);
        });

        test('should not throw on error and return empty array', async () => {
            vi.mocked(getLocalRecord).mockThrow();
            
            const result = await postMissingImages(['id'], ['id1']);

            expect(result).toEqual([]);
            expect(getLocalRecord).toHaveBeenCalled();
        });

        test('should return two objects', async () => {
            const dummyImage = {docId: 'docId', name: 'name', file: {}};
            vi.mocked(getLocalRecord).mockResolvedValue(dummyImage);

            vi.mocked(newServerImage)
                .mockResolvedValueOnce('newid1')
                .mockThrowOnce()
                .mockResolvedValueOnce('newid3');

            const result = await postMissingImages(['id1', 'id2', 'id3'], []);
            
            expect(result).toEqual([
                { image: dummyImage, newId: 'newid1' },
                { image: dummyImage, newId: 'newid3' }
            ]);
        });
    });
});