const { validate } = require('../../../src/utils/validate');

describe('validate', () => {
    test('should return true when all elements are truthy', () => {
        expect(validate(['hello', 123, true])).toBe(true);
    });

    test('should return false when an element is falsy', () => {
        expect(validate(['hello', '', true])).toBe(false);
    });

    test('should return false when an element is null', () => {
        expect(validate(['hello', null, true])).toBe(false);
    });

    test('should return false when an element is undefined', () => {
        expect(validate(['hello', undefined, true])).toBe(false);
    });

    test('should return false when an element is false', () => {
        expect(validate(['hello', false, true])).toBe(false);
    });

    test('should return false when an element is zero', () => {
        expect(validate(['hello', 0, true])).toBe(false);
    });

    test('should return false when an element is NaN', () => {
        expect(validate(['hello', NaN, true])).toBe(false);
    });

    test('should return true for an empty array', () => {
        expect(validate([])).toBe(true);
    });

    test('should return true when all elements are non-empty strings', () => {
        expect(validate(['hello', 'world', 'test'])).toBe(true);
    });

    test('should return false when the first element is falsy', () => {
        expect(validate([null, 'hello', true])).toBe(false);
    });

    test('should return false when the last element is falsy', () => {
        expect(validate(['hello', true, 0])).toBe(false);
    });
});