import { describe, expect, test } from 'vitest';
import {
    renderDocumentLinks,
    replaceDocumentTitleLinks,
    updateDocumentTitleLinks,
} from '@/services/documents/documentLinks';

describe('document links', () => {
    test('renders resolved wiki links as document anchors', () => {
        const documents = [{ id: 'doc-1', title: 'Project Notes' }];

        expect(renderDocumentLinks('Read [[Project Notes]]', documents))
            .toBe('Read [Project Notes](#document=doc-1)');
    });

    test('leaves unresolved wiki links unchanged', () => {
        expect(renderDocumentLinks('Read [[Missing]]', [])).toBe('Read [[Missing]]');
    });

    test('replaces only exact links when a document is renamed', () => {
        expect(replaceDocumentTitleLinks(
            '[[Notes]] and [[Notes Archive]]',
            'Notes',
            'Ideas',
        )).toBe('[[Ideas]] and [[Notes Archive]]');
    });

    test('updates references in other documents but not the renamed document', () => {
        const renamedDocument = { id: 'doc-1', title: 'Ideas' };
        const documents = [
            renamedDocument,
            { id: 'doc-2', title: 'Index', content: 'See [[Notes]]' },
        ];

        expect(updateDocumentTitleLinks(documents, renamedDocument, 'Notes', 'Ideas'))
            .toEqual([{ id: 'doc-2', title: 'Index', content: 'See [[Ideas]]' }]);
    });
});