const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../../../src/middlewares/authenticate');

jest.mock('jsonwebtoken');

describe('authenticateToken middleware', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = {
            headers: {},
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();

        process.env.JWT_SECRET = 'test-secret';

        jest.clearAllMocks();
    });

    test('should return 401 when authorization header is missing', () => {
        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Token missing',
        });

        expect(next).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
    });


    test('should return 401 when authorization header contains no token', () => {
        req.headers.authorization = 'Bearer';

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Token missing',
        });

        expect(next).not.toHaveBeenCalled();
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    test('should return 403 when the token is invalid', () => {
        req.headers.authorization = 'Bearer invalid-token';

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(new Error('Invalid token'), null);
        });

        authenticateToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith(
            'invalid-token',
            'test-secret',
            expect.any(Function)
        );

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Invalid or expired token',
        });

        expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 when the token is expired', () => {
        req.headers.authorization = 'Bearer expired-token';

        const error = new jwt.TokenExpiredError(
            'jwt expired',
            new Date()
        );

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(error, null);
        });

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Invalid or expired token',
        });

        expect(next).not.toHaveBeenCalled();
    });

    test('should set req.user and call next when the token is valid', () => {
        req.headers.authorization = 'Bearer valid-token';

        const decodedToken = {
            sub: 'user-123',
            email: 'user@example.com',
        };

        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, decodedToken);
        });

        authenticateToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith(
            'valid-token',
            'test-secret',
            expect.any(Function)
        );

        expect(req.user).toBe('user-123');
        expect(next).toHaveBeenCalledTimes(1);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    test('should pass the JWT_SECRET to jwt.verify', () => {
        req.headers.authorization = 'Bearer valid-token';

        jwt.verify.mockImplementation((token, secret, callback) => {
            expect(token).toBe('valid-token');
            expect(secret).toBe('test-secret');

            callback(null, { sub: 'user-123' });
        });

        authenticateToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});