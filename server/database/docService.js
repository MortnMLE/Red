const db = require('./connection');
const { ObjectId } = require('mongodb');
const { DatabaseError } = require('../errors/errors');

const dbName = 'documents';
//inserts a new document and returns the newly generated _id
async function createDoc(id, title, content, version) {
    try {
        const con = await db.getConnection(dbName); 
        const doc = {
            user_id: new ObjectId(id),
            title: title,
            content: content,
            version: version
        }

        return await con.insertOne(doc);

    } catch (err) {
        throw new DatabaseError('Database Error: Document Creation');        
    }
};

async function getDocsByUserId(id) {
    try {
        const con = await db.getConnection(dbName);
        const result = await con.find({ user_id: new ObjectId(id) }).toArray();
        
        return JSON.stringify(result);

    } catch (err) {
        throw new DatabaseError('Database Error: Get Documents by user id');
    }
};

async function getDocById(id) {
    try {
        const con = await db.getConnection(dbName);
        
        return await con.findOne({ _id: new ObjectId(id) });

    } catch (err) {
        throw new DatabaseError('Database Error: Get Document');
    }
};

async function updateDoc(doc) {
    try {
        const con = await db.getConnection(dbName);
        
        const result = await con.updateOne(
            { _id: new ObjectId(doc._id) },
            {
                $set: { 
                    title: doc.title, 
                    content: doc.content, 
                    version: doc.version
                }
            }
        );

        if (result.modifiedCount < 1) {
            throw new DatabaseError('Database Error: No document found');
        }

        return result;
    } catch (err) {
        throw new DatabaseError('Database Error: Update Document');
    }
};

async function deleteDoc(id) {
    try {
        const con = await db.getConnection(dbName);

        return await con.deleteOne(
            { _id: new ObjectId(id) }
        );
    } catch (err) {
        throw new DatabaseError('Database Error: Delete Document');
    }
}

module.exports = {
    createDoc,
    getDocById,
    updateDoc,
    getDocsByUserId,
    deleteDoc
};