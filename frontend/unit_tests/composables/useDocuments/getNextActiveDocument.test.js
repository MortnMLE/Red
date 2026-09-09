import { describe, test, expect, beforeEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';

describe('getNextActiveDocument', () => {
    let composable;
    const documents = [
        { id: 'doc-1', title: 'Document 1' },
        { id: 'doc-2', title: 'Document 2' },
        { id: 'doc-3', title: 'Document 3' },
    ];

    beforeEach(() => {
        composable = useDocuments();
        composable.documents.value = documents;
        composable.openDocumentIds.value = ['doc-1', 'doc-2', 'doc-3'];
        composable.setActiveDocument('doc-2');
    });

    test('should return the previous document for a negative offset', () => {
        expect(composable.getNextActiveDocument({ id: 'doc-2' }, -1))
            .toEqual(documents[0]);
    });

    test('should return the next document for a positive offset', () => {
        expect(composable.getNextActiveDocument({ id: 'doc-2' }, 1))
            .toEqual(documents[2]);
    });

    test('should return the active document for a zero offset', () => {
        expect(composable.getNextActiveDocument({ id: 'doc-2' }, 0))
            .toEqual(documents[1]);
    });

    test('should return the active document when another document is closed', () => {
        expect(composable.getNextActiveDocument({ id: 'doc-1' }, 1))
            .toEqual(documents[1]);
    });

    test('should return undefined when there is no next document', () => {
        composable.openDocumentIds.value = ['doc-1'];
        composable.setActiveDocument('doc-1');

        expect(composable.getNextActiveDocument({ id: 'doc-1' }, -1))
            .toBeUndefined();
    });

    test('should throw when the document is null', () => {
        expect(() => composable.getNextActiveDocument(null, 1))
            .toThrow('object must not be null or undefined');
    });
});