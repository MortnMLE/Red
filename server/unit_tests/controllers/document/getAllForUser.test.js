jest.mock('../../../db/databaseService', () => ({
    getAll: jest.fn(),
}));

const controller = require('../../../controllers/documentController');
const { getAll } = require('../../../db/databaseService');

describe('documentController.getAllForUser', () => {
    let mRes;
    let mReq;

    beforeEach(() => {
        mReq = {
            body: {},
            user: 'B25C8076A6A8773CBF8138B6',
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
    });

    test('should return 400', async () => {
        mReq.user = '';

        await controller.getAllForUser(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 500 if getAll throws', async () => {
        const error = new Error('server error');
        getAll.mockRejectedValue(error);

        await controller.getAllForUser(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 200 and empty array if no documents were found', async () => {
        const arr = [];
        getAll.mockReturnValue({
            toArray: jest.fn().mockResolvedValue(arr)
        });

        await controller.getAllForUser(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            documents: arr,
            success: true
        });
    });

    test('should return 200 and documents', async () => {
        const arr = [{}, {}]
        getAll.mockResolvedValue({
            toArray: jest.fn().mockResolvedValue(arr)
        });

        await controller.getAllForUser(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            documents: arr,
            success: true
        });
    });
});