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

describe('GET /', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 for invalid input', async () => {

        const res = await request(app)
            .get('/doc')
            .send({});

        expect(res.status).toBe(400);
    });

    test('should return 404 when document not found', async () => {

        doc.getDocById.mockResolvedValue(null);

        const res = await request(app)
            .get('/doc')
            .send({
                id: '123'
            }); 
        
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: 'NOT_FOUND',
            message: 'document not found'
        });
    });    

    test('should return document', async () => {

        doc.getDocById.mockResolvedValue({
            id: '123'
        });

        const res = await request(app)
            .get('/doc')
            .send({
                id: '123'
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: '123'
        });
    });

    test('should handle thrown error', async () => {
        
        doc.getDocById.mockRejectedValue({
            statusCode: 500,
            name: 'DB_ERROR',
            message: 'Database Error: Get Document'
        });

        const res = await request(app)
            .get('/doc')
            .send({
                id: '123'
            });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'DB_ERROR',
            message: 'Database Error: Get Document'
        });
    });
});