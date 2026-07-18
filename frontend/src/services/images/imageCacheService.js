import { ImageCache } from '@/services/images/imageCache';
import { Validator } from '@/services/validator';
import { getLocalRecordsByIndex } from '@/services/indexedDB/indexedDbService';
import { DB_IMAGES } from '@/constants/stores';

let imageCache = null;

// sets the imageCache reference
export function setImageCache(obj) {
    // validate parameter
    Validator.validateObjectNotNull(obj);
    Validator.validateObjectType(obj, ImageCache);
    
    // assign reference to local imageCache
    imageCache = obj;
}

// creates cache entries for all passed images
// Expected: array[{id: string, file: File}]
export function createCacheEntriesForImages(images) {
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
        Validator.validateStringEmptyNotAllowed(image.id);
        Validator.validateObjectNotNull(image.file);

        urlCreations.push({
            id: image.id,
            file: image.file
        });
    }

    // call setUrls
    if (urlCreations.length > 0) {
        imageCache.setUrls(urlCreations);
    }
}

// revokes all currently active 
export async function revokeAllForDocId(docId) {
    // validate parameters
    Validator.validateStringEmptyNotAllowed(docId);
    Validator.validateObjectNotNull(imageCache);

    // fetch all images for given docId
    const images = await getLocalRecordsByIndex(
        DB_IMAGES,
        'doc_id',
        docId
    );

    // validate that images is an array, may be empty
    Validator.validateArrEmptyAllowed(images);

    const revokeUrls = [];

    // push individual ids to revokeUrls
    for (const image of images) {
        revokeUrls.push(image._id);
    }

    // free all in revokeUrls
    if (revokeUrls.length > 0) {
        imageCache.revokeUrls(revokeUrls);
    }
}

// fetches all images for docId and creates new cache entries
export async function createCacheEntriesForDocument(docId) {
    // validate parameter
    Validator.validateStringEmptyNotAllowed(docId);
    Validator.validateObjectNotNull(imageCache);
    
    // fetch IndexedDB-images for document id
    const localImages = await getLocalRecordsByIndex(
        DB_IMAGES,
        'doc_id',
        docId
    );
    
    // validate that localImages is an array, may be empty
    Validator.validateArrEmptyAllowed(localImages);

    const urlCreationImages = [];

    // push individual objects to urlCreationImages
    for (const image of localImages) {
        urlCreationImages.push({
            id: image._id,
            file: image.file
        });
        console.log(`pushed to urlCreationImages: ${image._id}`);
    }

    // create all Url objects and set them to imageCache
    await createCacheEntriesForImages(urlCreationImages);
}