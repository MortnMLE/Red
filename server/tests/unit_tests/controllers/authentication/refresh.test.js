jest.mock('../../../../src/utils/tokenUtils', () => ({
    createToken: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

const controller = require('../../../../src/controllers/authenticationController');
const { createToken } = require('../../../../src/utils/tokenUtils');
const jwt = require('jsonwebtoken');

describe('authenticationController.refresh', () => {
    let mRes;
    let mReq;
    let refreshTokens;
    const token = {e: '123'};

    beforeEach(() => {
        mReq = {
            cookies: {
                refreshToken: token
            }
        };

        mRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        controller.clearRefreshTokens();
        refreshTokens = controller.getRefreshTokens();

        jest.clearAllMocks();
    });

    test('should return 400 on missing parameter', async () => {
        mReq.cookies = {};

        await controller.refresh(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(401);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'UNAUTHORIZED',
            success: false
        });
    });

    test('should return 403 if refreshToken not in cache', async () => {
        await controller.refresh(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(403);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'INVALID',
            success: false
        });       
    });

    test('should return 500 if verification throws', async () => {
        refreshTokens.push(token);

        const error = new Error();
        jwt.verify.mockImplementation(() => {
            throw error;
        });

        await controller.refresh(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(500);
        expect(mRes.json).toHaveBeenCalledWith({
            error,
            success: false
        });
        expect(jwt.verify).toHaveBeenCalled();
    });

    test('should return 200 on successfull verification', async () => {
        refreshTokens.push(token);

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, { sub: '123' });
        });

        const newToken = {e: 'blub'};
        createToken.mockReturnValue(newToken)

        await controller.refresh(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(200);
        expect(mRes.json).toHaveBeenCalledWith({
            token: newToken,
            success: true
        });
    });

    test('should return 403 if verification fails', async () => {
        refreshTokens.push(token);

        const error = new Error();
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(error);
        });

        const newToken = {e: 'blub'};
        createToken.mockReturnValue(newToken)

        await controller.refresh(mReq, mRes);

        expect(mRes.status).toHaveBeenCalledWith(403);
        expect(mRes.json).toHaveBeenCalledWith({
            error: 'INVALID',
            success: false
        });
    })
});