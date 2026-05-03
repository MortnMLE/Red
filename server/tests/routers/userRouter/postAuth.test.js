const request = require('supertest');
const express = require('express');
const userRouter = require('../../../routers/userRouter');
const user = require('../../../database/userService');

// Mock dependencies
jest.mock('../../../database/userService');

const app = express();
app.use(express.json());
app.use('/user', userRouter);

describe('POST /user/auth', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 for invalid input', async () => {

        const res = await request(app)
            .post('/user/auth')
            .send({});

        expect(res.status).toBe(400);
    });

    test('should return 401 when user not returned', async () => {

        user.getUser.mockResolvedValue(null);

        const res = await request(app)
            .post('/user/auth')
            .send({
                user: 'username',
                password: '123456'
            });
        
        expect(res.status).toBe(401);
        expect(res.body).toEqual({
            error: 'INVALID_CREDENTIALS',
            message: 'unknown user'
        });
    });

    test('should return 400 when wrong password was provided', async () => {

        user.getUser.mockResolvedValue({
            uuid: '123'
        });
        user.comparePassword.mockResolvedValue(false);

        const res = await request(app)
            .post('/user/auth')
            .send({
                user: 'username',
                password: '123456'
            });
        
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: 'INVALID_CREDENTIALS',
            message: 'invalid credentials provided by client'
        });
    });

    test('should return 200 and user id when password is correct', async () => {

        user.getUser.mockResolvedValue({
            uuid: '123'
        });
        user.comparePassword.mockResolvedValue(true);

        const res = await request(app)
            .post('/user/auth')
            .send({
                user: 'username',
                password: '123456'
            });
        
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: '123'
        });
    });

    test('should catch thrown error', async () => {
        
        user.getUser.mockRejectedValue({
            statusCode: 500, 
            name: 'DB_ERROR',
            message: 'Database Error'
        });

        const res = await request(app)
            .post('/user/auth')
            .send({
                user: 'username',
                password: '123456'
            });
        
        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'DB_ERROR',
            message: 'Database Error'
        }); 
    });
});