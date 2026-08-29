jest.mock('../../../db/databaseService', () => ({
    insertOne: jest.fn(),
}));

jest.mock('../../../models/image', () => ({
    create: jest.fn(),
}));

const controller = require('../../../controllers/imageController');
const { insertOne } = require('../../../db/databaseService');
const { create } = require('../../../models/image');

describe('imageController.create', () => {
    let mReq;
    let mRes;

    let newImage;

    beforeEach(() => {
        newImage = {
            docId: 'docId',
            name: 'image.png',
            file: 'file'
        }

        mReq = {
            body: {
                docId: 'docId',
                name: 'image.png',
                file: 'file'
            }
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        create.mockReturnValue(newImage);

        jest.clearAllMocks();
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