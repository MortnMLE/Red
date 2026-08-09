const request = require('supertest');
const express = require('express');
const userRouter = require('../../../routes/userRouter');
const user = require('../../../database/userService');

// Mock dependencies
jest.mock('../../../database/userService');

const app = express();
app.use(express.json());
app.use('/user', userRouter);

describe('DELETE /user', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 for invalid input', async () => {

        const res = await request(app)
            .delete('/user')
            .send({});
        
        expect(res.status).toBe(400);
    });

    test('should return 404 when user not found', async () => {
        
        user.getUser.mockResolvedValue(null);

        const res = await request(app)
            .delete('/user')
            .send({
                user: 'abc',
                password: '123'
            }); 
        
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: 'NOT_FOUND',
            message: 'invalid user provided by client'
        });
    });

    test('should return 401 when password is not correct', async () => {

        user.getUser.mockResolvedValue({
            user: 'abc',
            password: '987'
        });
        user.comparePassword.mockResolvedValue(false);

        const res = await request(app)
            .delete('/user')
            .send({
                user: 'abc',
                password: '123'
            }); 

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
            error: 'NOT_AUTHORIZED',
            message: 'could not delete account'
        });
    });

    test('should successfully delete user account', async () => {

        user.getUser.mockResolvedValue({
            user: 'abc',
            password: '123'
        });
        user.comparePassword.mockResolvedValue(true);
        user.deleteUser()
        const res = await request(app)
            .delete('/user')
            .send({
                user: 'abc',
                password: '123'
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual('Successfully deleted user');
    });

    test('should catch thrown error from getUser', async () => {

        user.getUser.mockRejectedValue({
            statusCode: 500, 
            name: 'DB_ERROR',
            message: 'Database Error'
        });

        const res = await request(app)
            .delete('/user')
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

    test('should catch thrown error from deleteUser', async () => {

        user.getUser.mockResolvedValue({
            user: 'abc',
            password: '123'
        });
        user.comparePassword.mockResolvedValue(true);
        user.deleteUser.mockRejectedValue({
            statusCode: 500, 
            name: 'DB_ERROR',
            message: 'Database Error'
        });

        const res = await request(app)
            .delete('/user')
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