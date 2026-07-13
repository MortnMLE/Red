import { ImageCache } from './imageCache';
import { Validator } from '../validator';

let imageCache = null;

// sets the imageCache reference
export function setImageCache(obj) {
    // validate parameter
    Validator.validateObjectNotNull(obj);
    Validator.validateObjectType(obj, ImageCache);
    
    // assign reference to local imageCache
    imageCache = obj;
}

// initializes all imageCache for all elements in images. 
// Expected: array[{id: string, file: File}]
export async function createCacheEntriesForImages(images) {
    // validate parameter
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

// revokes all currently active 
export async function revokeAllForDocId(docId) {
    // validate parameters
    Validator.validateStringEmptyNotAllowed(docId);

    if (images.length === 0) {
        return;
    } 

    for (const image of images) {
        imageCache.revokeUrl(image._id);
    }
}

// fetches the document and creates Urls for all embedded images that exist locally
export async function createCacheEntriesForDocument(docId) {
    // validate parameter
    Validator.validateStringEmptyNotAllowed(docId);
    
    console.log(`initializeImageCacheForDocument called with docId: ${docId}`);

    // fetch IndexedDB-images for document id
    const images = await getLocalRecordsByIndex(
        DB_IMAGES,
        'doc_id',
        docId
    );

    // create all Url objects and set them to imageCache
    createCacheEntriesForImages(images);
}

export async function addImageToCache(imageId) {
    // validate parameter, not-empty string expected
    Validator.validateStringEmptyNotAllowed(imageId);

    console.log(`setImageToCache called with: ${imageId}`);

    if (imageCache.has(imageId)) {
        return;
    }

    const imageObject = await getLocalRecord(DB_IMAGES, imageId);

    if (!imageObject) {
        console.error(`local image: ${imageId} not found`);
        return;
    }

    imageCache.setUrl(imageId);
}