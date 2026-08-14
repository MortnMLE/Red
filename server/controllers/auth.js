const user = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const database = require('../db/databaseService');
const { userDbName } = require('../constants');
const { createToken, createRefreshTokenSettings } = require('../utils/tokenUtils');
const { create } = require('./imageController');

const refreshTokens = [];

exports.register = async (req, res) => {
    const { username, password } = req.body;

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    try {
        // create new 
        const newUser = user.create(username, hashPassword);

        const id = await database.insertOne(userDbName, newUser);
        
        const authToken = createToken(id, process.env.JWT_AUTH_EXPIRES);
        const refreshToken = createToken(id, process.env.JWT_REFRESH_EXPIRES);

        refreshTokens.push(refreshToken);

        res.cookie('refreshToken', refreshToken, createRefreshTokenSettings());

        res.status(200).json({ 
            id,
            token: authToken 
        });
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
}

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        existingUser = await database.getOne(userDbName, {username});

        if (user.passwordIsEqual(password, existingUser.password)) {
            const authToken = createToken(existingUser._id, process.env.JWT_AUTH_EXPIRES);
            const refreshToken = createToken(existingUser._id, process.env.JWT_REFRESH_EXPIRES);

            refreshTokens.push(refreshToken);

            res.cookies('refreshToken', refreshToken, createRefreshTokenSetting());

            return res.status(200).json({ token: authToken });
        } else {
            return res.status(400).json({
                error: 'INVALID_CREDENTIALS', 
                message: 'Wrong email or password',
                success: false
            });
        }
        
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
}

exports.refresh = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token missing' });
    }

    if (!refreshTokens.includes(refreshToken)) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }

    jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        // check if I need additional checks
        const newAccessToken = createToken(decoded.sub, process.env.JWT_AUTH_EXPIRES);

        return res.status(200).json({ token: newAccessToken });
    });
}