import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ImageCache } from '@/services/images/imageCache';

describe('ImageCache', () => {
    let cache;
    const dummyFile1 = new File(['Hello'], 'hello.txt');
    const dummyFile2 = new File(['Goodbye'], 'bye.txt');
    let counter = 0;

    beforeEach(() => {
        cache = new ImageCache();
        counter = 0;

        global.URL.createObjectURL = vi.fn((id) => 'blob:mock-url' + counter++);
        global.URL.revokeObjectURL = vi.fn();

        vi.clearAllMocks();
    });

    describe('constructor', () => {
        test('creates empty map', () => {
            expect(cache.urlMap.size).toBe(0);
        });
    });

    describe('setUrl', () => {
        test('should produce one valid element', () => {
            const dummyId = 'dummyId';

            cache.setUrl(dummyId, dummyFile1);

            const arr = Array.from(cache.urlMap);
            const hasDummyId = cache.hasUrl(dummyId);
            const url = cache.getUrl(dummyId);

            expect(arr.length).toBe(1);
            expect(hasDummyId).toBe(true);
            expect(url).toBeDefined();
        });

        test('should store multiple ids independently', () => {
            cache.setUrl('id1', dummyFile1);
            cache.setUrl('id2', dummyFile2);

            expect(cache.getUrl('id1')).toBeDefined();
            expect(cache.getUrl('id2')).toBeDefined();
            expect(cache.getUrl('id1')).not.toBe(cache.getUrl('id2'));
            expect(cache.urlMap.size).toBe(2);
        });

        test('should throw on invalid id', () => {
            expect(() => cache.setUrl('', dummyFile1)).toThrow();
            expect(() => cache.setUrl(null, dummyFile1)).toThrow();
            expect(() => cache.setUrl(undefined, dummyFile1)).toThrow();
            expect(() => cache.setUrl({}, dummyFile1)).toThrow();
            expect(() => cache.setUrl(5, dummyFile1)).toThrow();
            expect(cache.urlMap.size).toBe(0);
        });

        test('should throw on invalid file', () => {
            expect(() => cache.setUrl('validId', null)).toThrow();
            expect(() => cache.setUrl('validId', undefined)).toThrow();
            expect(cache.urlMap.size).toBe(0);
        });

        test('should replace existing id if already exists', () => {
            const spy = vi.spyOn(cache, 'revokeUrl');

            const file = {};
            const id = 'id1';

            cache.setUrl(id, file);
            const url1 = cache.getUrl(id);

            cache.setUrl(id, file);
            const url2 = cache.getUrl(id);
            
            expect(url1).not.toBe(url2);
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('setUrls', () => {
        test('should throw on invalid input', () => {
            expect(() => cache.setUrls(null)).toThrow();
            expect(() => cache.setUrls(undefined)).toThrow();
            expect(() => cache.setUrls([])).toThrow();
            expect(() => cache.setUrls([{}])).toThrow();
            expect(cache.urlMap.size).toBe(0);
        });

        test('should call setUrl', () => {
            const spy = vi.spyOn(cache, 'setUrl');
            cache.setUrls([
                {
                    id: 'id1',
                    file: {}
                }
            ]);

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('getUrl', () => {
        test('should throw on invalid input', () => {
            const spy = vi.spyOn(cache.urlMap, 'get');

            expect(() => cache.getUrl('')).toThrow();
            expect(() => cache.getUrl(null)).toThrow();
            expect(() => cache.getUrl(undefined)).toThrow();
            expect(() => cache.getUrl({})).toThrow();
            expect(() => cache.getUrl(5)).toThrow();

            expect(spy).not.toHaveBeenCalled();
        });

        test('should return url', () => {
            cache.setUrl('id1', new Blob());
            
            const url = cache.getUrl('id1');
            expect(url).toBeDefined();
        });

        test('should return undefined', () => {
            cache.setUrl('id', {});

            const url = cache.getUrl('anotherId');

            expect(url).toBeUndefined();
        });
    });

    describe('hasUrl', () => {
        test('should throw on invalid input', () => {
            expect(() => cache.hasUrl('')).toThrow();
            expect(() => cache.hasUrl(null)).toThrow();
            expect(() => cache.hasUrl(undefined)).toThrow();
            expect(() => cache.hasUrl({})).toThrow();
            expect(() => cache.hasUrl(5)).toThrow();
        });

        test('should return correct results', () => {
            cache.setUrl('id', {});
            
            const has1 = cache.hasUrl('id');
            const has2 = cache.hasUrl('false');

            expect(has1).toBe(true);
            expect(has2).toBe(false);
        });
    });

    describe('replaceId', () => {
        test('should throw on invalid input', () => {
            const oldId = 'old';
            const newId = 'new';

            cache.setUrl(oldId, {});

            expect(() => cache.replaceId('', newId)).toThrow();
            expect(() => cache.replaceId(null, newId)).toThrow();
            expect(() => cache.replaceId(undefined, newId)).toThrow();
            expect(() => cache.replaceId({}, newId)).toThrow();
            expect(() => cache.replaceId(5, newId)).toThrow();

            expect(() => cache.replaceId(oldId, '')).toThrow();
            expect(() => cache.replaceId(oldId, null)).toThrow();
            expect(() => cache.replaceId(oldId, undefined)).toThrow();
            expect(() => cache.replaceId(oldId, {})).toThrow();
            expect(() => cache.replaceId(oldId, 5)).toThrow();           
        });

        test('should do nothing on oldId = newId', () => {
            const deleteSpy = vi.spyOn(cache.urlMap, 'delete');

            cache.setUrl('old', dummyFile1);
            cache.replaceId('old', 'old');

            expect(deleteSpy).not.toHaveBeenCalled();
        });

        test('should replace oldId with newId', () => {
            const deleteSpy = vi.spyOn(cache.urlMap, 'delete');
            const setSpy = vi.spyOn(cache.urlMap, 'set');

            cache.setUrl('old', dummyFile1);
            cache.replaceId('old', 'new');

            expect(cache.getUrl('old')).not.toBeDefined();
            expect(cache.getUrl('new')).toBeDefined();

            expect(deleteSpy).toHaveBeenCalled();
            expect(setSpy).toHaveBeenCalled();
        });

        test('should revoke newId if it already exists', () => {
            const revokeSpy = vi.spyOn(cache, 'revokeUrl');

            cache.setUrl('id', dummyFile1);
            cache.setUrl('newId', dummyFile2);
            cache.replaceId('id', 'newId');

            const oldUrl = cache.getUrl('id');

            expect(revokeSpy).toHaveBeenCalled();
            expect(oldUrl).toBeUndefined();
        })
    });

    describe('revokeUrl', () => {
        test('should throw on invalid input', () => {
            expect(() => cache.getUrl('')).toThrow();
            expect(() => cache.getUrl(null)).toThrow();
            expect(() => cache.getUrl(undefined)).toThrow();
            expect(() => cache.getUrl({})).toThrow();
            expect(() => cache.getUrl(5)).toThrow();
        });

        test('should do nothing if passed id does not exist', () => {
            cache.setUrl('id', {});
            cache.revokeUrl('nonExistentId');

            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
            expect(cache.urlMap.size).toBe(1);
        });

        test('should remove cache entry', () => {
            cache.setUrl('id1', {});
            cache.setUrl('id2', {});
            cache.revokeUrl('id1');

            expect(URL.revokeObjectURL).toHaveBeenCalled();
            expect(cache.urlMap.size).toBe(1);
        });
    });

    describe('revokeUrls', () => {
        test('should throw on invalid input', () => {
            expect(() => cache.revokeUrls(null)).toThrow();
            expect(() => cache.revokeUrls(undefined)).toThrow();
            expect(() => cache.revokeUrls([{}])).toThrow();
            expect(cache.urlMap.size).toBe(0);
        });

        test('should call revokeUrl', () => {
            const spy = vi.spyOn(cache, 'revokeUrl');

            cache.setUrl('id', {});

            cache.revokeUrls(['id']);

            expect(spy).toHaveBeenCalled();
        });
    });
});