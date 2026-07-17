import { 
    storeExists, 
    addOrSetLocalRecord, 
    deleteLocalRecord
} from "@/services/indexedDB/indexedDbService";
import { getLocalRecordsByIndex } from "@/services/indexedDB/indexedDbService";
import { onMounted } from "vue";
import { Validator } from "@/services/validator";

import { 
    setImageCache,
    createCacheEntriesForDocument
} from '@/services/images/imageCacheService';

import { 
    getEmbeddedImageIds, 
    getServerImageIds,
    fetchMissingImages,
    syncFromLocalToServer
} from "@/services/images/imageInitService";

import { deleteImageFromServer, newServerImage } from "@/services/images/imageServerService";
import { Parser } from '@/services/parser';

import {
    DB_IMAGES
} from '@/constants/stores';

export function useImages(options = {}) {

    const { 
        documents,
        docsInitialized,
        countTempIds,
        activeDocument,
        imageCache
    } = options;

    let udpateEditorContent = null;

    // sets the reference to 'updateEditorContent' function
    function compSetUpdateEditorContent(fn) {
        udpateEditorContent = fn;
    }

    // creates Urls for all images embedded in docId & adds them to imageCache
    async function compCreateCacheEntriesForDocument(docId) {
        // validate parameter
        Validator.validateStringEmptyNotAllowed(docId);
        // create the cache entries for docId
        await createCacheEntriesForDocument(docId);
        // refresh the editor content to correctly display the images
    }

    // sends the image to the server
    async function compCreateNewServerImage(docId, name, file) {
        newServerImage(docId, name, file);
    }

    // creates a new local image with a temporary id
    async function compCreateNewLocalImage(docId, name, file) {
        // validate Parameters
        Validator.validateStringEmptyNotAllowed(docId);
        Validator.validateStringEmptyNotAllowed(name);
        Validator.validateFile(file);

        // create the image store if it does not exist yet
        if (!await storeExists(DB_IMAGES)) {
            await createImageStore();
        }

        // create a temporary id, in case that post to server fails or internet access was lost
        // will later be replaced with the actual id returned from the server
        const id = `temp-${Number(countTempIds.value) + 1}`;

        try {
            // create the local image record
            await addOrSetLocalRecord(DB_IMAGES, {
                _id: id,
                name: name,
                doc_id: docId,
                user_id: localStorage.userId,
                file: file
            });
        } catch (err) {
            console.error('Error saving image to local database: ' + err.message);
        }

        // create the Url object
        imageCache.setUrl(id, file);

        return id;
    }

    // deletes all images for a document from the server and locally
    async function compDeleteImagesForDoc(doc) {
        // validate parameter
        Validator.validateObjectNotNull(doc);

        // parse for image ids
        const ids = Parser.parseImageIds(doc.value.content);

        // delete all images from the server and local storage
        for (const id of ids) {
            try {

                // delete the id from the server
                const deleted = deleteImageFromServer(id);

                // delete local record
                if (deleted) {
                    await deleteLocalRecord(
                        DB_IMAGES,
                        id
                    );
                }

                // revoke url if it currently exists
                imageCache.revokeUrl(id);
            } catch (err) {
                console.error(`could not delete ${id}`);
            }
        }
    }

    // revokes all currently existing Urls for docId
    async function compRevokeImageUrlsForDocId(docId) {
        // validate parameter
        Validator.validateStringEmptyNotAllowed(docId);

        // fetch image objects for doc_id
        const images = await getLocalRecordsByIndex(
            DB_IMAGES,
            'doc_id',
            docId
        );

        // initialize ids that should be revoked
        const ids = [];

        // push individual ids to array
        for (const image of images) {
            ids.push(image._id);
        }

        // revoke ids
        imageCache.revokeUrls(ids);
    }

    onMounted(async () => { 
        // wait for documents to finish intializing       
        while (!docsInitialized.value) {
            await new Promise(r => setTimeout(r, 100));
            console.log(`sleeping`);
        }

        console.log(`not sleeping anymore`);
 
        // set imageCache reference in imageCacheService
        setImageCache(imageCache);
        
        const imageIdToDocId = new Map();
        
        // fetch imageIds that are already embedded in documents
        const embeddedImageIds = getEmbeddedImageIds(documents.value, imageIdToDocId);

        console.log(`embeddedImageIds: ${embeddedImageIds}`);

        // if there are no embedded images, we do nothing
        if (embeddedImageIds.length === 0) {
            console.log(`useImages.onMounted: skipped because length of embeddedImages is 0`);
            return;
        }

        // for all currently existing documents, fetch the imageIds on the server
        const serverImages = await getServerImageIds(documents.value);

        // if a request was not successful, we continue with locally existing images and
        // do not synchronize images with server

        if (
            serverImages.arr.length === 0 ||
            !serverImages.serverWasReached
        ) {
            console.log(`useImages.onMounted: skipped because server not reachable or 0 serverImages`);
            return;
        }

        // fetch images that do not exist locally
        await fetchMissingImages(embeddedImageIds, serverImages.arr, imageCache, imageIdToDocId);
        // post images to server if they do not exist yet
        await syncFromLocalToServer(
            embeddedImageIds,
            serverImages.arr,
            activeDocument.value,
            udpateEditorContent,
            imageCache
        );
    });

    return {
        imageCache,
        createNewLocalImage: compCreateNewLocalImage,
        createNewServerImage: compCreateNewServerImage,
        initializeImageCacheForDocument: compCreateCacheEntriesForDocument,
        revokeImageUrlsForDocId: compRevokeImageUrlsForDocId,
        deleteImagesForDocId: compDeleteImagesForDoc,
        setUpdateEditorContent: compSetUpdateEditorContent
    };
}