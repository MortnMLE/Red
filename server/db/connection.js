const { MongoClient } = require('mongodb');

//File containing the connection string
const dbName = 'main';

let client;
let db;

//Creates MongoClient and connects to Atlas
async function connectDB() {
    if (!client) {
        client = new MongoClient(process.env.MONGODB);
        
        await client.connect();
        
        db = client.db(dbName);
    }
    return db;
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
    getConnection,
    closeDB
}