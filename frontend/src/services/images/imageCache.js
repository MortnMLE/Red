import { Validator } from "@/services/validator";

export class ImageCache{
    constructor() {
        // holds the image Cache entries, <id : string, URL>
        this.urlMap = new Map();
    }

    // delete imageCache entry and create new one for same url
    replaceId(oldId, newId) {
        // validate parameters
        Validator.validateStringEmptyNotAllowed(oldId);
        Validator.validateStringEmptyNotAllowed(newId);

        if (oldId === newId) {
            return;
        }

        // fetch existing url
        const oldUrl = this.getUrl(oldId);
       
        // in the case that the newId already exists, revoke the URL
        if (this.hasUrl(newId)) {
            this.revokeUrl(newId);
        }

        // delete the old id and create new cache entry with new id
        if (oldUrl) {
            this.urlMap.delete(oldId);
            this.urlMap.set(newId, oldUrl);
        }
    }

    // set multiple URLs
    // takes array of {id: string, file: File}
    setUrls(arr) {
        // validate parameter
        Validator.validateArrEmptyNotAllowed(arr);

        // set entries
        for (const e of arr) {
            // add the url to the cache if the entry for id does not exist yet
            if (!this.hasUrl(e.id)) { 
                this.setUrl(e.id, e.file);
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
        const oldUrl = this.getUrl(id);

        // set new entry 
        this.urlMap.set(id, url);
        
        // revoke existing url if it exists
        if (oldUrl) {
            this.revokeUrl(oldUrl);
        }
    }

    // returns true if the a Url exists for id
    hasUrl(id) {
        // validate parameter, string expected
        Validator.validateStringEmptyNotAllowed(id);

        // return result
        return this.urlMap.has(id);
    }

    // returns the Url for id
    getUrl(id) {
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
        const url = this.getUrl(id);
        
        // revoke and delete url, if it exists
        if (url) {
            URL.revokeObjectURL(url);
            this.urlMap.delete(id);
        }
    }
}