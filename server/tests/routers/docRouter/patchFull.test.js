const request = require('supertest');
const express = require('express');
const docRouter = require('../../../routers/docRouter');
const doc = require('../../../database/docService');

// Mock dependencies
jest.mock('../../../database/docService');

const app = express();
app.use(express.json());
app.use('/doc', docRouter);

describe('PATCH /doc/full', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 for invalid input', async () => {

        const res = await request(app)
            .patch('/doc/full')
            .send({});
        
        expect(res.status).toBe(400);
    });

    test('should return 404 if document not found', async () => {

        doc.getDocById.mockResolvedValue(null);

        const res = await request(app)
            .patch('/doc/full')
            .send({
                id: '123',
                title: '',
                content: 'ABCDEFG',
                localVersion: 4
            });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: 'NOT_FOUND',
            message: 'document not found'
        });
    });

    test('should return 409 if version conflict', async () => {

        doc.getDocById.mockResolvedValue({
            version: 5
        });

        const res = await request(app)
            .patch('/doc/full')
            .send({
                id: '123',
                title: '',
                content: 'ABCDEFG',
                localVersion: 4
            }); 

        expect(res.status).toBe(409);
        expect(res.body).toBe('VERSION_CONFLICT');
    });

    test('should update document', async () => {

        doc.getDocById.mockResolvedValue({
            uuid: '123',
            title: '',
            version: 1,
            content: ''
        });

        const res = await request(app)
            .patch('/doc/full')
            .send({
                id: '123',
                title: 'New Title',
                content: 'New Content',
                localVersion: 2
            }); 
        
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: '123',
            newSyncedVersion: 2
        });
    });

    test('should handle thrown errors', async () => {
        doc.getDocById.mockRejectedValue({
            statusCode: 500, 
            name: 'DB_ERROR',
            message: 'Database Error: Get Document'
        });        

        const res = await request(app)
            .patch('/doc/full')
            .send({
                id: '123',
                title: 'New Title',
                content: 'New Content',
                localVersion: 2
            });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
           error: 'DB_ERROR',
           message: 'Database Error: Get Document' 
        });
    });
});