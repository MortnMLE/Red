const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    let token = null;
    if (authHeader != null) {
        token = authHeader.split(' ')[1];
    }

    if (!token ||
        token === 'undefined' ||
        token === 'null'
    ) {
        return res.status(401).json({ message: 'Token missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded.sub;
        next();
    });
}