import { beforeEach, describe, expect } from 'vitest';
import { Parser } from '@/services/parser';

describe('parser', () => {

    let parser;
    
    beforeEach(() => {
        parser = new Parser();
    });

    describe('parseImageIds', () => {
        test.each([
            null,
            undefined,
            123,
            {},
            [],
            true
        ])('throws on invalid input: %s', (value) => {
            expect(() => parser.parseImageIds(value)).toThrow()
        });

        test('should return image ids', () => {
            const result = parser.parseImageIds(
                '![image](id1)...![image](id2)'
            );

            expect(result).toEqual(['id1', 'id2']);
        });

        test('should return empty array on empty string', () => {
            const result = parser.parseImageIds('');

            expect(result).toEqual([]);
        });
    });

    describe('parseDocumentIds', () => {
        test.each([
            null,
            undefined,
            123,
            {},
            [],
            true
        ])('throws on invalid input: %s', (value) => {
            expect(() => parser.parseDocumentIds(value)).toThrow()
        });

        test('should return document ids', () => {
            const result = parser.parseDocumentIds(
                '![document](id1)....![document](id2)'
            );

            expect(result).toEqual(['id1', 'id2']);
        });

        test('should return empty array on empty string', () => {
            const result = parser.parseDocumentIds('');

            expect(result).toEqual([]);
        });
    });

    describe('parseId', () => {
        test.each([
            null,
            undefined,
            123,
            {},
            [],
            true
        ])('throws on invalid input: %s', (value) => {
            expect(() => parser.parseId(value, /!\[image\]\((.*?)\)/g)).toThrow()
        });

        test('should return array of strings on valid inputs', () => {
            const str = '![image](testid)';
            
            const result = parser.parseId(str, parser.regexImage);

            expect(result).toEqual(['testid']);
        });

        test('should return empty array on no matches', () => {
            const str = 'random 123';

            const result = parser.parseId(str, parser.regexImage);

            expect(result).toEqual([]);
        });
    });
});