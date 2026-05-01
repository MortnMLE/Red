// Imports:
const express = require('express');
const db = require('./connection');
const { UUID, MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const { ValidationError, DatabaseError } = require('../errors/errors')

async function createUser(user) {
    try {
        //Hashing password
        user.password = await bcrypt.hash(user.password, 10);

        //Establish connection to collection 'users'
        const con = await db.getConnection('users'); 
        
        //Try insertion:
        return await con.insertOne(user);
    } catch (error) {
        throw new DatabaseError('Database Error: User Creation');
    }
}

async function getUser(username) {
    try {
        //Connect to user db and create query
        const con = await db.getConnection('users');
        const query = {
            user: username
        }

        //Execute query   
        return await con.findOne(query);
    } catch (error) {
        throw new DatabaseError('Database Error: Get User');
    }
}

async function deleteUser(user) {
    try {
        const con = await db.getConnection('user');
        const nonQuery = { user: user.user };
        return await con.deleteOne(nonQuery); 

    } catch (err) {
        throw new DatabaseError('Database Error: User Deletion');
    }
}

async function comparePassword(one, other) {
    return await bcrypt.compare(one, other);
}

module.exports = { 
    createUser,
    getUser,
    deleteUser,
    comparePassword
};