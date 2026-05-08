const db = require('../../database/connection');
const doc = require('../../database/docService');
const { ObjectId } = require('mongodb');
const { DatabaseError } = require('../../errors/errors');

// Mock dependencies
jest.mock('../../database/connection');

describe('DocService', () => {

    let mockCollection;

    beforeEach(() => {
        mockCollection = {
            insertOne: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            updateOne: jest.fn()
        };

        db.getConnection.mockResolvedValue(mockCollection);
    }); 

    afterEach(() => {
        jest.clearAllMocks();
    });
    
    const testId = '507f1f77bcf86cd799439011';

    // ===================
    // createDoc
    // ===================

    test('createDoc: should create a new document and return its _id', async () => {

        const mockResult = { insertedId: '123' };
        mockCollection.insertOne.mockResolvedValue({ insertedId: '123'});

        const result = await doc.createDoc(testId, 'title', 'content');

        expect(mockCollection.insertOne).toHaveBeenCalledWith({
            user_id: expect.any(ObjectId),
            title: 'title',
            content: 'content',
            version: 1
        });
        expect(result).toEqual(mockResult);
    });

    test('createDoc: should throw DatabaseError on insert failure', async () => {

        mockCollection.insertOne.mockRejectedValue(new Error('fail'));
        
        await expect(
            doc.createDoc(testId, 'title', 'content')
        ).rejects.toBeInstanceOf(DatabaseError);
    });

    test('createDoc: should throw DatabaseError on getConnection failure', async () => {

        db.getConnection.mockRejectedValue(new Error('fail'));

        await expect(
            doc.createDoc(testId, 'title', 'content')
        ).rejects.toBeInstanceOf(DatabaseError);
    });

    test('createDoc: should throw error on invalid id input', async ()=> {
        
        db.getConnection.mockResolvedValue({});

        await expect(
            doc.createDoc('invalid-id', 'title', 'content')
        ).rejects.toBeInstanceOf(DatabaseError);
    });
    // ===================
    // getDocsByUserId
    // ===================

    test('getDocsByUserId: should throw DatabaseError on getConnection failure', async () => {

        db.getConnection.mockRejectedValue(new Error('fail'));

        await expect(
            doc.getDocsByUserId(testId)
        ).rejects.toBeInstanceOf(DatabaseError);
    });

    test('getDocsByUserId: should return empty array when user_id not found', async() => {

        mockCollection.find.mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
        });

        const result = await doc.getDocsByUserId(testId);

        expect(mockCollection.find).toHaveBeenCalledWith({ user_id: new ObjectId(testId)});
        expect(result).toEqual([]);
    });

    test('getDocsByUserId: should throw DatabaseError on find failure', async () => {

        mockCollection.find.mockReturnValue({
            toArray: jest.fn().mockRejectedValue(new Error('fail'))
        });

        await expect(
            doc.getDocsByUserId(testId)
        ).rejects.toBeInstanceOf(DatabaseError);
    });

    // ===================
    //getDocById
    // ===================

    test('getDocById: should throw DatabaseError on getConnection failure', async () => {

        db.getConnection.mockRejectedValue(new Error('fail'));

        await expect(
            doc.getDocById(testId)
        ).rejects.toBeInstanceOf(DatabaseError);
    });

    test('getDocById: should return null if findOne finds nothing', async() => {

        mockCollection.findOne.mockResolvedValue(null);

        const result = await doc.getDocById(testId);

        expect(result).toEqual(null);
    });

    test('getDocById: should throw DatabaseError on findOne failure', async () => {

        mockCollection.findOne.mockRejectedValue(new Error('fail'));

        await expect(
            doc.getDocById(testId)
        ).rejects.toBeInstanceOf(DatabaseError);
    });   

    // ===================
    //updateDoc
    // ===================

    const updateTestInput = {
        _id: testId,
        title: 't',
        content: 'c',
        version: 2
    };

    test('updateDoc: should throw DatabaseError on getConnection failure', async () => {
        
        db.getConnection.mockRejectedValue(new Error('fail'));
        
        await expect(
            doc.updateDoc(updateTestInput)
        ).rejects.toBeInstanceOf(DatabaseError);
    });

    test('updateDoc: should throw DatabaseError on updateOne failure', async () => {

        mockCollection.updateOne.mockRejectedValue(new Error('fail'));

        await expect(
            doc.updateDoc(updateTestInput)
        ).rejects.toBeInstanceOf(DatabaseError);
    });

    test('updateDoc: should call updatOne with the correct parameters', async() => {

        mockCollection.updateOne.mockResolvedValue({ acknowledged: true });

        await doc.updateDoc(updateTestInput);

        expect(mockCollection.updateOne).toHaveBeenCalledWith(
            expect.objectContaining(
                { _id: expect.any(ObjectId) }),
                {
                    $set: {
                        title: updateTestInput.title,
                        content: updateTestInput.content,
                        version: updateTestInput.version
                    }
                }
        );
    });

    test('updateDoc: should throw DatabaseError when modifiedCount < 1', async () => {

       mockCollection.updateOne.mockResolvedValue({
        modifiedCount: 0
       });

       await expect(
        doc.updateDoc(updateTestInput)
       ).rejects.toBeInstanceOf(DatabaseError);
    });

    // ===================
    // General
    // ===================

    const dbName = 'documents';

    test('db.getConnection should be called with the correct db-name', async() => {
        await doc.createDoc(testId, 'title', 'content');
        expect(db.getConnection).toHaveBeenCalledWith(dbName);

        mockCollection.find.mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
        });
        await doc.getDocsByUserId(testId);
        expect(db.getConnection).toHaveBeenCalledWith(dbName);

        await doc.getDocById(testId);
        expect(db.getConnection).toHaveBeenCalledWith(dbName);
        
        mockCollection.updateOne.mockReturnValue({ modifiedCount: 1});
        await doc.updateDoc({
            _id: testId,
            title: 'title',
            content: 'content',
            version: 1
        });
        expect(db.getConnection).toHaveBeenCalledWith(dbName);
    });
});