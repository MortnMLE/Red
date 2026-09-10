import { describe, expect, test, vi } from 'vitest';

import { useImages } from '@/composables/useImages';

describe('setUpdateEditorContent', () => {
    test('should accept the editor content update callback', () => {
        const composable = useImages();
        const updateEditorContent = vi.fn();

        const result = composable.setUpdateEditorContent(updateEditorContent);

        expect(result).toBeUndefined();
    });
});