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

describe('POST /', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 for invalid input', async () => {
        
        const res = await request(app)
            .post('/doc')
            .send({});
        
        expect(res.status).toBe(400);
    });

    test('should create new document', async () => {

        doc.createDoc.mockResolvedValue(987);

        const res = await request(app)
            .post('/doc')
            .send({
                user_id: '123',
                title: 'Title',
                content: 'Content ABC'
            });
        
        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            id: 987,
            version: 1
        }); 
    });

    test('should handle thrown error', async () => {

        doc.createDoc.mockRejectedValue({
            statusCode: 500,
            name: 'DB_ERROR',
            message: 'Database Error: Document Creation'
        });

        const res = await request(app)
            .post('/doc')
            .send({
                user_id: '123',
                title: 'Title',
                content: 'Content ABC'
            });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'DB_ERROR',
            message: 'Database Error: Document Creation'
        });
    });
});
