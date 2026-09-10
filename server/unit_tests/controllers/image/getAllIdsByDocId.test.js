jest.mock('../../../db/databaseService', () => ({
    getAll: jest.fn(),
    getOne: jest.fn(),
}));

const { getAll, getOne } = require('../../../db/databaseService');
const controller = require('../../../controllers/imageController');

describe('imageController.getAllIdsByDocId', () => {
    let mReq;
    let mRes;

    beforeEach(() => {
        mReq = {
            user: '507f1f77bcf86cd799439014',
            params: {
                docId: '507f1f77bcf86cd799439011'
            }
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
        getOne.mockResolvedValue({});
    });

    test('should return 400 on empty param', async () => {
        mReq.params.docId = '';

        await controller.getAllIdsByDocId(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 500 if getAll throws', async () => {
        const error = new Error('server error');
        getAll.mockRejectedValue(error);

        await controller.getAllIdsByDocId(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return success true and empty array if no images were found', async () => {
        const arr = [];
        getAll.mockResolvedValue({
            toArray: jest.fn().mockResolvedValue(arr)
        });

        await controller.getAllIdsByDocId(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            images: arr,
            success: true
        });
    });

    test('should return imageIds and success true', async () => {
        const arr = [
            {_id: '507f1f77bcf86cd799439012'},
            {_id: '507f1f77bcf86cd799439013'}
        ];
        getAll.mockResolvedValue({
            toArray: jest.fn().mockResolvedValue(arr)
        });

        await controller.getAllIdsByDocId(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            images: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
            success: true
        });
    });
});