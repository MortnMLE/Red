import { Validator } from "../validator";

export class ImageCache{
    constructor() {
        this.map = new Map();
    }

    // delete imageCache entry and create new one for same blob
    replace(oldId, newId) {
        // validate parameters
        Validator.validateStringEmptyNotAllowed(oldId);
        Validator.validateStringEmptyNotAllowed(newId);

        // release existing URL
        const oldUrl = this.map.get(oldId);

        // revoke oldUrl
        if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
            this.map.delete(oldId);
        }

        // create new Entry with new URL
        this.setUrl(newId);
    }

    // set multiple URLs
    // takes array of {id: string, blob: blob}
    setUrls(arr) {
        // validate parameter
        Validator.validateArrEmptyNotAllowed(arr);

        // set entries
        for (const e of arr) {
            // skip if id already exists
            if (this.has(e.id)) { 
                continue; 
            }

            // create individual urls
            this.setUrl(e.id, e.blob);
        }
    }

    // create objectUrl and set it to map
    setUrl(id, file) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);
        Validator.validateObjectNotNull(file);

        // check for existing entry
        if (this.map.has(id)) {
            this.revokeUrl(id);
        }

        // create url
        const url = URL.createObjectURL(file);
        // set new entry 
        this.map.set(id, url);
    }

    // returns true if the a Url exists for id
    has(id) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);

        // return result
        return this.map.has(id);
    }

    // returns the Url for id
    get(id) {
        // validate parameter, string expected
        Validator.validateArrEmptyNotAllowed(id);

        return this.map.get(id);
    }

    revokeUrls(arr) {
        // validate parameter
        Validator.validateArrEmptyAllowed(arr);
        
        // return if the array is empty -> nothing to delete
        if (arr.length === 0) {
            return;
        }

        // free individual Urls
        for (const id of arr) {
            // validate individual id
            Validator.validateStringEmptyNotAllowed(id);
            this.revokeUrl(id);
        }
    }

    // revokes Url for id and removes the entry from map
    revokeUrl(id) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);

        // fetch url from this.map
        const url = this.map.get(id);
        
        // revoke url, if it exists
        if (url) {
            URL.revokeObjectURL(url);
        }
    }
}