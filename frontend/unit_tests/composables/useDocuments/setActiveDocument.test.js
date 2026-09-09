import { describe, test, expect, beforeEach } from 'vitest';

import { DEFAULT_DOCUMENT } from '@/constants/defaultDocument';
import { useDocuments } from '@/composables/useDocuments';

describe('setActiveDocument', () => {
    let composable;

    beforeEach(() => {
        composable = useDocuments();
        composable.documents.value = [
            { id: 'doc-1', title: 'Document 1' },
            { id: 'doc-2', title: 'Document 2' },
        ];
    });

    test('should set the matching document as the active document', () => {
        composable.setActiveDocument('doc-2');

        expect(composable.activeDocument.value).toEqual({
            id: 'doc-2',
            title: 'Document 2',
        });
    });

    test('should expose the default document when the ID does not match a document', () => {
        composable.setActiveDocument('doc-3');

        expect(composable.activeDocument.value).toBe(DEFAULT_DOCUMENT);
    });

    test('should throw when the document ID is empty', () => {
        expect(() => composable.setActiveDocument('')).toThrow('Input must not be empty');
    });

    test('should throw when the document ID is not a string', () => {
        expect(() => composable.setActiveDocument(null)).toThrow('Input must not be null');
    });
});
