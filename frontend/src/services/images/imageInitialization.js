import { Validator } from "@/services/validator"

import { 
    addOrSetLocalRecord, 
    getLocalRecord,
} from "@/services/indexedDB/indexedDbApi";

import { 
    serverFetchImageIdsForDocuments, 
    serverFetchImagesForIds, 
    newServerImage 
} from "@/services/images/imageServerService";

import { Parser } from '@/services/parser';

import { 
    DB_IMAGES
} from "@/constants/stores";

export function getEmbeddedImageIds(documents, mapImageIdToDocId) {
    Validator.validateArrEmptyAllowed(documents);
    Validator.validateObjectType(mapImageIdToDocId, Map);

    let result = [];

    // search documents and match against regex
    for (const doc of documents) {
        // parse
        try {  
            // add the returned ids to result and set map entries
            const parser = new Parser();
            const ids = parser.parseImageIds(doc.content);

            for (const id of ids) {
                result.push(id);
                mapImageIdToDocId.set(id, doc.id);
            };
        } catch {
            continue;
        }
    }

    return result;
}

// Fetches all imageIds for documents that exist locally
export async function getServerImageIds(documents) {
    Validator.validateArrEmptyAllowed(documents);

    // if no documents exist return empty array
    if (documents.length === 0) {
        return {arr: [], serverWasReached: true};
    }

    // fetch imageIds that belong to the passed documents
    const result = await serverFetchImageIdsForDocuments(documents);

    Validator.validateObjectNotNull(result);

    if (!result.serverWasReached) {
        result.arr = [];
    } 

    return result;
}

// fetches images that do not exist locally from server
export async function fetchMissingImages(embeddedImageIds, serverImageIds) {
    // validate parameters
    Validator.validateArrEmptyAllowed(embeddedImageIds);
    Validator.validateArrEmptyAllowed(serverImageIds);

    const requests = [];

    for (const id of embeddedImageIds) {
        Validator.validateStringEmptyNotAllowed(id);

        // add the id to requests, if the local entry does not exist
        if (await requiresFetch(id, serverImageIds)) {
            requests.push(id);
        }
    }

    // if there is nothing to request exit the function
    if (requests.length === 0) {
        return [];
    }

    // fetch the image objects from the server
    return await serverFetchImagesForIds(requests);
}

export async function addServerImageToLocalStorage(image, docId) {
    Validator.validateObjectNotNull(image);
    Validator.validateStringEmptyNotAllowed(docId);

    try {
        // add blob to local indexedDB storage
        await addOrSetLocalRecord(
            DB_IMAGES,
            {
                id: image.id,
                file: image.image,
                name: image.name,
                userId: localStorage.getItem('userId'),
                docId,
            }
        );
    } catch {
        return 0;
    }
    return 1;
}

export async function requiresFetch(id, serverImageIds) {
    Validator.validateStringEmptyNotAllowed(id);
    Validator.validateArrEmptyAllowed(serverImageIds);

    let result = false;
    // if the image does not exist locally, but exists in the serverImages
    // we need to fetch it
    try {
        const existing = await getLocalRecord(DB_IMAGES, id);
        if (existing == null &&
            serverImageIds.includes(id)
        ){
            result = true;
        }
    } finally {
        return result;
    }
}

export async function postMissingImages(embeddedImageIds, serverImages) {
    Validator.validateArrEmptyAllowed(embeddedImageIds);
    Validator.validateArrEmptyAllowed(serverImages);

    if (embeddedImageIds.length === 0) {
        return [];
    }

    const result = await Promise.all(embeddedImageIds.map(async (id) => {
        // if the image exists on the server, do not post
        if (serverImages.includes(id)) {
            return;
        };

        try {
            // get the local image object
            const localImage = await getLocalRecord(DB_IMAGES, id);

            // if the image does not exist locally, it is a faulty embedding
            if (!localImage) {
                return;
            }

            // post to server and return entry containing the new id
            return {
                image: localImage,
                newId: await newServerImage(
                    localImage.docId,
                    localImage.name,
                    localImage.file
                )
            };
        } catch (err) {
            // if there is an error, we add undefined to the result
            return;
        }
    }));

    // filter out undefined objects and return result
    return result.filter(
        item => item !== undefined && item.newId !== undefined
    );
}