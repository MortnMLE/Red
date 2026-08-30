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
});