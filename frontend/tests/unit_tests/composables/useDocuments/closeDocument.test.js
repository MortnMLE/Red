import { describe, test, expect, beforeEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';

describe('closeDocument', () => {
    let composable;

    beforeEach(() => {
        composable = useDocuments();
        composable.openDocumentIds.value = ['doc-1', 'doc-2'];
    });

    test('should remove the requested document ID from the open documents', () => {
        composable.closeDocument('doc-1');

        expect(composable.openDocumentIds.value).toEqual(['doc-2']);
    });

    test('should preserve the order of the remaining open document IDs', () => {
        composable.closeDocument('doc-2');

        expect(composable.openDocumentIds.value).toEqual(['doc-1']);
    });

    test('should leave the open documents unchanged when the ID is not open', () => {
        composable.closeDocument('doc-3');

        expect(composable.openDocumentIds.value).toEqual(['doc-1', 'doc-2']);
    });

    test('should remove every matching document ID', () => {
        composable.openDocumentIds.value = ['doc-1', 'doc-2', 'doc-1'];

        composable.closeDocument('doc-1');

        expect(composable.openDocumentIds.value).toEqual(['doc-2']);
    });

    test('should throw when the document ID is empty', () => {
        expect(() => composable.closeDocument('')).toThrow('Input must not be empty');
    });

    test('should throw when the document ID is not a string', () => {
        expect(() => composable.closeDocument(null)).toThrow('Input must not be null');
    });
});
