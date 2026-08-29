const jwt = require('jsonwebtoken');

exports.createToken = (sub, expiresIn) => {
    return jwt.sign(
        { sub },
        process.env.JWT_SECRET,
        { expiresIn }
    );
}

exports.createRefreshTokenSettings = () => {
    return {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        // 7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
        maxAge: process.env.MAX_AGE * 24 * 60 * 60 * 1000
    };
}