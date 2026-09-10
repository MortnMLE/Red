jest.mock('../../../db/databaseService', () => ({
    getOne: jest.fn()
}));

const controller = require('../../../controllers/documentController');
const { getOne } = require('../../../db/databaseService');
const { ObjectId } = require('mongodb');

describe('documentController.getById', () => {
    let mRes;
    let mReq;

    beforeEach(() => {
        mReq = {
            params: {id: 'B25C8076A6A8773CBF8138B6'},
            user: 'B25C8076A6A8773CBF8138B6',
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
    });

    test('should return 400 on empty id', async () => {
        mReq.params.id = '';

        await controller.getById(mReq, mRes);
        
        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 400 on missing id', async () => {
        mReq.params = {};

        await controller.getById(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });       
    });

    test('should return 200', async () => {
        const document = {
            _id: new ObjectId(mReq.params.id),
            title: 'title',
            content: 'content',
            version: 1,
            flags: {}
        };
        getOne.mockResolvedValue(document);

        await controller.getById(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            id: document._id,
            title: document.title,
            content: document.content,
            version: document.version,
            success: true,
            flags: {}
        });
    });
    
    test('should return 404 if document not found', async () => {
        getOne.mockResolvedValue(null);

        await controller.getById(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(404);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'NOT_FOUND',
            success: false
        });
    });

    test('should return 500', async () => {
        const error = new Error('server error');
        getOne.mockRejectedValue(error);

        await controller.getById(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });
})