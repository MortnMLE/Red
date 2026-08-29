import { vi } from 'vitest';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    getLocalRecordsByIndex: vi.fn()
}));

import { setImageCache, getImageCache, createCacheEntriesForImages, freeImageCache, revokeAllForDocId, createCacheEntriesForDocument } from '@/services/images/imageCacheService';
import { ImageCache } from '@/services/images/imageCache';
import { getLocalRecordsByIndex } from '@/services/indexedDB/indexedDbApi';
describe('imageCacheService', () => {

    afterEach(() => {
        freeImageCache();
    });

    describe('setImageCache', () => {
        test('should throw on invalid input', () => {
            expect(() => setImageCache(1)).toThrow();
            expect(() => setImageCache('')).toThrow();
            expect(() => setImageCache([])).toThrow();
            expect(() => setImageCache(true)).toThrow(); 
            expect(() => setImageCache({})).toThrow();
        });

        test('should set imageCache', () => {
            const cache = new ImageCache();

            setImageCache(cache);

            const result = getImageCache();
            expect(result).toEqual(cache);
        });
    });

    describe('getImageCache', () => {
        test('should return imageCache', () => {
            const cache = new ImageCache();

            setImageCache(cache);

            expect(getImageCache()).toEqual(cache);
        });

        test('should return undefined', () => {
            const result = getImageCache();
            expect(result).not.toBeDefined();
        });
    })

    describe('createCacheEntriesForImages', () => {
        test('should throw on invalid input', () => {
            setImageCache(new ImageCache());
            expect(() => createCacheEntriesForImages({})).toThrow();
            expect(() => createCacheEntriesForImages(1)).toThrow();
            expect(() => createCacheEntriesForImages(true)).toThrow();
            expect(() => createCacheEntriesForImages('')).toThrow();
        });

        test('should set create the cache entries', () => {
            setImageCache(new ImageCache());

            const images = [{id: 'id', file: new File(['test'], 'test')}];
            createCacheEntriesForImages(images);

            const cache = getImageCache();

            expect(cache.getUrl('id')).toBeDefined();
        });

        test('should throw on undefined imageCache', () => {
            const result = getImageCache();
            expect(result).not.toBeDefined;
            expect(() => createCacheEntriesForImages([])).toThrow();
        });
    });

    describe('revokeAllForDocId', async () => {
        test('should throw on invalid input', async () => {
            setImageCache(new ImageCache());

            await expect(revokeAllForDocId(true)).rejects.toThrow();
            await expect(revokeAllForDocId(1)).rejects.toThrow();
            await expect(revokeAllForDocId({})).rejects.toThrow();
            await expect(revokeAllForDocId([])).rejects.toThrow();
            await expect(revokeAllForDocId('')).rejects.toThrow();
        });
        
        test('should throw on undefined imageCache', async () => {
            await expect(revokeAllForDocId('123')).rejects.toThrow();            
        });

        test('should not throw on error', async () => {
            setImageCache(new ImageCache());

            vi.mocked(getLocalRecordsByIndex).mockRejectedValue(new Error());

            const result = await revokeAllForDocId('id');

            await expect(revokeAllForDocId('id')).resolves.not.toThrow();
            expect(result).toBe(0);
        });

        test('should return 1', async () => {
            setImageCache(new ImageCache());
            
            vi.mocked(getLocalRecordsByIndex).mockResolvedValue([
                {id: 'id1'}, 
                {id: 'id2'}
            ]);

            const result = await revokeAllForDocId('docId');
            
            expect(result).toBe(1);
        });
    });

    describe('createCacheEntriesForDocument', async () => {
        test('should throw error on invalid input', async () => {
            setImageCache(new ImageCache());

            await expect(createCacheEntriesForDocument('')).rejects.toThrow();
            await expect(createCacheEntriesForDocument(1)).rejects.toThrow();
            await expect(createCacheEntriesForDocument(true)).rejects.toThrow();
            await expect(createCacheEntriesForDocument({})).rejects.toThrow();
            await expect(createCacheEntriesForDocument([])).rejects.toThrow();
        });

        test('should throw on undefined imageCache', async () => {
            await expect(createCacheEntriesForDocument('id')).rejects.toThrow();
        });

        test('should not throw and return 0 on getLocalRecordsByIndex error', async () => {
            setImageCache(new ImageCache());

            vi.mocked(getLocalRecordsByIndex).mockRejectedValue(new Error());

            const result = await createCacheEntriesForDocument('id');

            await expect(createCacheEntriesForDocument('id')).resolves.not.toThrow();
            expect(result).toBe(0); 
        });

        test('should return 1', async () => {
            setImageCache(new ImageCache());

            vi.mocked(getLocalRecordsByIndex).mockResolvedValue([]);
            
            const result = await createCacheEntriesForDocument('id');

            expect(result).toBe(1);
        });
    });
});