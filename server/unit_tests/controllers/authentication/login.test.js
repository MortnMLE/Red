jest.mock('../../../db/databaseService', () => ({
    getOne: jest.fn(),
}));

jest.mock('../../../utils/tokenUtils', () => ({
    createToken: jest.fn(),
    createRefreshTokenSettings: jest.fn(),
}));

jest.mock('../../../models/user', () => ({
    passwordIsEqual: jest.fn(),
}));

const { getOne } = require('../../../db/databaseService');
const controller = require('../../../controllers/authenticationController');
const { createToken, createRefreshTokenSettings } = require('../../../utils/tokenUtils');
const { passwordIsEqual } = require('../../../models/user');


describe('authenticationController.login', () => {
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

        controller.clearRefreshTokens();
        refreshTokens = controller.getRefreshTokens();

        jest.clearAllMocks();
    });

    test('should return 400 on missing parameter', async () => {
        mReq.body = {};

        await controller.login(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 400 on empty parameter', async () => {
        mReq.body.username = '';

        await controller.login(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'BAD_REQUEST',
            success: false
        });
    });

    test('should return 500 on throw', async () => {
        const error = new Error();
        getOne.mockRejectedValue(error);

        await controller.login(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
    });

    test('should return 400 if wrong password was provided', async () => {
        getOne.mockResolvedValue({});
        passwordIsEqual.mockReturnValue(false);

        await controller.login(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(400);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'INVALID_CREDENTIALS',
            success: false
        });
    });

    test('should return 200', async () => {
        getOne.mockResolvedValue({password: '123', _id: '123'});

        passwordIsEqual.mockResolvedValue(true);

        const token = {};
        createToken.mockReturnValue(token);
        createRefreshTokenSettings.mockReturnValue({});

        await controller.login(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            id: '123',
            token,
            success: true
        });
        expect(mRes.cookie).toHaveBeenCalledWith(
            'refreshToken',
            token,
            expect.anything()
        );
        expect(refreshTokens[0]).toEqual(token);
    });
});