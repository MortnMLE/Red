import { describe, expect, vi, spyOn } from 'vitest';

vi.mock('@/services/images/imageServerService', () => ({
    serverFetchImageIdsForDocuments: vi.fn(),
    serverFetchImagesForIds: vi.fn(),
}));

vi.mock('@/services/indexedDB/indexedDbService', () => ({
    localEntryExists: vi.fn(),
}));

import { 
    fetchMissingImages,
    getEmbeddedImageIds, 
    getServerImageIds,
    addServerImageToLocalStorage,
    requiresFetch
} from '@/services/images/imageInitService';

import { Parser } from '@/services/parser';

import { 
    serverFetchImageIdsForDocuments,
    serverFetchImagesForIds
} from '@/services/images/imageServerService';
import { localEntryExists } from '@/services/indexedDB/indexedDbService';

describe('imageInitService', () => {
    let parser;

    beforeEach(() => {
        vi.restoreAllMocks;
        parser = new Parser();
    })

    afterEach(() => {
        vi.restoreAllMocks()
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
            const result = getEmbeddedImageIds([{_id: 'id', content: 'content'}], map);

            expect(result).toEqual([]);
            expect(map.size).toBe(0);
        });


        test('should return ids and map with entries', () => {
            const spy = vi.spyOn(Parser.prototype, 'parseImageIds')
                .mockReturnValueOnce(['id1'])
                .mockReturnValueOnce(['id2']);
            
            const map = new Map();
            const documents = [
                {_id: 'docid1', content: '!(image)[id1]'},
                {_id: 'docid2', content: '!(image)[id2]'}
            ];

            const result = getEmbeddedImageIds(documents, map);

            expect(spy).toHaveBeenCalled();
            expect(result).toEqual(['id1', 'id2']);
            expect(map.get('id1')).toBe('docid1');
            expect(map.get('id2')).toBe('docid2');
        });

        test('should return empty on error in parseImageIds', () => {
            vi.spyOn(Parser.prototype, 'parseImageIds').mockThrow('error');
            
            const map = new Map();
            const documents = [
                {_id: 'docid1', content: '!(image)[id1]'},
                {_id: 'docid2', content: '!(image)[id2]'}
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
            const map = new Map();

            await expect(fetchMissingImages(123, [], map)).rejects.toThrow();
            await expect(fetchMissingImages('', [], map)).rejects.toThrow();
            await expect(fetchMissingImages({}, [], map)).rejects.toThrow();
            await expect(fetchMissingImages(true, [], map)).rejects.toThrow();
            await expect(fetchMissingImages(null, [], map)).rejects.toThrow();
            await expect(fetchMissingImages(undefined, [], map)).rejects.toThrow();
            
            await expect(fetchMissingImages([], 123, map)).rejects.toThrow();
            await expect(fetchMissingImages([], '', map)).rejects.toThrow();
            await expect(fetchMissingImages([], {}, map)).rejects.toThrow();
            await expect(fetchMissingImages([], true, map)).rejects.toThrow();
            await expect(fetchMissingImages([], null, map)).rejects.toThrow();
            await expect(fetchMissingImages([], undefined, map)).rejects.toThrow();

            await expect(fetchMissingImages([], [], 123)).rejects.toThrow();
            await expect(fetchMissingImages([], [], '')).rejects.toThrow();
            await expect(fetchMissingImages([], [], {})).rejects.toThrow();
            await expect(fetchMissingImages([], [], null)).rejects.toThrow();
            await expect(fetchMissingImages([], [], undefined)).rejects.toThrow();
            await expect(fetchMissingImages([], [], [])).rejects.toThrow();
        });

        test('should throw on invalid types of embeddedImageIds elements', async () => {
            const map = new Map();
            await expect(fetchMissingImages([1], [], map)).rejects.toThrow();
            await expect(fetchMissingImages([true], [], map)).rejects.toThrow();
            await expect(fetchMissingImages([{}], [], map)).rejects.toThrow();
            await expect(fetchMissingImages([null], [], map)).rejects.toThrow();
            await expect(fetchMissingImages([undefined], [], map)).rejects.toThrow();
        });

        test('should not call serverFetchImagesForIds, if serverImageIds is empty', async () => {
           vi.mocked(localEntryExists).mockResolvedValue(false);

            const result = await fetchMissingImages(
                ['id1'], [], new Map()
            );

            expect(serverFetchImagesForIds).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });

        test('should not call addServerImageToLocalStorage, if fetch from server is empty', async () => {
            vi.mocked(localEntryExists).mockResolvedValue(false);
            vi.mocked(serverFetchImagesForIds).mockResolvedValue([]);
            
            const result = await fetchMissingImages(
                ['id1'], ['id1'], new Map()
            );
            
            expect(result).toBe(0);
            expect(addServerImageToLocalStorage).not.toHaveBeenCalled();
        });

        test('should return 1 and call addServerImageToLocalStorage', async () => {
            vi.mocked(serverFetchImagesForIds).mockResolvedValue([{}]);

            const result = await fetchMissingImages(
                ['embeddedId1'], ['serverImageId1'], new Map()
            );

            expect(result).toBe(1);
            expect(addServerImageToLocalStorage).toHaveBeenCalled();
        });
    });

    describe('addServerImageToLocalStorage', async () => {
        
    });

    describe('syncFromLocalToServer', async () => {

    });
});