const request = require('supertest');
const express = require('express');
const diff = require('diff');
const docRouter = require('../../routers/docRouter');
const doc = require('../../database/docService');

// Mock dependencies
jest.mock('../../database/docService');

const app = express();
app.use(express.json());
app.use('/doc', docRouter);

describe('GET /byUser', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 for invalid input', async () => {

        const res = await request(app)
            .get('/doc/byUser')
            .send({});

        expect(res.status).toBe(400);
    });

    test('should return empty array', async () => {

        doc.getDocsByUserId.mockResolvedValue([]);

        const res = await request(app)
            .get('/doc/byUser')
            .send({
                user_id: '123'
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('should handle thrown error', async () => {

        doc.getDocsByUserId.mockRejectedValue({
            statusCode: 500, 
            name: 'DB_ERROR',
            message: 'Database Error: Get Document'
        });

        const res = await request(app)
            .get('/doc/byUser')
            .send({
                user_id: '123'
            });
        
        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'DB_ERROR',
            message: 'Database Error: Get Document'
        });
    });
});