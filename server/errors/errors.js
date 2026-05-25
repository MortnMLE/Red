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

class InvalidIdError extends Error {
    constructor(message) {
        super(message);
        this.name = 'INVALID_ID';
        this.statusCode = 400;
    }
}

module.exports = {
    ValidationError,
    DatabaseError,
    InvalidIdError
}