import { Validator } from "./validator";

export class Parser {
    constructor() {
        this.regexImage = /!\[(.*?)\]\((.*?)\)/g;
        this.regexLink = /!\[(.*?)\]\((.*?)\)/g; // change later
    }

    // returns all ids of all embedded images
    static parseImages(str) {
        const ids = parse(str, regexImage);
        return ids;
    }

    // returns all link embedded in images
    static parseLinks(str) {
        const links = parse(str, regexLink);
        return links;
    }

    static parse(str, regex) {
        Validator.validateStringEmptyAllowed(str);

        const result = [];

        for (const match of str.matchAll(regex)) {
            result.push(match[2]);
        }

        return result;
    }
}