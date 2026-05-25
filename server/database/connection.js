const { MongoClient } = require('mongodb');
const fs = require('fs/promises');
const path = require('path');
const { DatabaseError } = require('../errors/errors');

//File containing the connection string
const filePath = path.join(__dirname, 'connectionString.txt');
const dbName = 'main';

let client;
let db;

//Reads the connection string from a text file on the server
async function getConnectionString() {
    const data = await fs.readFile(filePath, 'utf8');
    const result = data.split(/\r?\n/)[0];
    return result;
}

//Creates MongoClient and connects to Atlas
async function connectDB() {
    if (!client) {
        const uri = await getConnectionString();
        client = new MongoClient(uri);
        
        const a = await client.connect();
        
        db = client.db(dbName);
    }
    return db;
}

//Returns a connection to the individual collection in Atlas
async function getConnection(name) {
    if (typeof name !== 'string' || name === null) {
        throw new ValidationError('Validation Error: Get Connection');
    }

    const db = await connectDB();
    return db.collection(name);    
}

//Closes the connection to Atlas
async function closeDB(con) {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

//Exports
module.exports = {
    connectDB,
    getConnection,
    closeDB
}