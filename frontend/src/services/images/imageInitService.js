import { Validator } from "@/services/validator"
import { 
    addOrSetLocalRecord, 
    deleteLocalRecord, 
    getLocalRecord,
    localEntryExists
} from "@/services/indexedDB/indexedDbService";
import { serverFetchImageIdsForDocuments, serverFetchImagesForIds, newServerImage } from "@/services/images/imageServerService";
import { Parser } from '@/services/parser';
import { 
    DB_DOCUMENTS,
    DB_IMAGES
} from "@/constants/stores";
import { ImageCache } from "./imageCache";

// collects all embedded images from local documents
// returns {id: string, doc_id: string}
export function getEmbeddedImageIds(documents, imageIdToDocId) {
    // validate parameter
    Validator.validateArrEmptyAllowed(documents);
    Validator.validateObjectType(imageIdToDocId, Map);

    // initialize result
    const result = [];

    // if no documents exist return empty array
    if (documents.length === 0) {
        return result;
    }

    // search documents and match against regex
    for (const doc of documents) {
        // parse
        const ids = Parser.parseImageIds(doc.content);

        // add the returned ids to result and set map entries
        for (const id of ids) {
            result.push(id);
            imageIdToDocId.set(id, doc._id)
        }
    }

    return result;
}

// Fetches all imageIds for documents that exist locally
export async function getServerImageIds(documents) {
    // validate parameter
    Validator.validateArrEmptyAllowed(documents);

    // if no documents exist return empty array
    if (documents.length === 0) {
        return {arr: [], serverWasReached: true};
    }

    // fetch imageIds that belong to the passed documents
    // result: { tasks: string[], serverWasReached: boolean }
    const result = await serverFetchImageIdsForDocuments(documents);

    Validator.validateObjectNotNull(result);

    if (!result.serverWasReached) {
        return {arr: [], serverWasReached: true};
    } 

    return result;
}

// fetches images that do not exist locally from server
export async function fetchMissingImages(embeddedImageIds, serverImageIds, imageCache, imageIdToDocId) {
    // validate parameters
    Validator.validateArrEmptyAllowed(embeddedImageIds);
    Validator.validateArrEmptyAllowed(serverImageIds);
    Validator.validateObjectNotNull(imageCache);
    Validator.validateObjectType(imageCache, ImageCache);
    Validator.validateObjectType(imageIdToDocId, Map);

    // if requiredImages is empty no further work is needed
    if (embeddedImageIds.length === 0) {
        console.log(`embeddedImages.length = 0`);
        return;
    }

    const requests = [];
    const requestedImageIds = [];

    for (const id of embeddedImageIds) {
        Validator.validateStringEmptyNotAllowed(id);

        // add the id to requests, if the local entry does not exist
        if (await requiresFetch(id, serverImageIds)) {
            console.log(`pushing fetch for ${id}`);
            requestedImageIds.push(id)
            requests.push(id);
        } 
    }

    // if there is nothing to request exit the function
    if (requests.length === 0) {
        console.log(`zero requests`);
        return;
    }

    // fetch the image objects from the server
    const serverImages = await serverFetchImagesForIds(requests);
    console.log(`serverImages fetched: ${serverImages.length}`);

    Validator.validateArrEmptyAllowed(serverImages);

    for (let i = 0; i < serverImages.length; i++) {
        console.log(`adding image to local: ${requestedImageIds[i]}`);
        await addServerImageToLocalStorage(
            serverImages[i], 
            requestedImageIds[i], 
            imageIdToDocId.get(serverImages[i])
        );
    }
}

async function addServerImageToLocalStorage(image, id, docId) {
    Validator.validateObjectNotNull(image);
    Validator.validateStringEmptyNotAllowed(id);

    console.log(`addServerImageToLocalStorage has been called`);
    // skip if server responded is not ok
    if (!image.ok) {
        return;
    }

    // get the blob
    const blob = await image.blob();

    console.log(`blob: ${blob}`);

    // add blob to local indexedDB storage

    console.log(`addServerImageToLocalStorage: ${id}`);
    console.log(`file: ${typeof blob}`);
    console.log(`headers: ${image.headers}`);
    console.log(`doc_id: ${docId}`);

    for (const [key, value] of image.headers.entries()) {
        console.log(key, value);
    }

    console.log(`${image.headers.get('Content-Disposition')}`);

    await addOrSetLocalRecord(
        DB_IMAGES,
        {
            _id: id,
            file: blob,
            name: image.headers
                .get('Content-Disposition')
                ?.match(/filename="(.+)"/)?.[1] ?? '',
            user_id: localStorage.userId,
            doc_id: docId
        }
    );
}

async function requiresFetch(id, serverImageIds) {
    Validator.validateStringEmptyNotAllowed(id);
    Validator.validateArrEmptyAllowed(serverImageIds);
    let result = false;

    if (
        // if the image does not exist locally, but exists in the serverImages
        // we need to fetch it
        !(await localEntryExists(DB_IMAGES, id)) &&
        serverImageIds.includes(id)
    ){
        result = true;
    }

    return result;
}

// posts images to server if they are missing or the current image
// is temporary and has no valid id
export async function syncFromLocalToServer(embeddedImageIds, serverImages, 
    activeDocument, udpateEditorContent, imageCache
) {
    console.log(`syncFromLocalToServer: ${embeddedImageIds}`); // delete later
    console.log(`serverImages: ${serverImages}`); // delete later
    console.log(`activeDocument: ${activeDocument.id}`); // delete later

    // validate parameters
    Validator.validateArrEmptyAllowed(embeddedImageIds);
    Validator.validateArrEmptyAllowed(serverImages);
    Validator.validateObjectNotNull(imageCache);

    // if embeddedImages is empty, no work is needed
    if (embeddedImageIds.length === 0) {
        return;
    }

    // create array of objects for later processing
    // array of { image, newId }
    const tasks = [];
    const requestedImages = [];

    for (const id of embeddedImageIds) {
        // if serverImages includes the image id, image is already on the server
        if (serverImages.includes(id)) {
            continue;
        }

        // fetch image from local storage
        const localImage = await getLocalRecord(DB_IMAGES, id);

        // if no image object was returned, it is a faulty embedding
        if (!localImage) {
            continue;
        }

        requestedImages.push(localImage);
        // create asynchronous posts to server
        tasks.push(
            newServerImage(
                localImage.doc_id,
                localImage.name,
                localImage.file
            )
        );
    }

    // // wait for all requests to finish
    const newIds = await Promise.all(tasks);

    if (newIds.length != requestedImages.length) {
        throw new Error(`should be the same length: ${newIds.length}, ${requestedImages.length}`);
    }

    // loop through all tasks
    // key contains old imageId, value contains the new imageId
    for (let i = 0; i < requestedImages.length; i++) {
        // if newId is null or empty, the post to server was not successful, we continue
        if (!newIds[i]) {
            continue;
        }

        // validate
        Validator.validateStringEmptyNotAllowed(requestedImages[i]._id)
        Validator.validateStringEmptyNotAllowed(requestedImages[i].doc_id);
        Validator.validateObjectNotNull(requestedImages[i].file);
        Validator.validateStringEmptyAllowed(requestedImages[i].name);

        // create new image entry in local storage
        await addOrSetLocalRecord(
            DB_IMAGES,
            {
                _id: newIds[i],
                file: requestedImages[i].file,
                name: requestedImages[i].name,
                doc_id: requestedImages[i].doc_id,
                user_id: localStorage.userId
            }
        );

        // if the document in question is currently active, update editor content
        if (activeDocument._id === requestedImages.doc_id) {
            // replace the oldId with the newId
            const newContent = activeDocument.content.replace(
                requestedImages[i]._id,
                newIds[i] 
            );

            // update editor content
            udpateEditorContent(newContent);

            // replace existing URL
            imageCache.replaceId(requestedImages[i]._id, newIds[i]);
        // for other documents replace the id in the stored document entry
        } else {
            // fetch local document from storage
            const doc = await getLocalRecord(DB_DOCUMENTS, requestedImages[i].doc_id);
            
            // if doc is null continue, as it has been deleted during the server request
            if (!doc) {
                continue;
            }

            // replace oldId with newId for fetched local document
            doc.content = doc.content.replace(requestedImages[i]._id, newIds[i]);

            // save the new document state to local storage
            await addOrSetLocalRecord(DB_DOCUMENTS, doc);
        }

        // delete old image entry from local storage
        await deleteLocalRecord(DB_IMAGES, requestedImages[i]._id);
    }
}