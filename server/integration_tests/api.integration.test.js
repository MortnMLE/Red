const integrationEnabled = Boolean(
    process.env.RUN_INTEGRATION_TESTS && process.env.MONGODB
);

if (process.env.RUN_INTEGRATION_TESTS && !process.env.MONGODB) {
    test('requires MONGODB for integration tests', () => {
        throw new Error(
            'Set MONGODB in server/.env before running integration tests.'
        );
    });
}

const describeIntegration = integrationEnabled ? describe : describe.skip;

if (integrationEnabled) {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret';
    process.env.JWT_AUTH_EXPIRES = process.env.JWT_AUTH_EXPIRES || '15m';
    process.env.JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '1d';
    process.env.MAX_AGE = process.env.MAX_AGE || '1';
    process.env.SALT = process.env.SALT || '4';
}

const request = require('supertest');
const { ObjectId } = require('mongodb');
const { app } = require('../app');
const { connectDB, closeDB, getConnection } = require('../db/connection');
const { userDbName, documentDbName, imageDbName } = require('../constants');
const authenticationController = require('../controllers/authenticationController');

describeIntegration('API integration', () => {
    const usernamePrefix = `integration-${Date.now()}-`;
    const createdUsers = [];
    const createdDocuments = [];
    const createdImages = [];

    async function registerUser(label) {
        const username = `${usernamePrefix}${label}`;
        const agent = request.agent(app);
        const response = await agent
            .post('/auth/register')
            .send({ username, password: 'integration-password' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toEqual(expect.any(String));
        expect(response.headers['set-cookie']).toEqual(
            expect.arrayContaining([expect.stringContaining('refreshToken=')])
        );

        const userId = response.body.id;
        createdUsers.push({ id: userId, username });

        return { agent, id: userId, token: response.body.token };
    }

    async function createDocument(user, overrides = {}) {
        const response = await user.agent
            .post('/doc')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                title: 'Integration document',
                content: '# Integration',
                version: 1,
                ...overrides,
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        createdDocuments.push(response.body.id);
        return response.body.id;
    }

    beforeAll(async () => {
        await connectDB();
    });

    afterEach(() => {
        authenticationController.clearRefreshTokens();
    });

    afterAll(async () => {
        const users = await getConnection(userDbName);
        const documents = await getConnection(documentDbName);
        const images = await getConnection(imageDbName);

        const documentIds = createdDocuments
            .filter(Boolean)
            .map((id) => new ObjectId(id));
        const imageIds = createdImages
            .filter(Boolean)
            .map((id) => new ObjectId(id));
        const userIds = createdUsers
            .filter((user) => user.id)
            .map((user) => new ObjectId(user.id));

        if (imageIds.length > 0) {
            await images.deleteMany({ _id: { $in: imageIds } });
        }
        if (documentIds.length > 0) {
            await documents.deleteMany({ _id: { $in: documentIds } });
        }
        if (userIds.length > 0) {
            await users.deleteMany({ _id: { $in: userIds } });
        }

        authenticationController.clearRefreshTokens();
        await closeDB();
    });

    test('registers, logs in, and refreshes an authenticated session', async () => {
        const username = `${usernamePrefix}lifecycle`;
        const agent = request.agent(app);

        const registerResponse = await agent
            .post('/auth/register')
            .send({ username, password: 'integration-password' });

        expect(registerResponse.status).toBe(200);
        expect(registerResponse.body).toEqual({
            id: expect.any(String),
            success: true,
            token: expect.any(String),
        });

        createdUsers.push({ id: registerResponse.body.id, username });

        const loginResponse = await agent
            .post('/auth/login')
            .send({ username, password: 'integration-password' });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toEqual({
            id: registerResponse.body.id,
            success: true,
            token: expect.any(String),
        });

        const refreshResponse = await agent.post('/auth/refresh');

        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.body).toEqual({
            success: true,
            token: expect.any(String),
        });

        const storedUser = await (await getConnection(userDbName)).findOne({
            _id: new ObjectId(registerResponse.body.id),
        });
        expect(storedUser.password).not.toBe('integration-password');
    });

    test('rejects missing and invalid authentication on protected routes', async () => {
        const missingTokenResponse = await request(app).get('/doc/byUser');
        expect(missingTokenResponse.status).toBe(401);

        const invalidTokenResponse = await request(app)
            .get('/doc/byUser')
            .set('Authorization', 'Bearer invalid-token');
        expect(invalidTokenResponse.status).toBe(403);
    });

    test('persists, reads, updates, conflicts, and soft-deletes a document', async () => {
        const user = await registerUser('documents');
        const documentId = await createDocument(user);

        const readResponse = await user.agent
            .get(`/doc/byId/${documentId}`)
            .set('Authorization', `Bearer ${user.token}`);
        expect(readResponse.status).toBe(200);
        expect(readResponse.body).toMatchObject({
            id: documentId,
            title: 'Integration document',
            content: '# Integration',
            version: 1,
            flags: { deleted: false },
            success: true,
        });

        const updateResponse = await user.agent
            .patch('/doc')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                id: documentId,
                title: 'Updated document',
                content: 'Updated content',
                version: 2,
            });
        expect(updateResponse.status).toBe(200);

        const conflictResponse = await user.agent
            .patch('/doc')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                id: documentId,
                title: 'Stale update',
                content: 'Stale content',
                version: 2,
            });
        expect(conflictResponse.status).toBe(409);
        expect(conflictResponse.body.error).toBe('VERSION_CONFLICT');

        const deleteResponse = await user.agent
            .delete('/doc')
            .set('Authorization', `Bearer ${user.token}`)
            .send({ id: documentId });
        expect(deleteResponse.status).toBe(200);

        const storedDocument = await (await getConnection(documentDbName)).findOne({
            _id: new ObjectId(documentId),
        });
        expect(storedDocument.flags.deleted).toBe(true);
    });

    test('does not allow one user to access another user\'s document', async () => {
        const owner = await registerUser('owner');
        const otherUser = await registerUser('other');
        const documentId = await createDocument(owner);

        const response = await otherUser.agent
            .get(`/doc/byId/${documentId}`)
            .set('Authorization', `Bearer ${otherUser.token}`);

        expect(response.status).toBe(404);
    });

    test('uploads, lists, downloads, and deletes an image', async () => {
        const user = await registerUser('images');
        const documentId = await createDocument(user);
        const imageBytes = Buffer.from('integration-image');

        const uploadResponse = await user.agent
            .post('/img')
            .set('Authorization', `Bearer ${user.token}`)
            .field('docId', documentId)
            .field('name', 'integration.png')
            .attach('image', imageBytes, {
                filename: 'integration.png',
                contentType: 'image/png',
            });
        

        expect(uploadResponse.status).toBe(200);
        expect(uploadResponse.body).toEqual({
            id: expect.any(String),
            success: true,
        });
        createdImages.push(uploadResponse.body.id);

        const listResponse = await user.agent
            .get(`/img/allForDocId/${documentId}`)
            .set('Authorization', `Bearer ${user.token}`);
        expect(listResponse.status).toBe(200);
        expect(listResponse.body.images).toContain(uploadResponse.body.id);

        const downloadResponse = await user.agent
            .get(`/img/byId/${uploadResponse.body.id}`)
            .set('Authorization', `Bearer ${user.token}`);
        expect(downloadResponse.status).toBe(200);
        expect(downloadResponse.headers['content-type']).toContain('image/png');
        expect(downloadResponse.headers['content-disposition']).toContain(
            'filename="integration.png"'
        );
        expect(downloadResponse.body).toEqual(imageBytes);

        const deleteResponse = await user.agent
            .delete('/img')
            .set('Authorization', `Bearer ${user.token}`)
            .send({ id: uploadResponse.body.id });
        expect(deleteResponse.status).toBe(200);
    });

    test('surfaces stale-version conflicts without losing the newest document state', async () => {
        const user = await registerUser('version-conflict');
        const documentId = await createDocument(user, { title: 'Versioned doc', content: 'v1', version: 1 });

        const staleClient = request.agent(app);
        const freshClient = request.agent(app);

        const beforeRead = await staleClient
            .get(`/doc/byId/${documentId}`)
            .set('Authorization', `Bearer ${user.token}`);
        expect(beforeRead.status).toBe(200);
        expect(beforeRead.body.version).toBe(1);

        const freshUpdate = await freshClient
            .patch('/doc')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                id: documentId,
                title: 'Versioned doc',
                content: 'v2',
                version: 2,
            });
        expect(freshUpdate.status).toBe(200);
        expect(freshUpdate.body.newSyncedVersion).toBe(2);

        const staleUpdate = await staleClient
            .patch('/doc')
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                id: documentId,
                title: 'Versioned doc',
                content: 'stale-write',
                version: 2,
            });
        expect(staleUpdate.status).toBe(409);
        expect(staleUpdate.body.error).toBe('VERSION_CONFLICT');

        const finalRead = await user.agent
            .get(`/doc/byId/${documentId}`)
            .set('Authorization', `Bearer ${user.token}`);
        expect(finalRead.status).toBe(200);
        expect(finalRead.body).toMatchObject({
            id: documentId,
            title: 'Versioned doc',
            content: 'v2',
            version: 2,
            success: true,
        });
    });

    test('allows only one concurrent update from the same document version', async () => {
        const user = await registerUser('concurrent-version-conflict');
        const documentId = await createDocument(user, {
            title: 'Concurrent doc',
            content: 'v1',
            version: 1,
        });
        const clientA = request.agent(app);
        const clientB = request.agent(app);

        const [readA, readB] = await Promise.all([
            clientA
                .get(`/doc/byId/${documentId}`)
                .set('Authorization', `Bearer ${user.token}`),
            clientB
                .get(`/doc/byId/${documentId}`)
                .set('Authorization', `Bearer ${user.token}`),
        ]);

        expect(readA.status).toBe(200);
        expect(readB.status).toBe(200);
        expect(readA.body.version).toBe(1);
        expect(readB.body.version).toBe(1);

        const [updateA, updateB] = await Promise.all([
            clientA
                .patch('/doc')
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                    id: documentId,
                    title: 'Update A',
                    content: 'content A',
                    version: 2,
                }),
            clientB
                .patch('/doc')
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                    id: documentId,
                    title: 'Update B',
                    content: 'content B',
                    version: 2,
                }),
        ]);

        expect([updateA.status, updateB.status].sort()).toEqual([200, 409]);

        const conflictResponse = updateA.status === 409 ? updateA : updateB;
        expect(conflictResponse.body).toMatchObject({
            error: 'VERSION_CONFLICT',
            success: false,
        });

        const expectedTitle = updateA.status === 200 ? 'Update A' : 'Update B';
        const expectedContent = updateA.status === 200 ? 'content A' : 'content B';
        const finalRead = await user.agent
            .get(`/doc/byId/${documentId}`)
            .set('Authorization', `Bearer ${user.token}`);

        expect(finalRead.status).toBe(200);
        expect(finalRead.body).toMatchObject({
            id: documentId,
            title: expectedTitle,
            content: expectedContent,
            version: 2,
            success: true,
        });
    });

    test('returns 400 for malformed ids and 404 for missing document and image resources', async () => {
        const user = await registerUser('missing-resources');

        const malformedDocumentResponse = await user.agent
            .get('/doc/byId/not-an-object-id')
            .set('Authorization', `Bearer ${user.token}`);
        expect(malformedDocumentResponse.status).toBe(400);

        const malformedImageResponse = await user.agent
            .get('/img/byId/not-an-object-id')
            .set('Authorization', `Bearer ${user.token}`);
        expect(malformedImageResponse.status).toBe(400);

        const missingDocumentId = new ObjectId().toString();
        const missingImageId = new ObjectId().toString();

        const missingDocumentGet = await user.agent
            .get(`/doc/byId/${missingDocumentId}`)
            .set('Authorization', `Bearer ${user.token}`);
        expect(missingDocumentGet.status).toBe(404);

        const missingImageGet = await user.agent
            .get(`/img/byId/${missingImageId}`)
            .set('Authorization', `Bearer ${user.token}`);
        expect(missingImageGet.status).toBe(404);

        const documentDeleteMissing = await user.agent
            .delete('/doc')
            .set('Authorization', `Bearer ${user.token}`)
            .send({ id: missingDocumentId });
        expect(documentDeleteMissing.status).toBe(404);

        const imageDeleteMissing = await user.agent
            .delete('/img')
            .set('Authorization', `Bearer ${user.token}`)
            .send({ id: missingImageId });
        expect(imageDeleteMissing.status).toBe(404);

        const emptyDocumentCreate = await user.agent
            .post('/doc')
            .set('Authorization', `Bearer ${user.token}`)
            .send({ content: 'missing title and version' });
        expect(emptyDocumentCreate.status).toBe(400);

        const emptyImageCreate = await user.agent
            .post('/img')
            .set('Authorization', `Bearer ${user.token}`)
            .field('name', 'empty.png')
            .attach('image', Buffer.from('not-a-real-image'), {
                filename: 'empty.png',
                contentType: 'image/png',
            });
        expect(emptyImageCreate.status).toBe(400);
    });
});
