import { describe, expect, beforeEach, afterEach, test, vi } from 'vitest';
import { ref } from 'vue';

vi.mock('@/services/indexedDB/indexedDbApi', () => ({
    addOrSetLocalRecord: vi.fn(),
    getLocalRecord: vi.fn(),
    replaceLocalDbEntry: vi.fn(),
}));

vi.mock('@/services/images/imageServerService', () => ({
    newServerImage: vi.fn(),
}));

vi.mock('@/services/authentication', () => ({
    authenticatedFetch: vi.fn(),
}));

import { useEditor } from '@/composables/useEditor';
import {
    addOrSetLocalRecord,
    getLocalRecord,
    replaceLocalDbEntry,
} from '@/services/indexedDB/indexedDbApi';
import { newServerImage } from '@/services/images/imageServerService';
import { authenticatedFetch } from '@/services/authentication';
import { DB_DOCUMENTS, DB_IMAGES } from '@/constants/stores';
import { PATCHdocument } from '@/constants/endpoints';

describe('uploadTempImageAndReplaceReferences', () => {
    let composable;
    let activeDocument;
    let imageCache;
    let updateCountTempIds;
    const file = new File(['image'], 'image.png', { type: 'image/png' });

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.userId = 'user-1';

        activeDocument = ref({ id: 'doc-1', content: '![image](temp-1)' });
        imageCache = {
            getUrl: vi.fn(),
            replaceId: vi.fn(),
        };
        updateCountTempIds = vi.fn();

        composable = useEditor({
            activeDocument,
            enableVim: ref(false),
            imageCache,
            updateCountTempIds,
        });
        composable.editorView.value = {
            state: { doc: { toString: () => activeDocument.value.content } },
            dispatch: vi.fn(),
            requestMeasure: vi.fn(),
        };
    });

    afterEach(() => {
        localStorage.clear();
    });

    test('should throw when called with invalid arguments', async () => {
        await expect(composable.uploadTempImageAndReplaceReferences(null, 'temp-1', 'image.png', file)).rejects.toThrow();
        await expect(composable.uploadTempImageAndReplaceReferences(activeDocument.value, '', 'image.png', file)).rejects.toThrow();
        await expect(composable.uploadTempImageAndReplaceReferences(activeDocument.value, 'temp-1', null, file)).rejects.toThrow();
        await expect(composable.uploadTempImageAndReplaceReferences(activeDocument.value, 'temp-1', 'image.png', null)).rejects.toThrow();
        expect(newServerImage).not.toHaveBeenCalled();
    });

    test('should stop when the server does not return an image id', async () => {
        newServerImage.mockResolvedValue(undefined);

        await composable.uploadTempImageAndReplaceReferences(activeDocument.value, 'temp-1', 'image.png', file);

        expect(replaceLocalDbEntry).not.toHaveBeenCalled();
    });

    test('should replace the temporary image locally when its document is active', async () => {
        newServerImage.mockResolvedValue('server-1');
        replaceLocalDbEntry.mockResolvedValue(true);

        await composable.uploadTempImageAndReplaceReferences(activeDocument.value, 'temp-1', 'image.png', file);

        expect(replaceLocalDbEntry).toHaveBeenCalledWith(DB_IMAGES, expect.objectContaining({
            id: 'server-1',
            docId: 'doc-1',
            file,
            name: 'image.png',
            userId: 'user-1',
        }), 'temp-1');
        expect(imageCache.replaceId).toHaveBeenCalledWith('temp-1', 'server-1');
        expect(composable.editorView.value.dispatch).toHaveBeenCalled();
        expect(updateCountTempIds).toHaveBeenCalled();
    });

    test('should update the stored document and server when its document is no longer active', async () => {
        const storedDocument = {
            id: 'doc-1',
            content: '![image](temp-1)',
            title: 'Document',
            version: 2,
        };
        activeDocument.value = { id: 'other-doc', content: '' };
        newServerImage.mockResolvedValue('server-1');
        replaceLocalDbEntry.mockResolvedValue(true);
        getLocalRecord.mockResolvedValue(storedDocument);
        authenticatedFetch.mockResolvedValue({ status: 200 });

        await composable.uploadTempImageAndReplaceReferences({ id: 'doc-1' }, 'temp-1', 'image.png', file);

        expect(storedDocument.content).toBe('![image](server-1)');
        expect(storedDocument.version).toBe(3);
        expect(addOrSetLocalRecord).toHaveBeenCalledWith(DB_DOCUMENTS, storedDocument);
        expect(authenticatedFetch).toHaveBeenCalledWith(PATCHdocument, expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('server-1'),
        }));
    });
});