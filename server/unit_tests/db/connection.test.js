const { MongoClient } = require('mongodb');
const {
    connectDB,
    getConnection,
    closeDB,
} = require('../../db/connection');

jest.mock('mongodb', () => {
    const mockClient = {
        connect: jest.fn(),
        db: jest.fn(),
        close: jest.fn(),
    };

    return {
        MongoClient: jest.fn(() => mockClient),
        __mockClient: mockClient,
    };
});

const { __mockClient: mockClient } = require('mongodb');

describe('Database connection', () => {
    beforeEach(async () => {
        jest.clearAllMocks();

        // Reset the module's internal connection state
        await closeDB();

        process.env.MONGODB = 'mongodb://test-url';

        mockClient.connect.mockResolvedValue();
        mockClient.close.mockResolvedValue();
    });

  describe('connectDB', () => {
    test('should create a MongoClient using the MONGODB environment variable', async () => {
        const mockDb = {};

        mockClient.db.mockReturnValue(mockDb);

        const result = await connectDB();

        expect(MongoClient).toHaveBeenCalledWith(
            'mongodb://test-url'
        );

        expect(mockClient.connect).toHaveBeenCalledTimes(1);
        expect(mockClient.db).toHaveBeenCalledWith('main');
        expect(result).toBe(mockDb);
    });

    test('should reuse the existing connection', async () => {
        const mockDb = {};

        mockClient.db.mockReturnValue(mockDb);

        const firstConnection = await connectDB();
        const secondConnection = await connectDB();

        expect(firstConnection).toBe(mockDb);
        expect(secondConnection).toBe(mockDb);

        expect(MongoClient).toHaveBeenCalledTimes(1);
        expect(mockClient.connect).toHaveBeenCalledTimes(1);
        expect(mockClient.db).toHaveBeenCalledTimes(1);
    });

    test('should propagate an error if the connection fails', async () => {
        const error = new Error('Connection failed');

        mockClient.connect.mockRejectedValue(error);

        await expect(connectDB()).rejects.toThrow('Connection failed');

        expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConnection', () => {
    test('should return the requested collection', async () => {
        const mockDb = {
            collection: jest.fn(),
        };

        const mockCollection = {};

        mockClient.db.mockReturnValue(mockDb);
        mockDb.collection.mockReturnValue(mockCollection);

        const result = await getConnection('users');

        expect(mockDb.collection).toHaveBeenCalledWith('users');
        expect(result).toBe(mockCollection);
    });

    test('should create a database connection before getting the collection', async () => {
        const mockDb = {
            collection: jest.fn(),
        };

        mockClient.db.mockReturnValue(mockDb);

        await getConnection('users');

        expect(mockClient.connect).toHaveBeenCalledTimes(1);
        expect(mockClient.db).toHaveBeenCalledWith('main');
        expect(mockDb.collection).toHaveBeenCalledWith('users');
    });

    test('should reuse the existing database connection', async () => {
        const mockDb = {
            collection: jest.fn(),
        };

        mockClient.db.mockReturnValue(mockDb);

        await getConnection('users');
        await getConnection('products');

        expect(mockClient.connect).toHaveBeenCalledTimes(1);
        expect(mockClient.db).toHaveBeenCalledTimes(1);

        expect(mockDb.collection).toHaveBeenNthCalledWith(1, 'users');
        expect(mockDb.collection).toHaveBeenNthCalledWith(2, 'products');
    });

    test('should throw EMPTY_DBNAME when name is not a string', async () => {
        await expect(getConnection(null))
            .rejects
            .toThrow('EMPTY_DBNAME');

        expect(MongoClient).not.toHaveBeenCalled();
        expect(mockClient.connect).not.toHaveBeenCalled();
    });

    test('should throw EMPTY_DBNAME when name is undefined', async () => {
        await expect(getConnection(undefined))
            .rejects
            .toThrow('EMPTY_DBNAME');

        expect(MongoClient).not.toHaveBeenCalled();
        expect(mockClient.connect).not.toHaveBeenCalled();
    });

    test('should throw EMPTY_DBNAME when name is a number', async () => {
        await expect(getConnection(123))
            .rejects
            .toThrow('EMPTY_DBNAME');

        expect(MongoClient).not.toHaveBeenCalled();
    });

    test('should throw EMPTY_DBNAME when name is an object', async () => {
        await expect(getConnection({ name: 'users' }))
            .rejects
            .toThrow('EMPTY_DBNAME');

        expect(MongoClient).not.toHaveBeenCalled();
    });

    test('should allow an empty string as a collection name', async () => {
        const mockDb = {
            collection: jest.fn(),
        };

        mockClient.db.mockReturnValue(mockDb);

        await getConnection('');

        expect(mockDb.collection).toHaveBeenCalledWith('');
    });
  });

  describe('closeDB', () => {
    test('should close the MongoDB connection', async () => {
        await connectDB();

        await closeDB();

        expect(mockClient.close).toHaveBeenCalled();
    });

    test('should do nothing when there is no active connection', async () => {
        await closeDB();

        expect(mockClient.close).not.toHaveBeenCalled();
    });
  });
});