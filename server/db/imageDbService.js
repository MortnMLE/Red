const db = require('./connection');
const { ObjectId, Binary } = require('mongodb');
const { DatabaseError, ValidationError, InvalidIdError } = require('../errors/errors');

const dbName = 'images';

async function createImage(docId, name, file) {
    if (!ObjectId.isValid(docId)) {
        throw new InvalidIdError('Invalid docId');
    }
    if (!name) {
        throw new ValidationError('createImage: bad name');
    }     
    if (!file) { 
        throw new ValidationError('createImage: bad file');
    }

    const con = await db.getConnection(dbName);

    const img = {
        doc_id: new ObjectId(docId),
        name,
        mimeType: file.mimetype,
        size: file.size,
        data: new Binary(file.buffer)
    };

    return result = await con.insertOne(img);
}

async function getImage(id) {
    if (!ObjectId.isValid(id)) {
        throw new InvalidIdError('Invalid image id');
    }

    const con = await db.getConnection(dbName);

    return await con.findOne({
        _id: new ObjectId(id)
    });
}

async function deleteImage(id) {
    if (!ObjectId.isValid(id)) {
        throw new InvalidIdError('Invalid image id');
    }

    const con = await db.getConnection(dbName);

    return await con.deleteOne({ 
        _id: new ObjectId(id)
    });
}

async function getImagesByDocId(docId) {
    if (!ObjectId.isValid(docId)) {
        throw new InvalidIdError('Invalid docId');
    }

    try {
        const con = await db.getConnection(dbName);
        return await con.find({ 
            doc_id: new ObjectId(docId) 
        }).toArray();
        
    } catch (err) {
        throw new DatabaseError('Database Error: Get Documents by user id');
    }
};

module.exports = {
    createImage,
    getImage,
    deleteImage,
    getImagesByDocId
};