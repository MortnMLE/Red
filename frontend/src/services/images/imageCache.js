import { Validator } from "../validator";

export class ImageCache{
    constructor() {
        this.map = new Map();
    }

    replace(oldId, newId) {
        // validate parameters
        Validator.validateStringEmptyNotAllowed(oldId);
        Validator.validateStringEmptyNotAllowed(newId);

        // release existing URL
        const oldUrl = this.map.get(oldId);
        URL.revokeObjectURL(oldUrl);

        // delete old entry
        this.map.delete(oldId);
        // create new Entry with new URL
        this.setUrl(newId);
    }

    setUrls(arr) {
        // validate parameter, array of {id: string, blob: blob} expected
        Validator.validateArrEmptyNotAllowed(arr);

        // set entries
        for (const e of arr) {
            // skip if id already exists
            if (this.has(e.id)) { continue; }

            // create individual urls
            this.setUrl(e.id, e.blob);
        }
    }

    setUrl(id, file) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);
        Validator.validateObjectNotNull(file);

        // validate current map state
        if (this.map.has(id)) {
            throw new Error(`${id} already exists.`);
        }

        // create url
        const url = URL.createObjectURL(file);
        // set new entry 
        this.map.set(id, url);
    }

    has(id) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);

        // return result
        return this.map.has(id);
    }

    get(id) {
        // validate parameter, string expected
        Validator.validateArrEmptyNotAllowed(id);

        return this.map.get(id);
    }
}