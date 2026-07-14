import { Validator } from "../validator";

export class ImageCache{
    constructor() {
        // holds the image Cache entries, <id : string, URL>
        this.urlMap = new Map();
    }

    // delete imageCache entry and create new one for same url
    replace(oldId, newId) {
        // validate parameters
        Validator.validateStringEmptyNotAllowed(oldId);
        Validator.validateStringEmptyNotAllowed(newId);

        // fetch existing url
        const oldUrl = this.get(oldId);
       
        // in the case that the newId already exists, revoke the URL
        if (this.has(newId)) {
            this.revokeUrl(newId);
        }

        // delete the old id and create new cache entry with new id
        if (oldUrl) {
            this.urlMap.delete(oldId);
            this.urlMap.set(newId, oldUrl);
        }
    }

    // set multiple URLs
    // takes array of {id: string, blob: blob}
    setUrls(arr) {
        // validate parameter
        Validator.validateArrEmptyNotAllowed(arr);

        // set entries
        for (const e of arr) {
            // add the url to the cache if the entry for id does not exist yet
            if (!this.urlMap.has(e.id)) { 
                this.setUrl(e.id, e.blob);
            }
        }
    }

    // create objectUrl and set it to map
    setUrl(id, file) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);
        Validator.validateObjectNotNull(file);

        // create url
        const url = URL.createObjectURL(file);
       
        // check for an already existing cache entry
        const oldUrl = this.get(id);

        // set new entry 
        this.urlMap.set(id, url);
        
        // revoke existing url if it exists
        if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
        }
    }

    // returns true if the a Url exists for id
    has(id) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);

        // return result
        return this.urlMap.has(id);
    }

    // returns the Url for id
    get(id) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);

        return this.urlMap.get(id);
    }

    revokeUrls(arr) {
        // validate parameter
        Validator.validateArrEmptyAllowed(arr);
        
        // free individual Urls
        for (const id of arr) {
            // revoke individual id
            this.revokeUrl(id);
        }
    }

    // revokes Url for id and removes the entry from map
    revokeUrl(id) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);

        // fetch url from this.map
        const url = this.urlMap.get(id);
        
        // revoke and delete url, if it exists
        if (url) {
            URL.revokeObjectURL(url);
            this.urlMap.delete(id);
        }
    }
}