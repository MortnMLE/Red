import { describe, test, expect, beforeEach } from 'vitest';

import { useDocuments } from '@/composables/useDocuments';

describe('shiftActiveDocument', () => {
    let composable;

    beforeEach(() => {
        composable = useDocuments();
        composable.openDocumentIds.value = ['doc-1', 'doc-2', 'doc-3'];
        composable.documents.value = [
            { id: 'doc-1', title: 'Document 1' },
            { id: 'doc-2', title: 'Document 2' },
            { id: 'doc-3', title: 'Document 3' },
        ];
    });

    test('should shift the active document to the previous document', () => {
        composable.setActiveDocument('doc-2');

        composable.shiftActiveDocument({ id: 'doc-2' }, -1);

        expect(composable.activeDocument.value.id).toBe('doc-1');
    });

    test('should shift the active document to the next document', () => {
        composable.setActiveDocument('doc-2');

        composable.shiftActiveDocument({ id: 'doc-2' }, 1);

        expect(composable.activeDocument.value.id).toBe('doc-3');
    });

    test('should select the next document when the first document is closed', () => {
        composable.setActiveDocument('doc-1');

        composable.shiftActiveDocument({ id: 'doc-1' }, -1);

        expect(composable.activeDocument.value.id).toBe('doc-2');
    });

    test('should clear the active document when the only open document is closed', () => {
        composable.openDocumentIds.value = ['doc-1'];
        composable.setActiveDocument('doc-1');

        composable.shiftActiveDocument({ id: 'doc-1' }, 1);

        expect(composable.activeDocument.value.id).toBe('welcome');
    });

    test('should not change the active document when another document is closed', () => {
        composable.setActiveDocument('doc-2');

        composable.shiftActiveDocument({ id: 'doc-1' }, 1);

        expect(composable.activeDocument.value.id).toBe('doc-2');
    });

    test('should throw when the offset is zero', () => {
        expect(() => composable.shiftActiveDocument({ id: 'doc-1' }, 0))
            .toThrow('must not be 0');
    });
});