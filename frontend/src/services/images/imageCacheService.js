import { ImageCache } from '@/services/images/imageCache';
import { Validator } from '@/services/validator';
import { getLocalRecordsByIndex } from '@/services/indexedDB/indexedDbApi';
import { DB_IMAGES } from '@/constants/stores';

let imageCache = null;

// sets the imageCache module-level variable
export function setImageCache(obj) {
    // validate parameter
    Validator.validateObjectNotNull(obj);
    Validator.validateObjectType(obj, ImageCache);
   
    imageCache = obj;
}

// returns the reference of the the module-level variable
export function getImageCache() {
    return imageCache;
}

// frees the module-level variable
export function freeImageCache() {
    imageCache = undefined;
}

// creates cache entries for all passed images
// Expected: array[{id: string, file: File}]
export function createCacheEntriesForImages(images) {
    // validate parameter
    Validator.validateObjectNotNull(imageCache);
    Validator.validateArrEmptyAllowed(images);
    
    // populate urlCreations
    for (const image of images) {
        Validator.validateObjectNotNull(image);
        Validator.validateStringEmptyNotAllowed(image.id);
        Validator.validateObjectNotNull(image.file);

        imageCache.setUrl(image.id, image.file);
    }
}

// revokes all currently active entries in imageCache for docId
export async function revokeAllForDocId(docId) {
    // validate parameters
    Validator.validateStringEmptyNotAllowed(docId);
    Validator.validateObjectNotNull(imageCache);

    try {
        // fetch all images for given docId
        const images = await getLocalRecordsByIndex(
            DB_IMAGES,
            'docId',
            docId
        );

        // push individual ids to revokeUrls
        for (const image of images) {
            imageCache.revokeUrl(image.id);
        }    
    } catch (err) {
        console.warn('could not get local records for document id', err);
        return 0;
    }

    return 1;
}

// fetches all images for docId and creates new cache entries
export async function createCacheEntriesForDocument(docId) {
    // validate parameter
    Validator.validateStringEmptyNotAllowed(docId);
    Validator.validateObjectNotNull(imageCache);
   
    try {
        // fetch IndexedDB-images for document id
        const localImages = await getLocalRecordsByIndex(
            DB_IMAGES,
            'docId',
            docId
        );
        
        // validate that localImages is an array, may be empty
        Validator.validateArrEmptyAllowed(localImages);

        const urlCreationImages = [];

        // push individual objects to urlCreationImages
        for (const image of localImages) {
            urlCreationImages.push({
                id: image.id,
                file: image.file
            });
        }

        // create all Url objects and set them to imageCache
        await createCacheEntriesForImages(urlCreationImages);
    } catch (err) {
        console.warn('could not create cache entries', err);
        return 0;
    }

    return 1;
}