import { endpointGetImageidsForDocId, endpointImageGetById } from "@/constants/endpoints";
import { Validator } from "../validator"
import { addOrSetLocalRecord, DB_DOCUMENTS, DB_IMAGES, deleteLocalRecord, getLocalRecord } from "../indexedDB/indexedDbService";
import { newServerImage } from "./imageServerService";
import { Parser } from '../parser/';

// collects all embedded images from local documents
// returns {id: string, doc_id: string}
export function getEmbeddedImages(documents) {
    // validate parameter
    Validator.validateArrEmptyAllowed(documents);

    // initialize result
    const result = [];

    // if no documents exist return empty array
    if (documents.length === 0) {
        return result;
    }

    // search documents and match against regex
    for (const doc of documents) {
        // parse
        const ids = Parser.parseImages(doc.content);

        // add the returned ids array to result
        result.push(...ids);
    }

    return result;
}

// Fetches all imageIds for documents that exist locally
// Returns {arr: string[], serverWasReached: boolean}
export async function getServerImageIds(documents) {
    // validate parameter
    Validator.validateArrEmptyAllowed(documents);

    // initialize result
    const result = {
        arr: [],
        serverWasReached: true
    }

    // if no documents exist return empty array
    if (documents.length === 0) {
        return result;
    }

    // initialize tasks
    const tasks = [];
    
    // start individual fetch requests
    for (const doc of documents) {
        tasks.push(fetch(
            endpointGetImageidsForDocId + doc._id
        ));
    }

    // initialize responses
    let responses = [];

    // try block, errors may be thrown during the await all
    try { 
        // wait for all fetch requests to finish
        responses = await Promise.all(tasks);
    } catch (err) {
        // if fetch is unsuccessful the server is unreachable and we exit
        result.serverWasReached = false;
        return result;
    }

    console.log(`getServerImageIds awaited all tasks`);

    // loop through all responses and add images to result
    for (const response of responses) {
        // continue if a request resulted in an empty response
        if (!response) {
            continue;
        }

        // get json content
        const json = await response.json();

        // push image to result
        for (const imageId of json) {
            result.push(imageId);
        }
    }

    return result;
}

// fetches images that do not exist locally from server
// void
export async function fetchMissingImages(embeddedImages, serverImages, imageCache) {
    // validate parameters
    Validator.validateArrEmptyAllowed(embeddedImages);
    Validator.validateArrEmptyAllowed(serverImages);
    Validator.validateObjectNotNull(imageCache);
    Validator.validateObjectType(imageCache, ImageCache);

    // if requiredImages is empty no further work is needed
    if (embeddedImages.length === 0) {
        return;
    } 

    const requests = [];
    for (const requiredImage of embeddedImages) {
        // if the local entry exists we do not need to fetch it
        if (await localEntryExists(DB_IMAGES, requiredImage.id)) {
            continue;
        }

        // if serverImages does not contain the imageId then there is no need to fetch
        // --> it is a faulty or temporary embedding
        if (!serverImages.includes(requiredImage.id) ) {
            continue;
        }

        // add the id to requests, since the local entry does not exist
        requests.push(requiredImage.id);
    }

    // asynchronous fetch of all required images
    const tasks = [];
    for (const request of request) {
        tasks.push(fetch(
            endpointImageGetById + requiredImage.id
        ));
    }

    // await for all fetches to finish
    await Promise.all(tasks);

    for (const response of tasks) {
        // skip if server responded is not ok
        if (!response.ok) {
            continue;
        }

        // get the blob
        const blob = await response.blob();

        // add blob to local indexedDB storage
        await addOrSetLocalRecord(
            DB_IMAGES,
            {
                _id: reqImg.id,
                file: blob,
                name: response.headers
                    .get('Content-Disposition')
                    ?.match(/filename="(.+)"/)?.[1] ?? '',
                user_id: localStorage.userId,
                doc_id: reqImg.doc_id
            }
        );

        // create URL entry in imageCache
        imageCache.setUrl(requiredImage.id, blob);
    }
}

// posts images to server if they are missing or the current image
// is temporary and has no valid id
export async function syncFromLocalToServer(embeddedImages, serverImages, 
    activeDocument, udpateEditorContent, imageCache
) {
    console.log(`entered syncFromLocalToServer`)
    // validate parameters
    Validator.validateArrEmptyAllowed(embeddedImages);
    Validator.validateArrEmptyAllowed(serverImages);

    // if embeddedImages is empty, no work is needed
    if (embeddedImages.length === 0) {
        return;
    }

    // create array of objects for later processing
    // holds objects: {image: {
    // }, newId: string}
    const tasks = [];

    for (const image of embeddedImages) {
        // if serverImages includes the image id, image is already on the server
        if (serverImages.includes(image.id)) {
            continue;
        }

        // fetch image from local storage
        const localImage = await getLocalRecord(DB_IMAGES, image.id);

        // if no image object was returned, it is a faulty embedding
        if (!localImage) {
            continue;
        }

        // create asynchronous posts to server
        tasks.push({
            image: localImage,
            newId: newServerImage(
                localImage.doc_id,
                localImage.name,
                localImage.file
            )
        });
    }

    // wait for all requests to finish
    await Promise.all(tasks.map(task => task.newId));

    // loop through all tasks
    // key contains old imageId, value contains the new imageId
    for (const task of tasks) {
        // catch bugs
        Validator.validateStringEmptyNotAllowed(task.image._id);
        Validator.validateArrEmptyNotAllowed(task.image.doc_id);
        Validator.validateObjectNotNull(task.image.file);

        console.log(`task.image._id: ${task.image._id}`);

        // if newId is null, the post to server was not successful, we continue
        if (!task.newId) {
            continue;
        }

        // create new image entry in local storage
        await addOrSetLocalRecord(
            DB_IMAGES,
            {
                _id: task.newId,
                file: task.image.file,
                name: task.image.name,
                doc_id: task.image.doc_id,
                user_id: localStorage.userId
            }
        );

        // if the document in question is currently active, update editor content
        if (activeDocument._id === task.image.doc_id) {
            // replace the oldId with the newId
            const newContent = activeDocument.content.replace(
                task.image._id,
                task.newId
            );

            // update editor content
            udpateEditorContent(newContent);

            // replace existing URL
            imageCache.replace(task.image._id, task.newId);
        // for other documents replace the id in the stored document entry
        } else {
            // fetch local document from storage
            let doc = await getLocalRecord(DB_DOCUMENTS, task.image.doc_id);
            
            // if doc is null continue, as it has been deleted during the server request
            if (!doc) {
                continue;
            }

            // replace oldId with newId for fetched local document
            doc.content = doc.content.replace(task.oldId, task.newId);

            // save the new document state to local storage
            await addOrSetLocalRecord(DB_DOCUMENTS, doc);
        }

        // delete old image entry from local storage
        await deleteLocalRecord(DB_IMAGES, task.image._id);
    }
}