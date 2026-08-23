const user = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/databaseService');
const { userDbName } = require('../constants');
const { createToken, createRefreshTokenSettings } = require('../utils/tokenUtils');
const { validate } = require('../utils/validate');

let refreshTokens = [];

// for testing
exports.getRefreshTokens = () => {
    return refreshTokens;
}

exports.clearRefreshTokens = () => {
    refreshTokens = [];
}

// TODO: ensure that an account does not already exists
exports.register = async (req, res) => { 
    try {
        const { username, password } = req.body;

        if (!validate([username, password])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        // hash password
        const salt = await bcrypt.genSalt(process.env.SALT);
        const hashPassword = await bcrypt.hash(password, salt);

        // create new user
        const newUser = user.create(username, hashPassword);

        const id = await db.insertOne(userDbName, newUser);
        
        // create tokens
        const authToken = createToken(id, process.env.JWT_AUTH_EXPIRES);
        const refreshToken = createToken(id, process.env.JWT_REFRESH_EXPIRES);

        // store for later validation
        refreshTokens.push(refreshToken);

        // attach cookie to response
        res.cookie('refreshToken', refreshToken, createRefreshTokenSettings());

        return res.status(200).json({ 
            id,
            success: true,
            token: authToken
        });
    } catch (error) {
        res.status(500).json({
            error,
            success: false
        });
    }
}

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!validate([username, password])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        existingUser = await db.getOne(userDbName, {username});

        if (await user.passwordIsEqual(password, existingUser.password)) {
            const authToken = createToken(existingUser._id, process.env.JWT_AUTH_EXPIRES);
            const refreshToken = createToken(existingUser._id, process.env.JWT_REFRESH_EXPIRES);

            refreshTokens.push(refreshToken);

            res.cookie('refreshToken', refreshToken, createRefreshTokenSettings());

            return res.status(200).json({ 
                token: authToken,
                success: true
            });
        } else {
            return res.status(400).json({
                error: 'INVALID_CREDENTIALS', 
                success: false
            });
        } 
    } catch (error) {
        res.status(500).json({
            error,
            success: false
        });
    }
}

exports.refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                success: false
            });
        }

        if (!refreshTokens.includes(refreshToken)) {
            return res.status(403).json({
                error: 'INVALID',
                success: false
            });
        }

        jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    error: 'INVALID',
                    success: false
                });
            }

            // check if I need additional checks
            const newAccessToken = createToken(decoded.sub, process.env.JWT_AUTH_EXPIRES);

            return res.status(200).json({ 
                token: newAccessToken,
                success: true
            });
        });
    } catch (error) {
        res.status(500).json({
            error,
            success: false
        });
    }
}