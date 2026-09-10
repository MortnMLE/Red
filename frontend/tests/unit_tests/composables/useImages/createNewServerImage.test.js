import { describe, expect, test, vi } from 'vitest';

vi.mock('@/services/images/imageServerService', () => ({
    newServerImage: vi.fn(),
}));

import { useImages } from '@/composables/useImages';
import { newServerImage } from '@/services/images/imageServerService';

describe('createNewServerImage', () => {
    test('should delegate the image data to the server service', async () => {
        const file = new File(['image'], 'image.png', { type: 'image/png' });
        newServerImage.mockResolvedValue('server-1');
        const composable = useImages();

        const result = await composable.createNewServerImage('doc-1', 'image.png', file);

        expect(result).toBeUndefined();
        expect(newServerImage).toHaveBeenCalledWith('doc-1', 'image.png', file);
    });
});