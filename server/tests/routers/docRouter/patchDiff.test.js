const request = require('supertest');
const express = require('express');
const diff = require('diff');
const docRouter = require('../../../routes/docRouter');
const doc = require('../../../database/docService');

// Mock dependencies
jest.mock('../../../database/docService');
jest.mock('diff', () => ({
    applyPatch: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/doc', docRouter);

describe('PATCH /doc/diff', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 for invalid input', async () => {
        
        const res = await request(app)
            .patch('/doc/diff')
            .send({});

        expect(res.status).toBe(400);
    });

    test('should return 404 if document not found', async () => {
         
        const res = await request(app)
            .patch('/doc/diff')
            .send({
                id: '123',
                title: '',
                patch: {},
                localVersion: 4
            });
        
        doc.getDocById.mockResolvedValue(null);

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: 'NOT_FOUND',
            message: 'Document not found'
        });
    });

    test('should return 409 if version conflict', async () => {
        doc.getDocById.mockResolvedValue({
            version : 5
        });

        const res = await request(app)
            .patch('/doc/diff')
            .send({
                id: '123',
                title: '',
                patch: {},
                localVersion: 4
            });

        expect(res.status).toBe(409);
    });

    test('should update document when patch applies', async () => {
        const mockDoc = {
                id: '123',
                patch: {},
                localVersion: 2,
                title: 'new title'
            };

        doc.getDocById.mockResolvedValue({
            uuid: '123',
            title: '',
            version: 1,
            content: ''
        });
        diff.applyPatch.mockResolvedValue('abc');
        
        const res = await request(app)
            .patch('/doc/diff')
            .send(mockDoc);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: '123',
            newSyncedVersion: 2
        });
    });

    test('should return 400 if patch fails', async () => {
        const mockDoc = {
            localVersion: 1
        };

        doc.getDocById.mockResolvedValue(mockDoc);
        diff.applyPatch.mockReturnValue(false);

        const res = await request(app)
            .patch('/doc/diff')
            .send({
                id: '123',
                title: '',
                patch: {},
                localVersion: 2
            });
        
        expect(res.status).toBe(400);
        expect(res.body).toBe('Patch could not be applied');
    });

    test('should handle thrown errors', async () => {
        doc.getDocById.mockRejectedValue({
            statusCode: 500,
            name: 'DB_ERROR',
            message: 'Database Error: Get Document'
        });

        const res = await request(app)
            .patch('/doc/diff')
            .send({
                id: '123',
                title: 'title',
                patch: {},
                localVersion: 2
            });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'DB_ERROR',
            message: 'Database Error: Get Document'
        });
    });
});