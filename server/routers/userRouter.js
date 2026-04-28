//Imports:
const express = require('express');
const BSON = require('BSON');
const user = require('../database/userService');
const { ValidationError, DatabaseError } = require('../error/error');

//Variables:
const userRouter = express.Router();

//Authentication
userRouter.post('/auth', async (req, res) => {
    try {
        // Verify request
        if (typeof req.body.user !== 'string' || req.body.user === '' || 
            typeof req.body.password !== 'string' || req.body.password === ''
        ) {
            res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid credentials provided by client'
            });
            return;
        }

        // Fetch password
        const usr = await user.getUser(req.body.user);
        // check for existing user        
        if (usr == null) {
           res.status(401).json({
            error: 'INVALID_CREDENTIALS',
            message: 'unknown user'
           });
           return;
        }

        // Compare
        const equal = await user.comparePassword(usr.password, req.body.password);
        if (equal) {
            res.status(200).json('Authentication successful');
            return;
        } else {
            res.status(400).json({
                error: 'INVALID_CREDENTIALS',
                message: 'invalid credentials provided by client'
            });
            return;
        }

    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
        return;
    }
});

//User Creation
userRouter.post('/', async (req, res) => {
    try {
        // Verify request
        if (typeof req.body.user !== 'string' || req.body.user === '' || 
            typeof req.body.password !== 'string' || req.body.password === ''
        ) {
            res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid credentials provided by client'
            });
            return;
        }
        
        // Check if user exists
        const existingUser = await user.getUser(req.body.user);

        if (existingUser != null) {
            res.status(409).json({
                error: 'CONFLICT',
                message: 'User already exists'
            });
            return;
        }

        // Create user
        const id = await user.createUser({
            user: req.body.user,
            password: req.body.password
        });

        // Return id
        return res.status(201).json({ id });

    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
        return;
    }

    res.status(500).json({
        error: 'UNKNOWN',
        message: 'unkown error in userRouter.POST'
    });
});

//User Deletion
userRouter.delete('/', (req, res) => {
    try {
        // Verify request
        if (typeof req.body.user !== 'string' || req.body.user === '' || 
            typeof req.body.password !== 'string' || req.body.password === ''
        ) {
            res.status(400).json({
                error: 'USER_VALIDATION_ERROR',
                message: 'invalid credentials provided by client' 
            });
            return;
        }
        
        const usr = user.getUser(req.body.user);
        const equal = await user.comparePassword(usr.password, req.body.password);
        
        if (equal) {
            const result = deleteUser(usr);
            res.status(200).json('Successfully deleted user');
            return;
        }

    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }
});

module.exports = userRouter;