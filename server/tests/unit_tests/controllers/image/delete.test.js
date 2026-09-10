jest.mock('../../../../src/db/databaseService', () => ({
    deleteOne: jest.fn(),
    getOne: jest.fn(),
}));

const { deleteOne, getOne } = require('../../../../src/db/databaseService');
const controller = require('../../../../src/controllers/imageController');
const { imageDbName } = require('../../../../src/constants');
const { ObjectId } = require('mongodb');

describe('imageController.delete', () => {
    let mReq;
    let mRes;
    
    beforeEach(() => {
        mReq = {
            user: '507f1f77bcf86cd799439014',
            body: {
                id: '507f1f77bcf86cd799439013'
            }
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
        getOne.mockResolvedValue({
            docId: '507f1f77bcf86cd799439011'
        });
    });

    test('should return 400 on missing param', async () => {
        mReq.body.id = '';

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 500 if deleteOne throws', async () => {
        const error = new Error('server error');
        deleteOne.mockRejectedValue(error);

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 200 and success true', async () => {
        deleteOne.mockResolvedValue({deletedCount: 1});

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            success: true
        });
        expect(deleteOne).toHaveBeenCalledWith(imageDbName, {
            _id: new ObjectId(mReq.body.id)
        });
    });

    test('should return 404 if nothing was deleted', async () => {
        deleteOne.mockResolvedValue({deletedCount: 0});

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(404);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'NOT_FOUND',
            success: false
        });
    });
});