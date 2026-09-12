import { 
    storeExists, 
    addOrSetLocalRecord, 
    deleteLocalRecord
} from "@/services/indexedDB/indexedDbApi";
import { onMounted, ref } from "vue";
import { Validator } from "@/services/validator";

import { 
    setImageCache,
    createCacheEntriesForDocument,
    revokeAllForDocId
} from '@/services/images/imageCacheService';

import { 
    getEmbeddedImageIds, 
    getServerImageIds,
    fetchMissingImages,
    addServerImageToLocalStorage,
    postMissingImages
} from "@/services/images/imageInitialization";

import { deleteImageFromServer, newServerImage } from "@/services/images/imageServerService";
import { Parser } from '@/services/parser';

import {
    DB_IMAGES
} from '@/constants/stores';
import { replaceImageIdForStoredDocument } from "@/services/documents/documentService";

export function useImages(options = {}) {

    const { 
        documents,
        docsInitialized,
        countTempIds,
        activeDocument,
        imageCache
    } = options;

    const imageCacheVersion = ref(0);

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
        imageCacheVersion.value += 1;
        // refresh the editor content to correctly display the images
    }

    // sends the image to the server
    async function createNewServerImage(docId, name, file) {
        await newServerImage(docId, name, file);
    }

    // creates a new local image with a temporary id
    async function createNewLocalImage(docId, name, file) {
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
                id: id,
                name: name,
                docId: docId,
                userId: localStorage.userId,
                file: file
            });
        } catch (err) {
            // do nothing
        }

        // create the Url object
        imageCache.setUrl(id, file);
        imageCacheVersion.value += 1;

        return id;
    }

    // deletes all images for a document from the server and locally
    async function deleteImagesForDocument(doc) {
        // validate parameter
        Validator.validateObjectNotNull(doc);

        // parse for image ids
        const parser = new Parser();
        const ids = parser.parseImageIds(doc.content);

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
                //do nothing
            }
        }

        imageCacheVersion.value += 1;
    }

    // revokes all currently existing Urls for docId
    async function revokeImageUrlsForDocumentId(docId) {
        await revokeAllForDocId(docId);
        imageCacheVersion.value += 1;
    }

    onMounted(async () => { 
        // wait for documents to finish intializing       
        while (!docsInitialized.value) {
            await new Promise(r => setTimeout(r, 100));
        }

        // set imageCache reference in imageCacheService
        setImageCache(imageCache);
        
        const imageIdToDocId = new Map();
        
        // fetch imageIds that are already embedded in documents
        const embeddedImageIds = getEmbeddedImageIds(documents.value, imageIdToDocId);

        // if there are no embedded images, we do nothing
        if (embeddedImageIds.length === 0) {
            return;
        }

        // for all currently existing documents, fetch the imageIds on the server
        const serverImageIds = await getServerImageIds(documents.value);

        // if a request was not successful, we continue with locally existing images and
        // do not synchronize images with server

        if (!serverImageIds.serverWasReached) {
            return;
        }

        // fetch images that do not exist locally
        const fetchedImages = await fetchMissingImages(embeddedImageIds, serverImageIds.arr);
       
        for (const image of fetchedImages) {
            await addServerImageToLocalStorage(image, imageIdToDocId.get(image.id));
        }

        // images that are not yet on the server are posted. Returns an array of newly
        // inserted images and ids
        const insertedImages = await postMissingImages(embeddedImageIds, serverImageIds.arr);

        for(const image of insertedImages) {
            // create new image entry in local storage
            await addOrSetLocalRecord(
                DB_IMAGES,
                {
                    id: image.newId,
                    file: image.image.file,
                    name: image.image.name,
                    docId: image.image.docId,
                    userId: localStorage.userId
                }
            );

            // if the document to be updated is active, replace the image id in the live editor
            if (activeDocument.value.id === image.image.docId) {
                const newContent = activeDocument.content.replace(
                    image.image.id,
                    image.newId
                );

                udpateEditorContent(newContent);

                imageCache.replaceId(
                    image.image.id,
                    image.newId
                );
                imageCacheVersion.value += 1;
            // if the document is not active, update the document entry in local storage
            } else {
                await replaceImageIdForStoredDocument(
                    image.image.id,
                    image.newId, 
                    image.image.docId
                );
            }

            // delete the old record
            await deleteLocalRecord(DB_IMAGES, image.image.id);
        }
    });

    return {
        imageCache,
        imageCacheVersion,
        createNewLocalImage,
        createNewServerImage,
        initializeImageCacheForDocument: compCreateCacheEntriesForDocument,
        revokeImageUrlsForDocId: revokeImageUrlsForDocumentId,
        deleteImagesForDocId: deleteImagesForDocument,
        setUpdateEditorContent: compSetUpdateEditorContent
    };
}