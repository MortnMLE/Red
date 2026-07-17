import { describe, it, expect } from 'vitest';
import { setImageCache } from '@/services/images/imageCache';
import { ImageCache } from './ImageCache';

describe('imageCacheService', () => {
    it('should throw when obj is null', () => {
        expect(() => {
            setImageCache(null);
        }).toThrow();
    });

    it('should throw when obj is not an ImageCache', () => {
        const invalidObj = {};

        expect(() => {
            setImageCache(invalidObj);
        }).toThrow();
    });

    it('should accept a valid ImageCache instance', () => {
        const cache = new ImageCache();

        expect(() => {
            setImageCache(cache);
        }).not.toThrow();
    });
});