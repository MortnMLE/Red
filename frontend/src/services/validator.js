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
        if (typeof str !== 'string') {
            throw new Error('Input must be a string');
        }

        if (!str) {
            throw new Error('Input must not be null');
        }
    }

    // validates a number. Number may be 0
    static validateNumber(num) {
        if (typeof num !== 'number') {
            throw new Error('Input must be a number');
        }

        if (!num) {
            throw new Error('Input must not be null');
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
        if (!arr) {
            throw new Error('Array must not be null');
        }
    }

    // validates an object of type File.
    static validateFile(file) {
        if (!file instanceof File) {
            throw new Error('File must be of type File');
        }

        if (!file) {
            throw new Error('File must not be null');
        }
    }

    // validates an object. Must not be null
    static validateObjectNotNull(obj) {
        if (!obj) {
            throw new Error('object must not be null');
        }
    }

    static validateObjectType(obj, type) {
        if (!obj instanceof type) {
            throw new Error(`object must be of type ${type}`);
        }
    }
}