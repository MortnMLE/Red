jest.mock('../../../db/databaseService', () => ({
    update: jest.fn(),
    getOne: jest.fn(),
}));

const { update, getOne } = require('../../../db/databaseService');
const controller = require('../../../controllers/documentController');

describe('documentController.delete', () => {
    let mRes;
    let mReq;

    beforeEach(() => {
        mReq = {
            body: {id: '123'},
            user: 'B25C8076A6A8773CBF8138B6',
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
    });

    test('should return 400 on empty id', async () => {
        mReq.body.id = '';

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 400 on missing id', async () => {
        mReq.body = {};

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 500 if deleteOne throws', async () => {
        const error = new Error('server error');
        getOne.mockRejectedValue(error);

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 200 document was deleted', async () => {
        getOne.mockResolvedValue({flags:{deleted: false}});
        update.mockResolvedValue({modifiedCount: 1});

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            success: true
        });
    });

    test('should return 404 if no document was deleted', async () => {
        getOne.mockResolvedValue({flags:{deleted: false}});
        update.mockResolvedValue({modifiedCount: 0});

        await controller.delete(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(404);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'NOT_FOUND',
            success: false
        });
    });
});