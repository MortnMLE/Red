export class Validator{
    // Validates a string. String must not be empty
    static validateStringEmptyNotAllowed(str) {
        this.validateStringEmptyAllowed(str);

        if (str === '') {
            throw new Error('Input must not be empty');
        }
    }

    // validates a string. String may be empty
    static validateStringEmptyAllowed(str) {
        if (str == null) {
            throw new Error('Input must not be null');
        }

        if (typeof str !== 'string') {
            throw new Error('Input must be a string');
        }
    }

    // validates a number. Number may be 0
    static validateNumber(num) {
        if (num == null) {
            throw new Error('Input must not be null');
        }

        if (typeof num !== 'number') {
            throw new Error('Input must be a number');
        }

        if (Number.isNaN(num)) {
            throw new Error('Input must be a number');
        }

        if (!Number.isFinite(num)) {
            throw new Error('Input must be finite');
        }
    }
    
    // validates an array. Array must not be empty
    static validateArrEmptyNotAllowed(arr) {
        this.validateArrEmptyAllowed(arr);
        
        if (arr.length === 0) {
            throw new Error('Array must not be empty');
        }
    }

    // validates an array. Array may be empty
    static validateArrEmptyAllowed(arr) {
        if (!Array.isArray(arr)) {
            throw new Error('Input must be an array');
        }
    }

    // validates an object of type File.
    static validateFile(file) {
        if (file == null) {
            throw new Error('File must not be null');
        }

        if (!(file instanceof File)) {
            throw new Error('File must be of type File');
        }
    }

    // validates an object. Must not be null
    static validateObjectNotNull(obj) {
         if (obj == null) {
            throw new Error('object must not be null or undefined');
        }

        if (typeof obj !== 'object' || Array.isArray(obj)) {
            throw new Error('Input must be an object');
        }
    }

    // validates if the passed obj of Type type
    static validateObjectType(obj, type) {
        this.validateObjectNotNull(obj);

        if (!(obj instanceof type)) {
            throw new Error(`object must be of type ${type.name}`);
        }
    }
}