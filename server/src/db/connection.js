const { MongoClient } = require('mongodb');
const { userDbName, imageDbName, documentDbName } = require('../constants');

function getDbName() {
    return process.env.RUN_INTEGRATION_TESTS === '1'
        ? process.env.MONGODB_TEST_DB || 'main'
        : process.env.MONGODB_DB || 'main';
}

let client;
let db;

//Creates MongoClient and connects to Atlas
async function connectDB() {
    if (!client) {
        client = new MongoClient(process.env.MONGODB);
        
        await client.connect();
        
        db = client.db(getDbName());
    }
    return db;
}

async function initializeDB() {
    const database = await connectDB();
    const { databases } = await client.db('admin').admin().listDatabases({
        nameOnly: true,
        filter: { name: database.databaseName },
    });

    if (!databases.some(({ name }) => name === database.databaseName)) {
        for (const collectionName of [userDbName, imageDbName, documentDbName]) {
            await database.createCollection(collectionName);
        }
    }

    return database;
}

//Returns a connection to the individual collection in Atlas
async function getConnection(name) {
    if (typeof name !== 'string' && name !== '') {
        throw new Error('EMPTY_DBNAME');
    }

    const db = await connectDB();
    return db.collection(name);
}

//Closes the connection to Atlas
async function closeDB() {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

//Exports
module.exports = {
    connectDB,
    initializeDB,
    getConnection,
    closeDB
}