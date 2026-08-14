const db = require('./connection');

async function insertOne(dbname, obj) {
    const con = await db.getConnection(dbname);

    return await con.insertOne(obj);
}

async function getAll(dbname, query) {
    const con = await db.getConnection(dbname);

    return await con.find(query);
}

async function getOne(dbname, query) {
    const con = await db.getConnection(dbname);

    return await con.findOne(query);
}

async function update(dbname, query) {
    const con = await db.getConnection(dbname);

    return await con.updateOne(query);
}

async function deleteOne(dbname, query) {
    const con = await db.getConnection(dbname);

    return await con.deleteOne(query);
}

async function deleteAll(dbname, query) {
    const con = await db.getConnection(dbname);

    return await con.delete(query);
}

module.exports = {
    insertOne,
    getAll,
    getOne,
    update,
    deleteOne,
    deleteAll
};