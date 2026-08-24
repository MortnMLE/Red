const jwt = require('jsonwebtoken');

const {
    createToken,
    createRefreshTokenSettings,
} = require('../../utils/tokenUtils');

jest.mock('jsonwebtoken');

describe('JWT utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_REFRESH_EXPIRES = '7';
    });

    describe('createToken', () => {
        test('should create a JWT with the provided subject', () => {
            jwt.sign.mockReturnValue('mocked-jwt-token');

            const token = createToken('user-123', '1h');

            expect(token).toBe('mocked-jwt-token');

            expect(jwt.sign).toHaveBeenCalledWith(
                { sub: 'user-123' },
                'test-secret',
                { expiresIn: '1h' }
            );
        });

        test('should use the JWT_SECRET environment variable', () => {
            process.env.JWT_SECRET = 'my-secret';

            jwt.sign.mockReturnValue('token');

            createToken('user-123', '1h');

            expect(jwt.sign).toHaveBeenCalledWith(
                { sub: 'user-123' },
                'my-secret',
                { expiresIn: '1h' }
            );
        });

        test('should pass the expiresIn value to jwt.sign', () => {
            jwt.sign.mockReturnValue('token');

            createToken('user-123', '7d');

            expect(jwt.sign).toHaveBeenCalledWith(
                { sub: 'user-123' },
                'test-secret',
                { expiresIn: '7d' }
            );
        });

        test('should return whatever jwt.sign returns', () => {
            const expectedToken = 'eyJhbGciOiJIUzI1NiJ9.mock.token';

            jwt.sign.mockReturnValue(expectedToken);

            const result = createToken('user-456', '30m');

            expect(result).toBe(expectedToken);
        });

        test('should support different subject values', () => {
            jwt.sign.mockReturnValue('token');

            createToken(123, '1h');

            expect(jwt.sign).toHaveBeenCalledWith(
                { sub: 123 },
                'test-secret',
                { expiresIn: '1h' }
            );
        });
    });

    describe('createRefreshTokenSettings', () => {
        test('should return the correct cookie settings', () => {
            const settings = createRefreshTokenSettings();

            expect(settings).toEqual({
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
        });

        test('should set httpOnly to true', () => {
            const settings = createRefreshTokenSettings();

            expect(settings.httpOnly).toBe(true);
        });

        test('should set secure to true', () => {
            const settings = createRefreshTokenSettings();

            expect(settings.secure).toBe(true);
        });

        test('should set sameSite to strict', () => {
            const settings = createRefreshTokenSettings();

            expect(settings.sameSite).toBe('strict');
        });

        test('should convert JWT_REFRESH_EXPIRES from days to milliseconds', () => {
            process.env.JWT_REFRESH_EXPIRES = '3';

            const settings = createRefreshTokenSettings();

            const expectedMaxAge = 3 * 24 * 60 * 60 * 1000;

            expect(settings.maxAge).toBe(expectedMaxAge);
        });

        test('should handle a one-day refresh token', () => {
            process.env.JWT_REFRESH_EXPIRES = '1';

            const settings = createRefreshTokenSettings();

            expect(settings.maxAge).toBe(24 * 60 * 60 * 1000);
        });

        test('should handle a 30-day refresh token', () => {
            process.env.JWT_REFRESH_EXPIRES = '30';

            const settings = createRefreshTokenSettings();

            expect(settings.maxAge).toBe(
                30 * 24 * 60 * 60 * 1000
            );
        });
    });
});