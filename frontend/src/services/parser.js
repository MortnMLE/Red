import { Validator } from "./validator";

export class Parser {
    static regexImage = /!\[(.*?)\]\((.*?)\)/g
    static regexLink = /!\[(.*?)\]\((.*?)\)/g; // fix later

    // returns all ids of all embedded images
    static parseImageIds(str) {
        const ids = this.parseId(str, this.regexImage);
        return ids;
    }

    // returns all link embedded in images
    static parseLinkIds(str) {
        const links = this.parseId(str, this.regexLink);
        return links;
    }

    // parses individual string given passed regex
    static parseId(str, regex) {
        // validate
        Validator.validateStringEmptyAllowed(str);

        // initialize result
        const result = [];

        // parse and push matches
        for (const match of str.matchAll(regex)) {
            result.push(match[2]);
        }

        return result;
    }
}