jest.mock('../../../../src/db/databaseService', () => ({
    getOne: jest.fn(),
}));

const { getOne } = require('../../../../src/db/databaseService');
const controller = require('../../../../src/controllers/imageController');

describe('imageController.getById', () => {
    let mReq;
    let mRes;

    beforeEach(() => {
        mReq = {
            user: '507f1f77bcf86cd799439014',
            params: {
                id: '507f1f77bcf86cd799439013'
            }
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
            setHeader: jest.fn(),
        };

        jest.clearAllMocks();
    });

    test('should return 400 on invalid param', async () => {
        mReq.params.id = '';

        await controller.getById(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 500 if getOne throws', async () => {
        const error = new Error('server error');

        getOne.mockRejectedValue(error);

        await controller.getById(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 404 if getOne returns null', async () => {
        getOne.mockResolvedValue(null);

        await controller.getById(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(404);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'NOT_FOUND',
            success: false
        });
    });

    test('should return 200 with image data and header', async () => {
        const image = {
            mimeType: 'image/jpeg',
            name: 'test.jpg',
            data: {
                buffer: Buffer.from('data')
            }
        };

        getOne
            .mockResolvedValueOnce(image)
            .mockResolvedValueOnce({});

        await controller.getById(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.setHeader).toHaveBeenCalledWith('Content-Type', image.mimeType);
        expect(mRes.setHeader).toHaveBeenCalledWith(
            'Content-Disposition',
            `inline; filename="${image.name}"`
        );
        expect(mRes.setHeader).toHaveBeenCalledWith(
            'Access-Control-Expose-Headers',
            'Content-Disposition'
        );
        expect(mRes.send).toHaveBeenCalledWith(image.data.buffer);
    });
});