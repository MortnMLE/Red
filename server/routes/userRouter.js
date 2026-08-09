const express = require('express');
const user = require('../db/userDbService');
const { DatabaseError } = require('../errors/errors');

//Variables:
const userRouter = express.Router();

//Authentication
userRouter.post('/auth', async (req, res) => {
    try {
        // Verify request
        if (typeof req.body.user !== 'string' || req.body.user === '' || 
            typeof req.body.password !== 'string' || req.body.password === ''
        ) {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'Invalid credentials provided by client',
                success: false
            });
        }

        // Fetch password
        const usr = await user.getUser(req.body.user);

        // check for existing user        
        if (usr == null) {
           return res.status(400).json({
            error: 'INVALID_CREDENTIALS',
            message: 'Wrong email or password',
            success: false
           });
        }

        // Compare
        const equal = await user.comparePassword(req.body.password, usr.password);

        // Return UUID
        if (equal) {
            return res.status(200).json({
                id: usr._id.toString(),
                success: true
            });
        } else {
            return res.status(400).json({
                error: 'INVALID_CREDENTIALS',
                message: '2. Wrong email or password',
                success: false
            });
        }

    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
});

//User Creation
userRouter.post('/', async (req, res) => {
    try {
        // Verify request
        if (typeof req.body.user !== 'string' || req.body.user === '' || 
            typeof req.body.password !== 'string' || req.body.password === ''
        ) {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid credentials provided by client',
                success: false
            });
        }
        
        // Check if user exists
        const existingUser = await user.getUser(req.body.user);

        if (existingUser != null) {
            return res.status(409).json({
                error: 'CONFLICT',
                message: 'User already exists',
                success: false
            });
        }

        // Create user
        const id = await user.createUser({
            user: req.body.user,
            password: req.body.password
        });

        // Return id
        return res.status(201).json({ 
            id: id.insertedId.toString(),
            success: true 
        });

    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
});

//User Deletion
userRouter.delete('/', async (req, res) => {
    try {
        // Verify request
        if (typeof req.body.user !== 'string' || req.body.user === '' || 
            typeof req.body.password !== 'string' || req.body.password === ''
        ) {
            return res.status(400).json({
                error: 'USER_VALIDATION_ERROR',
                message: 'invalid credentials provided by client' 
            });
        }
        
        const usr = await user.getUser(req.body.user);

        if (usr == null) {
            res.status(404).json({
                error: 'NOT_FOUND',
                message: 'invalid user provided by client'
            });
        }

        const equal = await user.comparePassword(usr.password, req.body.password);
        
        if (equal) {
            const result = await user.deleteUser(usr);
            return res.status(200).json('Successfully deleted user');
        } else {
            return res.status(401).json({
                error: 'NOT_AUTHORIZED',
                message: 'could not delete account'
            });
        }

    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }
});

module.exports = userRouter;