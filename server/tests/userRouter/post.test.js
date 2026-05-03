const request = require('supertest');
const express = require('express');
const userRouter = require('../../routers/userRouter');
const user = require('../../database/userService');

jest.mock('../../database/userService');

const app = express();
app.use(express.json());
app.use('/user', userRouter);

describe('POST /user/', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 for invalid input', async () => {

        const res = await request(app)
            .post('/user')
            .send({});

        expect(res.status).toBe(400);
    });

    test('should return 409 when user already exists', async () => {

        user.getUser.mockResolvedValue({});

        const res = await request(app)
            .post('/user')
            .send({
                user: 'abc',
                password: '123'
            });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({
            error: 'CONFLICT',
            message: 'User already exists'
        });
    });

    test('should successfully create user', async () => {

        user.getUser.mockResolvedValue(null);
        user.createUser.mockResolvedValue('123');
    
        const res = await request(app)
            .post('/user')
            .send({
                user: 'abc',
                password: '123'
            });
    
        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            id: '123'
        });     
    });

    test('should catch thrown error from getUser', async () => {

        user.getUser.mockRejectedValue({
            statusCode: 500,
            name: 'DB_ERROR',
            message: 'Database Error'
        });

        const res = await request(app)
            .post('/user')
            .send({
                user: 'abc',
                password: '123'
            });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'DB_ERROR',
            message: 'Database Error'
        });
    });

    test('should catch thrown error from createUser', async () => {

        user.getUser.mockResolvedValue(null);
        user.createUser.mockRejectedValue({
            statusCode: 500, 
            name: 'DB_ERROR',
            message: 'Database Error'
        });
        
        const res = await request(app)
            .post('/user')
            .send({
                user: 'abc',
                password: '123'
            });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'DB_ERROR',
            message: 'Database Error'
        });
    });
});