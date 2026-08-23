jest.mock('../../../db/databaseService', () => ({
    getOne: jest.fn(),
    update: jest.fn(),
}));

const { getOne, update } = require('../../../db/databaseService');
const controller = require('../../../controllers/documentController');

describe('documentController.create', () => {
    let mRes;
    let mReq;
    let doc; 

    beforeEach(() => {
        mReq = {
            body: {
                id: '123',
                title: 'title',
                content: 'content',
                version: 5
            },
            user: 'B25C8076A6A8773CBF8138B6',
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        doc = {
            title: 'old',
            content: 'old',
            version: 4
        };

        jest.clearAllMocks();
    });

    test('should return 400 on empty parameter', async () => {
        mReq.body.id = '';

        await controller.patch(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 400 on missing parameter', async () => {
        mReq.body = {};

        await controller.patch(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 500 if getOne throws', async () => {
        const error = new Error('server error');
        getOne.mockRejectedValue(error);

        await controller.patch(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 500 if update throws', async () => {
        getOne.mockResolvedValue(doc);
        
        const error = new Error('server error');
        update.mockRejectedValue(error);

        await controller.patch(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 500 if update has not updated any documents', async () => {
        getOne.mockResolvedValue(doc);
        update.mockResolvedValue({modifiedCount: 0});

        await controller.patch(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'NOT_CHANGED',
            success: false
        });
    });

    test('should return 409 on version conflict', async () => {
        doc.version = 10;
        getOne.mockResolvedValue(doc); 

        await controller.patch(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(409);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'VERSION_CONFLICT',
            success: false
        });
    });

    test('should return 200', async () => {
        getOne.mockResolvedValue(doc); 
        update.mockResolvedValue({modifiedCount: 1});

        await controller.patch(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            id: doc.id,
            newSyncedVersion: doc.version,
            success: true
        });        
    });
});