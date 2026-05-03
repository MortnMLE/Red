class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DB_ERROR';
        this.statusCode = 500;
    }
}

module.exports = {
    ValidationError,
    DatabaseError
}