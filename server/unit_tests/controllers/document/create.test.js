jest.mock('../../../db/databaseService', () => ({
    insertOne: jest.fn(),
}));

const { insertOne } = require('../../../db/databaseService');
const controller = require('../../../controllers/documentController');

describe('documentController.create', () => {
    let mRes;
    let mReq;

    beforeEach(() => {
        mReq = {
            body: {
                title: 'title',
                content: 'content',
                version: 1
            },
            user: 'B25C8076A6A8773CBF8138B6',
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
    });

    test('should return 400 on empty parameter', async () => {
        mReq.body.title = '';

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 400 on missing parameter', async () => {
        mReq.body = {};

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 500 if insertOne throws', async () => {
        const error = new Error('server error');
        insertOne.mockRejectedValue(error);

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 500 if acknowledged is false', async () => {
        insertOne.mockResolvedValue({acknowledged: false});

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            success: false
        });
    });

    test('should return 201 document was created', async () => {
        insertOne.mockResolvedValue({acknowledged: true, insertedId: '123'});

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(201);
        expect(mRes.json).toHaveBeenCalledWith({
            id: '123',
            success: true
        });
    });
});