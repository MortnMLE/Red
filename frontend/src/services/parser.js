import { Validator } from "./validator";

export class Parser {
    constructor () {
        this.regexImage = /!\[(image)\]\((.*?)\)/g;
        this.regexDocument = /!\[(document)\]\((.*?)\)/g;

    }

    // returns all ids of all embedded images
    parseImageIds(str) {
        // validate input
        Validator.validateStringEmptyAllowed(str);

        const ids = this.parseId(str, this.regexImage);
        return ids;
    }

    // returns all link embedded in images
    parseDocumentIds(str) {
        // validate input
        Validator.validateStringEmptyAllowed(str);

        const docs = this.parseId(str, this.regexDocument);
        return docs;
    }

    // parses for IDs given passed regex
    parseId(str, regex) {
        // validate
        Validator.validateStringEmptyAllowed(str);

        // initialize result
        const result = [];

        // parse and push matches
        for (const match of str.matchAll(regex)) {
            if (match[2] != null)
                result.push(match[2]);
        }

        return result;
    }
}