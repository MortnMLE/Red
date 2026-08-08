import { describe, expect, test } from 'vitest';

import { Validator } from '@/services/validator';

describe('Validator', () => {
    describe('validateStringEmptyAllowed', () => {
        test('accepts a non-empty string', () => {
            expect(() => Validator.validateStringEmptyAllowed('hello')).not.toThrow();
        });

        test('accepts an empty string', () => {
            expect(() => Validator.validateStringEmptyAllowed('')).not.toThrow();
        });

        test('throws for null', () => {
            expect(() => Validator.validateStringEmptyAllowed(null))
                .toThrow('Input must not be null');
        });

        test('throws for undefined', () => {
            expect(() => Validator.validateStringEmptyAllowed(undefined))
                .toThrow('Input must not be null');
        });

        test('throws for non-string', () => {
            expect(() => Validator.validateStringEmptyAllowed(123))
                .toThrow('Input must be a string');
        });
    });

    describe('validateStringEmptyNotAllowed', () => {
        test('accepts a non-empty string', () => {
            expect(() => Validator.validateStringEmptyNotAllowed('hello')).not.toThrow();
        });

        test('throws for empty string', () => {
            expect(() => Validator.validateStringEmptyNotAllowed(''))
                .toThrow('Input must not be empty');
        });
    });

    describe('validateNumber', () => {
        test('accepts positive number', () => {
            expect(() => Validator.validateNumber(42)).not.toThrow();
        });

        test('accepts negative number', () => {
            expect(() => Validator.validateNumber(-42)).not.toThrow();
        });

        test('accepts zero', () => {
            expect(() => Validator.validateNumber(0)).not.toThrow();
        });

        test('accepts decimal', () => {
            expect(() => Validator.validateNumber(3.14)).not.toThrow();
        });

        test('throws for null', () => {
            expect(() => Validator.validateNumber(null))
                .toThrow('Input must not be null');
        });

        test('throws for undefined', () => {
            expect(() => Validator.validateNumber(undefined))
                .toThrow('Input must not be null');
        });

        test('throws for string', () => {
            expect(() => Validator.validateNumber('42'))
                .toThrow('Input must be a number');
        });

        test('throws for NaN', () => {
            expect(() => Validator.validateNumber(NaN))
                .toThrow('Input must be a number');
        });

        test('throws for Infinity', () => {
            expect(() => Validator.validateNumber(Infinity))
                .toThrow('Input must be finite');
        });

        test('throws for -Infinity', () => {
            expect(() => Validator.validateNumber(-Infinity))
                .toThrow('Input must be finite');
        });
    });

    describe('validateArrEmptyAllowed', () => {
        test('accepts empty array', () => {
            expect(() => Validator.validateArrEmptyAllowed([])).not.toThrow();
        });

        test('accepts populated array', () => {
            expect(() => Validator.validateArrEmptyAllowed([1, 2, 3])).not.toThrow();
        });

        test('throws for null', () => {
            expect(() => Validator.validateArrEmptyAllowed(null))
                .toThrow('Input must be an array');
        });

        test('throws for object', () => {
            expect(() => Validator.validateArrEmptyAllowed({}))
                .toThrow('Input must be an array');
        });

        test('throws for string', () => {
            expect(() => Validator.validateArrEmptyAllowed('abc'))
                .toThrow('Input must be an array');
        });
    });

    describe('validateArrEmptyNotAllowed', () => {
        test('accepts populated array', () => {
            expect(() => Validator.validateArrEmptyNotAllowed([1]))
                .not.toThrow();
        });

        test('throws for empty array', () => {
            expect(() => Validator.validateArrEmptyNotAllowed([]))
                .toThrow('Array must not be empty');
        });
    });

    describe('validateFile', () => {
        test('accepts File instance', () => {
            const file = new File(['content'], 'test.txt', { type: 'text/plain' });

            expect(() => Validator.validateFile(file)).not.toThrow();
        });

        test('throws for null', () => {
            expect(() => Validator.validateFile(null))
                .toThrow('File must not be null');
        });

        test('throws for plain object', () => {
            expect(() => Validator.validateFile({}))
                .toThrow('File must be of type File');
        });
    });

    describe('validateObjectNotNull', () => {
        test('accepts plain object', () => {
            expect(() => Validator.validateObjectNotNull({}))
                .not.toThrow();
        });

        test('throws for array', () => {
            expect(() => Validator.validateObjectNotNull([]))
                .toThrow();
        });

        test('throws for null', () => {
            expect(() => Validator.validateObjectNotNull(null))
                .toThrow('object must not be null or undefined');
        });

        test('throws for undefined', () => {
            expect(() => Validator.validateObjectNotNull(undefined))
                .toThrow('object must not be null or undefined');
        });

        test('throws for number', () => {
            expect(() => Validator.validateObjectNotNull(1))
                .toThrow('Input must be an object');
        });
    });

    describe('validateObjectType', () => {
        class Animal {};
        class Dog extends Animal {};
        class Car {};

        test('accepts correct type', () => {
            expect(() => Validator.validateObjectType(new Dog(), Dog))
                .not.toThrow();
        });

        test('accepts subclass as parent type', () => {
            expect(() => Validator.validateObjectType(new Dog(), Animal))
                .not.toThrow();
        });

        test('throws for incorrect type', () => {
            expect(() => Validator.validateObjectType(new Animal(), Car))
                .toThrow('object must be of type Car');
        });

        test('throws for null', () => {
            expect(() => Validator.validateObjectType(null, Dog))
                .toThrow('object must not be null or undefined');
        });
    });
});