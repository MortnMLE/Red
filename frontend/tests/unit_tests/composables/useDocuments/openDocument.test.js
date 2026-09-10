import { describe, test, expect, beforeEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';

describe('openDocument', () => {
    let composable;

    beforeEach(() => {
        composable = useDocuments();
        composable.openDocumentIds.value = [];
    });

    test('should add a document ID to the open documents', () => {
        composable.openDocument('doc-1');

        expect(composable.openDocumentIds.value).toEqual(['doc-1']);
    });

    test('should not add a document ID more than once', () => {
        composable.openDocumentIds.value = ['doc-1'];

        composable.openDocument('doc-1');

        expect(composable.openDocumentIds.value).toEqual(['doc-1']);
    });

    test('should preserve other open document IDs', () => {
        composable.openDocumentIds.value = ['doc-1'];

        composable.openDocument('doc-2');

        expect(composable.openDocumentIds.value).toEqual(['doc-1', 'doc-2']);
    });

    test('should throw when the document ID is empty', () => {
        expect(() => composable.openDocument('')).toThrow('Input must not be empty');
    });

    test('should throw when the document ID is not a string', () => {
        expect(() => composable.openDocument(null)).toThrow('Input must not be null');
    });
});
