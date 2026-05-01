/*
idea for handling documents:
Frontend: Stores the document into indexedDB
-> Debounce -> Wait until the user stops (e.g. for 500 to 2000 ms)
    - user stops
    - on blur (user leaves editor)
    - on navigation / tab close
    - periodic autosave
-> Throttle -> Ensure saves happen only every X seconds
-> Silent Saves -> user is not notified of a save, errors are handled silently
-> use a version or updatedAt field (ensure that the local version can be compared
to the version on the server.)

Backend:

*/

//Imports:
const express = require('express');
const db = require('./connection');
const { UUID, MongoClient } = require('mongodb');
const BSON = require('BSON');
const DatabaseError = require('../errors/errors');

// 
async function createDoc(id, title, content) {
    try {
        const con = await db.getConnection('documents'); 
        const doc = {
            user_id: id,
            title: title,
            content: content,
            version: null
        }

        const result = await con.insertOne(doc);

        return result;

    } catch (err) {
        throw new (DatabaseError('Database Error: Document Creation'));        
    }
};

async function getDocById(id) {
    try {
        const con = await db.getConnection('documents');
        const query = {
            _id: id
        }

        return await con.findOne(query);

    } catch (err) {
        throw new DatabaseError('Database Error: Get Document');
    }
}

async function updateDocument(doc) {
    try {
        const con = await db.getConnection('documents');
        db.updateOne(
            { uuid: doc.uuid },
            {
                $set: { 
                    'title': doc.title, 
                    'content': doc.content, 
                    'version': doc.version
                }
            }
        );
    } catch (err) {
        throw new DatabaseError('Database Error: doc.update');
    }
}

module.exports = {
    createDoc,
    getDocById,
    updateDocument
};