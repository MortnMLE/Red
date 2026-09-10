jest.mock('../../../../src/db/databaseService', () => ({
    insertOne: jest.fn(),
    getOne: jest.fn(),
}));

jest.mock('../../../../src/models/image', () => ({
    create: jest.fn(),
}));

const controller = require('../../../../src/controllers/imageController');
const { insertOne, getOne } = require('../../../../src/db/databaseService');
const { create } = require('../../../../src/models/image');

describe('imageController.create', () => {
    let mReq;
    let mRes;

    let newImage;

    beforeEach(() => {
        newImage = {
            docId: '507f1f77bcf86cd799439013',
            name: 'image.png',
            file: 'file'
        }

        mReq = {
            user: '507f1f77bcf86cd799439014',
            body: {
                docId: '507f1f77bcf86cd799439013',
                name: 'image.png'
            },
            file: {
                buffer: Buffer.from('file'),
                mimetype: 'image/png',
                size: 4
            }
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        create.mockReturnValue(newImage);

        jest.clearAllMocks();
        getOne.mockResolvedValue({});
    });

    test('should create an image and return 200 with the inserted id', async () => {
        insertOne.mockResolvedValue({
            insertedId: 'id',
            acknowledged: true
        });

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            id: 'id',
            success: true
        });
    });

    test('should return success false when insertOne returns acknowledged false', async () => {
        insertOne.mockResolvedValue({
            insertedId: 'id',
            acknowledged: false
        });

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            id: 'id',
            success: false
        });
    });

    test('should return 500 when db.insertOne throws', async () => {
        const error = new Error('Database error');

        insertOne.mockRejectedValue(error);

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 400 on missing parameter', async () => {
        mReq.body.docId = '';

        await controller.create(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });
});