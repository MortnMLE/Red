// Imports:
const express = require('express');
const db = require('./connection');
const { UUID, MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const {ValidationError, DatabaseError} = require('../errors/errors')

async function createUser(user) {
    //Verify parameters
    if (typeof user !== 'object' || user === null) {
        throw new ValidationError('Invalid credentials');
    }

    //Hashing password
    user.password = await bcrypt.hash(user.password, 10);

    //Establish connection to collection 'users'
    const con = await db.getConnection('users'); 
    
    //Try insertion:
    try {
        return await con.insertOne(user);
    } catch (error) {
        throw new DatabaseError('Database Error: User Creation');
    }
}

async function getUser(username) {
    //Verifying parameters
    if (typeof username !== 'string' || username.trim() === '') {
        throw new ValidationError('Validation Error: Get User');
    }

    //Connect to user db and create query
    const con = await db.getConnection('users');
    const query = {
        user: username
    }

    //Execute query  
    try {
        return await con.findOne(query);
    } catch (error) {
        throw new DatabaseError('Database Error: Get User');
    }
}

async function deleteUser(user) {
    if (typeof user !== 'object' || user === null) {
        throw new ValidationError('Validation Error: User Deletion');
    }

    try {
        const con = await db.getConnection('user');
        const nonQuery = { user: user.user };
        return await con.deleteOne(nonQuery); 

    } catch (err) {
        throw new DatabaseError('Database Error: User Deletion');
    }
}

async function comparePassword(given, is) {
    //Verifying parameters
    if (typeof given !== 'string' || given === '' || 
        typeof is !== 'string' || is === ''
    ) {
        throw new ValidationError('Validation Error: Password Check');
    }

    return await bcrypt.compare(is, given);
}

module.exports = { 
    createUser,
    getUser,
    deleteUser,
    comparePassword
};