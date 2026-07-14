import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ImageCache } from '@/services/images/imageCache';
import { Validator } from '@/services/validator';

vi.mock('@/services/validator', () => ({
    Validator: {
        validateStringEmptyNotAllowed: vi.fn(),
        validateArrEmptyNotAllowed: vi.fn(),
        validateArrEmptyAllowed: vi.fn(),
        validateObjectNotNull: vi.fn(),
    },
}));

describe('ImageCache', () => {
    let cache;

    beforeEach(() => {
        cache = new ImageCache();

        global.URL.createObjectURL = vi.fn();
        global.URL.revokeObjectURL = vi.fn();

        vi.clearAllMocks();
    });

    describe('constructor', () => {
        test('creates empty map', () => {
            expect(cache.urlMap.size).toBe(0);
        });
    });

    describe('setUrl', () => {
        test('validates parameters', () => {
            vi.mocked(URL.createObjectURL).mockReturnValue('url1');

            const blob = {};

            cache.setUrl('id1', blob);

            expect(Validator.validateStringEmptyNotAllowed)
                .toHaveBeenCalledWith('id1');

            expect(Validator.validateObjectNotNull)
                .toHaveBeenCalledWith(blob);
        });

        test('creates object url', () => {
            vi.mocked(URL.createObjectURL).mockReturnValue('url1');

            cache.setUrl('id1', {});

            expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
            expect(cache.get('id1')).toBe('url1');
        });

        test('replaces existing url and revokes old one', () => {
            vi.mocked(URL.createObjectURL)
                .mockReturnValueOnce('url1')
                .mockReturnValueOnce('url2');

            cache.setUrl('id1', {});
            cache.setUrl('id1', {});

            expect(cache.get('id1')).toBe('url2');
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('url1');
        });
    });

    describe('setUrls', () => {
        test('validates array', () => {
            vi.mocked(URL.createObjectURL)
                .mockReturnValueOnce('url1');

            cache.setUrls([
                { id: 'id1', blob: {} }
            ]);

            expect(Validator.validateArrEmptyNotAllowed)
                .toHaveBeenCalledWith([
                    { id: 'id1', blob: {} }
                ]);
        });

        test('adds multiple urls', () => {
            vi.mocked(URL.createObjectURL)
                .mockReturnValueOnce('url1')
                .mockReturnValueOnce('url2');

            cache.setUrls([
                { id: 'id1', blob: {} },
                { id: 'id2', blob: {} }
            ]);

            expect(cache.get('id1')).toBe('url1');
            expect(cache.get('id2')).toBe('url2');
        });

        test('ignores duplicate ids', () => {
            vi.mocked(URL.createObjectURL)
                .mockReturnValueOnce('url1')
                .mockReturnValueOnce('url2');

            cache.setUrls([
                { id: 'id1', blob: {} }
            ]);

            cache.setUrls([
                { id: 'id1', blob: {} }
            ]);

            expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
            expect(cache.get('id1')).toBe('url1');
        });
    });

    describe('get', () => {
        test('validates parameter', () => {
            cache.get('id1');

            expect(Validator.validateStringEmptyNotAllowed)
                .toHaveBeenCalledWith('id1');
        });

        test('returns undefined for missing id', () => {
            expect(cache.get('missing')).toBeUndefined();
        });

        test('returns existing url', () => {
            vi.mocked(URL.createObjectURL).mockReturnValue('url1');

            cache.setUrl('id1', {});

            expect(cache.get('id1')).toBe('url1');
        });
    });

    describe('has', () => {
        test('validates parameter', () => {
            cache.has('id1');

            expect(Validator.validateStringEmptyNotAllowed)
                .toHaveBeenCalledWith('id1');
        });

        test('returns false for missing id', () => {
            expect(cache.has('missing')).toBe(false);
        });

        test('returns true for existing id', () => {
            vi.mocked(URL.createObjectURL).mockReturnValue('url1');

            cache.setUrl('id1', {});

            expect(cache.has('id1')).toBe(true);
        });
    });

    describe('replace', () => {
        test('validates parameters', () => {
            cache.replace('old', 'new');

            expect(Validator.validateStringEmptyNotAllowed)
                .toHaveBeenCalledWith('old');

            expect(Validator.validateStringEmptyNotAllowed)
                .toHaveBeenCalledWith('new');
        });

        test('does nothing if old id does not exist', () => {
            cache.replace('old', 'new');

            expect(cache.has('new')).toBe(false);
        });

        test('moves url to new id', () => {
            vi.mocked(URL.createObjectURL).mockReturnValue('url1');

            cache.setUrl('old', {});

            cache.replace('old', 'new');

            expect(cache.has('old')).toBe(false);
            expect(cache.get('new')).toBe('url1');
        });

        test('replaces existing new id', () => {
            vi.mocked(URL.createObjectURL)
                .mockReturnValueOnce('url1')
                .mockReturnValueOnce('url2');

            cache.setUrl('old', {});
            cache.setUrl('new', {});

            cache.replace('old', 'new');

            expect(cache.get('new')).toBe('url1');
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('url2');
        });
    });

    describe('revokeUrl', () => {
        test('validates parameter', () => {
            cache.revokeUrl('id1');

            expect(Validator.validateStringEmptyNotAllowed)
                .toHaveBeenCalledWith('id1');
        });

        test('does nothing for missing id', () => {
            cache.revokeUrl('missing');

            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        });

        test('revokes url and removes entry', () => {
            vi.mocked(URL.createObjectURL).mockReturnValue('url1');

            cache.setUrl('id1', {});

            cache.revokeUrl('id1');

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('url1');
            expect(cache.has('id1')).toBe(false);
        });
    });

    describe('revokeUrls', () => {
        test('validates array', () => {
            cache.revokeUrls(['id1']);

            expect(Validator.validateArrEmptyAllowed)
                .toHaveBeenCalledWith(['id1']);
        });

        test('revokes multiple urls', () => {
            vi.mocked(URL.createObjectURL)
                .mockReturnValueOnce('url1')
                .mockReturnValueOnce('url2');

            cache.setUrl('id1', {});
            cache.setUrl('id2', {});

            cache.revokeUrls(['id1', 'id2']);

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('url1');
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('url2');

            expect(cache.has('id1')).toBe(false);
            expect(cache.has('id2')).toBe(false);
        });

        test('allows empty array', () => {
            cache.revokeUrls([]);

            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        });
    });
});