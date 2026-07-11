import { ImageCache } from './imageCache';
import { Validator } from '../validator';

let imageCache = null;

export function setImageCache(obj) {
    // validate parameters
    Validator.validateObjectNotNull(obj);
    Validator.validateObjectType(obj, ImageCache);
    
    // assign reference to local imageCache
    imageCache = obj;
}

// initializes all imageCache for all elements in images. 
// Expected: array[{id: string, file: File}]
export async function createCacheEntriesForImages(images) {
    Validator.validateObjectNotNull(imageCache);
    Validator.validateArrEmptyAllowed(images);

    // exit if localImages is empty
    if (images.length === 0) {
        return;
    }
    
    // arr[{id: string, file: File}] for later setUrls call
    const urlCreations = [];

    // populate urlCreations
    for (const image of images) {
        Validator.validateObjectNotNull(image);
        Validator.validateStringEmptyNotAllowed(image._id);
        Validator.validateObjectNotNull(image.file);
        Validator.validateObjectType(image.file, File);

        urlCreations.push({
            id: image._id,
            blob: image.file 
        });
    }

    // call setUrls
    imageCache.setUrls(urlCreations);
}