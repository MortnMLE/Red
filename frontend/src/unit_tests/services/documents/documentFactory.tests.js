import { describe, expect, test, beforeEach } from 'vitest';
import { createDocument, createDocumentFlags } from '@services/document/createDocument';

describe('createDocument', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe ('createDocument', () => {
        test('should create a document with the provided values', () => {
            localStorage.setItem('userId', 'user-123');

            const result = createDocument(
                'doc-123',
                'Document content',
                'Document title',
                1,
                ['flag1']
            );

            expect(result).toEqual({
                id: 'doc-123',
                content: 'Document content',
                title: 'Document title',
                version: 1,
                userId: 'user-123',
                flags: ['flag1']
            });
        });

        test('should retrieve the userId from localStorage', () => {
            localStorage.setItem('userId', 'user-456');

            const result = createDocument(
                'doc-123',
                'content',
                'title',
                2,
                []
            );

            expect(result.userId).toBe('user-456');
        });

        test('should return null as userId when userId is not stored', () => {
            const result = createDocument(
                'doc-123',
                'content',
                'title',
                1,
                []
            );

            expect(result.userId).toBeNull();
        });

        test('should allow empty content', () => {
            const result = createDocument(
                'doc-123',
                '',
                'title',
                1,
                []
            );

            expect(result.content).toBe('');
        });

        test('should allow empty title', () => {
            const result = createDocument(
                'doc-123',
                'content',
                '',
                1,
                []
            );

            expect(result.title).toBe('');
        });

        test('should preserve the provided flags', () => {
            const flags = {
                archived: true,
                readOnly: false
            };

            const result = createDocument(
                'doc-123',
                'content',
                'title',
                1,
                flags
            );

            expect(result.flags).toBe(flags);
        });

        test('should preserve a valid numeric version', () => {
            const result = createDocument(
                'doc-123',
                'content',
                'title',
                42,
                []
            );

            expect(result.version).toBe(42);
        });

        test('should throw when id is empty', () => {
            expect(() =>
                createDocument('', 'content', 'title', 1, [])
            ).toThrow();
        });

        test('should throw when id is not a valid string', () => {
            expect(() =>
                createDocument(null, 'content', 'title', 1, [])
            ).toThrow();
        });

        test('should throw when version is not a valid number', () => {
            expect(() =>
                createDocument('doc-123', 'content', 'title', '1', [])
            ).toThrow();
        });
    });

    describe('createDocumentFlags', () => {
        test('should create flags with the provided values', () => {
            const result = createDocumentFlags(true, true, true);

            expect(result).toEqual({
                dirty: true,
                deleted: true,
                isNew: true
            });
        });

        test('should default dirty to false when dirty is null', () => {
            const result = createDocumentFlags(null, true, true);

            expect(result).toEqual({
                dirty: false,
                deleted: true,
                isNew: true
            });
        });

        test('should default dirty to false when dirty is undefined', () => {
            const result = createDocumentFlags(undefined, true, true);

            expect(result).toEqual({
                dirty: false,
                deleted: true,
                isNew: true
            });
        });

        test('should default deleted to false when deleted is null', () => {
            const result = createDocumentFlags(true, null, true);

            expect(result).toEqual({
                dirty: true,
                deleted: false,
                isNew: true
            });
        });

        test('should default deleted to false when deleted is undefined', () => {
            const result = createDocumentFlags(true, undefined, true);

            expect(result).toEqual({
                dirty: true,
                deleted: false,
                isNew: true
            });
        });

        test('should default isNew to false when isNew is null', () => {
            const result = createDocumentFlags(true, true, null);

            expect(result).toEqual({
                dirty: true,
                deleted: true,
                isNew: false
            });
        });

        test('should default isNew to false when isNew is undefined', () => {
            const result = createDocumentFlags(true, true, undefined);

            expect(result).toEqual({
                dirty: true,
                deleted: true,
                isNew: false
            });
        });

        test('should default all flags to false when all values are null', () => {
            const result = createDocumentFlags(null, null, null);

            expect(result).toEqual({
                dirty: false,
                deleted: false,
                isNew: false
            });
        });

        test('should default all flags to false when all values are undefined', () => {
            const result = createDocumentFlags(undefined, undefined, undefined);

            expect(result).toEqual({
                dirty: false,
                deleted: false,
                isNew: false
            });
        });

        test('should preserve false values instead of applying defaults', () => {
            const result = createDocumentFlags(false, false, false);

            expect(result).toEqual({
                dirty: false,
                deleted: false,
                isNew: false
            });
        });
    });
});