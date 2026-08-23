jest.mock('../../../db/databaseService', () => ({
    insertOne: jest.fn(),
}));

jest.mock('../../../utils/tokenUtils', () => ({
    createToken: jest.fn(),
    createRefreshTokenSettings: jest.fn(),
}));

const { insertOne } = require('../../../db/databaseService');
const controller = require('../../../controllers/authenticationController');
const { createToken, createRefreshTokenSettings } = require('../../../utils/tokenUtils');

describe('authenticationController.register', () => {
    let mRes;
    let mReq;
    let refreshTokens;

    beforeEach(() => {
        mReq = {
            body: {
                username: 'test',
                password: 'password'
            },
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn(),
        };

        refreshTokens = controller.getRefreshTokens();

        jest.clearAllMocks();
    });

    test('should return 400 on missing parameter', async () => {
        mReq.body = {};
        
        await controller.register(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 400 on empty parameter', async () => {
        mReq.body.username = '';
        
        await controller.register(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 200', async () => {
        const token = {};
        insertOne.mockResolvedValue('id');
        createToken.mockReturnValue(token);
        createRefreshTokenSettings.mockReturnValue({});

        await controller.register(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            id: 'id',
            success: true,
            token
        });
        expect(mRes.cookie).toHaveBeenCalled();
        expect(refreshTokens[0]).toEqual(token);
    });

    test('should return 500 if insertOne throws', async () => {
        const error = new Error();
        insertOne.mockRejectedValue(error);

        await controller.register(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
        expect(mRes.cookie).not.toHaveBeenCalled();
    });
});