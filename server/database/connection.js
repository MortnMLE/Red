// Imports:
const { MongoClient } = require('mongodb');
//ServerApiVersion
const fs = require('fs/promises');
const path = require('path');

//File containing the connection string
const filePath = path.join(__dirname, 'connectionString.txt');
const dbName = 'main';
let client;
let db;

async function getConnectionString() {
    const data = await fs.readFile(filePath, 'utf8');
    const result = data.split(/\r?\n/)[0];
    return result;
}

async function connectDB() {
    if (!client) {
        const uri = await getConnectionString();
        client = new MongoClient(uri);
        
        const a = await client.connect();
        console.log(a);
        
        db = client.db(dbName);
    }
    return db;
}

async function getConnection(name) {
    const db = await connectDB();
    return db.collection(name);    
}

async function closeDB(con) {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

module.exports = {
    connectDB,
    getConnection,
    closeDB
}