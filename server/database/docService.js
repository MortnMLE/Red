const express = require('express');
const db = require('./connection');
const { ObjectId, MongoClient, UUID } = require('mongodb');
const BSON = require('BSON');
const { DatabaseError } = require('../errors/errors');

const dbName = 'documents';

async function createDoc(id, title, content) {

    try {
        const con = await db.getConnection(dbName); 
        const doc = {
            user_id: new ObjectId(id),
            title: title,
            content: content,
            version: 1
        }

        const result = await con.insertOne(doc);

        return result;

    } catch (err) {
        throw new (DatabaseError('Database Error: Document Creation'));        
    }
};

async function getDocsByUserId(id) {

    try {
        const con = await db.getConnection(dbName);

        return await con.find({ user_id: new ObjectId(id) }).toArray();
    } catch (err) {
        throw new DatabaseError('Database Error: Get Documents by user id');
    }
}

async function getDocById(id) {

    try {
        const con = await db.getConnection(dbName);
        
        return await con.findOne({ _id: new ObjectId(id) });

    } catch (err) {
        throw new DatabaseError('Database Error: Get Document');
    }
}

async function updateDocument(doc) {

    try {
        const con = await db.getConnection(dbName);
        
        con.updateOne(
            { _id: new ObjectId(doc._id) },
            {
                $set: { 
                    title: doc.title, 
                    content: doc.content, 
                    version: doc.version
                }
            }
        );

        return newVersion;

    } catch (err) {
        throw new DatabaseError('Database Error: Update Document');
    }
}

module.exports = {
    createDoc,
    getDocById,
    updateDocument,
    getDocsByUserId
};