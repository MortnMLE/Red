import { describe, expect, beforeEach, test, vi } from 'vitest';
import { ref } from 'vue';

import { useEditor } from '@/composables/useEditor';

describe('replaceImageReferenceInLiveEditor', () => {
    let composable;
    let dispatch;

    beforeEach(() => {
        vi.clearAllMocks();
        composable = useEditor({
            activeDocument: ref({ id: 'doc-1', content: '' }),
            enableVim: ref(false),
            imageCache: { getUrl: vi.fn(), replaceId: vi.fn() },
        });
        dispatch = vi.fn();
        composable.editorView.value = {
            state: {
                doc: {
                    toString: () => 'Before ![image](old-id) after',
                },
            },
            dispatch,
        };
    });

    test('should replace the matching image reference in the live editor', () => {
        composable.replaceImageReferenceInLiveEditor('old-id', 'new-id');

        expect(dispatch).toHaveBeenCalledWith({
            changes: {
                from: 7,
                to: 23,
                insert: '![image](new-id)',
            },
        });
    });

    test('should leave the editor unchanged when the old reference is absent', () => {
        composable.editorView.value.state.doc.toString = () => 'No image here';

        composable.replaceImageReferenceInLiveEditor('old-id', 'new-id');

        expect(dispatch).not.toHaveBeenCalled();
    });

    test('should throw when called with invalid ids', () => {
        expect(() => composable.replaceImageReferenceInLiveEditor('', 'new-id')).toThrow();
        expect(() => composable.replaceImageReferenceInLiveEditor('old-id', null)).toThrow();
    });

    test('should throw when there is no live editor', () => {
        composable.editorView.value = null;

        expect(() => composable.replaceImageReferenceInLiveEditor('old-id', 'new-id')).toThrow();
    });
});