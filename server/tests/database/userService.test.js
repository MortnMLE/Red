const db = require('../../../server/database/connection');
const userService = require('../../../server/database/userService');
const bcrypt = require('bcrypt');
const { DatabaseError } = require('../../../server/errors/errors');

// Mock dependencies
jest.mock('../../../server/database/connection');
jest.mock('bcrypt');

describe('UserService', () => {

    let mockCollection;

    beforeEach(() => {

        mockCollection = {
            insertOne: jest.fn(),
            findOne: jest.fn(),
            deleteOne: jest.fn()
        };

        db.getConnection.mockResolvedValue(mockCollection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // =========================
    // createUser
    // =========================

    test('createUser: should hash password and insert user', async () => {

        const user = {
            user: 'testUser',
            password: 'plainPassword'
        };

        bcrypt.hash.mockResolvedValue('hashedPassword');

        mockCollection.insertOne.mockResolvedValue({
            insertedId: '123'
        });

        const result = await userService.createUser(user);

        expect(bcrypt.hash).toHaveBeenCalledWith(
            'plainPassword',
            10
        );

        expect(db.getConnection).toHaveBeenCalledWith('users');

        expect(mockCollection.insertOne).toHaveBeenCalledWith({
            user: 'testUser',
            password: 'hashedPassword'
        });

        expect(result).toEqual({
            insertedId: '123'
        });
    });

    test('createUser: should throw DatabaseError on hash failure', async () => {

        bcrypt.hash.mockRejectedValue(new Error('fail'));

        await expect(
            userService.createUser({
                user: 'testUser',
                password: 'plainPassword'
            })
        ).rejects.toBeInstanceOf(DatabaseError);

        await expect(
            userService.createUser({
                user: 'testUser',
                password: 'plainPassword'
            })
        ).rejects.toThrow('Database Error: User Creation');
    });

    test('createUser: should throw DatabaseError on getConnection failure', async () => {

        bcrypt.hash.mockResolvedValue('hashedPassword');

        db.getConnection.mockRejectedValue(new Error('fail'));

        await expect(
            userService.createUser({
                user: 'testUser',
                password: 'plainPassword'
            })
        ).rejects.toBeInstanceOf(DatabaseError);

        await expect(
            userService.createUser({
                user: 'testUser',
                password: 'plainPassword'
            })
        ).rejects.toThrow('Database Error: User Creation');
    });

    test('createUser: should throw DatabaseError on insert failure', async () => {

        bcrypt.hash.mockResolvedValue('hashedPassword');

        mockCollection.insertOne.mockRejectedValue(new Error('fail'));

        await expect(
            userService.createUser({
                user: 'testUser',
                password: 'plainPassword'
            })
        ).rejects.toBeInstanceOf(DatabaseError);

        await expect(
            userService.createUser({
                user: 'testUser',
                password: 'plainPassword'
            })
        ).rejects.toThrow('Database Error: User Creation');
    });

    // =========================
    // getUser
    // =========================

    test('getUser: should return user when found', async () => {

        const mockUser = {
            user: 'testUser',
            password: 'hashedPassword'
        };

        mockCollection.findOne.mockResolvedValue(mockUser);

        const result = await userService.getUser('testUser');

        expect(db.getConnection).toHaveBeenCalledWith('users');

        expect(mockCollection.findOne).toHaveBeenCalledWith({
            user: 'testUser'
        });

        expect(result).toEqual(mockUser);
    });

    test('getUser: should return null when user not found', async () => {

        mockCollection.findOne.mockResolvedValue(null);

        const result = await userService.getUser('missingUser');

        expect(result).toBeNull();
    });

    test('getUser: should throw DatabaseError on getConnection failure', async () => {

        db.getConnection.mockRejectedValue(new Error('fail'));

        await expect(
            userService.getUser('testUser')
        ).rejects.toBeInstanceOf(DatabaseError);

        await expect(
            userService.getUser('testUser')
        ).rejects.toThrow('Database Error: Get User');
    });

    test('getUser: should throw DatabaseError on findOne failure', async () => {

        mockCollection.findOne.mockRejectedValue(new Error('fail'));

        await expect(
            userService.getUser('testUser')
        ).rejects.toBeInstanceOf(DatabaseError);

        await expect(
            userService.getUser('testUser')
        ).rejects.toThrow('Database Error: Get User');
    });

    // =========================
    // deleteUser
    // =========================

    test('deleteUser: should delete user successfully', async () => {

        const user = {
            user: 'testUser'
        };

        mockCollection.deleteOne.mockResolvedValue({
            acknowledged: true,
            deletedCount: 1
        });

        await userService.deleteUser(user);

        expect(db.getConnection).toHaveBeenCalledWith('users');

        expect(mockCollection.deleteOne).toHaveBeenCalledWith({
            user: 'testUser'
        });
    });

    test('deleteUser: should throw DatabaseError on getConnection failure', async () => {

        db.getConnection.mockRejectedValue(new Error('fail'));

        await expect(
            userService.deleteUser({
                user: 'testUser'
            })
        ).rejects.toBeInstanceOf(DatabaseError);

        await expect(
            userService.deleteUser({
                user: 'testUser'
            })
        ).rejects.toThrow('Database Error: User Deletion');
    });

    test('deleteUser: should throw DatabaseError on deleteOne failure', async () => {

        mockCollection.deleteOne.mockRejectedValue(new Error('fail'));

        await expect(
            userService.deleteUser({
                user: 'testUser'
            })
        ).rejects.toBeInstanceOf(DatabaseError);

        await expect(
            userService.deleteUser({
                user: 'testUser'
            })
        ).rejects.toThrow('Database Error: User Deletion');
    });

    // =========================
    // comparePassword
    // =========================

    test('comparePassword: should return true for matching passwords', async () => {

        //bcrypt.compare.mockResolvedValue(true);
        
        const result = await userService.comparePassword(
            'plainPassword',
            'hashedPassword'
        );

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'plainPassword',
            'hashedPassword'
        );

        expect(result).toBe(true);
    });

    test('comparePassword: should return false for non-matching passwords', async () => {

        bcrypt.compare.mockResolvedValue(false);

        const result = await userService.comparePassword(
            'wrongPassword',
            'hashedPassword'
        );

        expect(result).toBe(false);
    });

    test('comparePassword: should throw when bcrypt.compare fails', async () => {

        bcrypt.compare.mockRejectedValue(new Error('fail'));

        await expect(
            userService.comparePassword(
                'plainPassword',
                'hashedPassword'
            )
        ).rejects.toThrow('fail');
    });
});