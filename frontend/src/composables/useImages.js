import { serverRequest } from "@/services/apiService";
import { 
    endpointGetImageidsForDocId, 
    endpointImageGetById, 
    endpointImgDelete, 
    endpointImgNew 
} from "@/constants/endpoints";
import { 
    createStore,
    storeExists, 
    DB_IMAGES, 
    addOrSetLocalRecord, 
    localEntryExists,
    deleteLocalRecord,
    getLocalRecord,
    DB_DOCUMENTS
} from "@/services/indexedDbService";
import { getLocalRecordsByIndex } from "@/services/indexedDbService";
import { onMounted } from "vue";
import { Validator } from "@/services/validator";
import { 
    createCacheEntriesForImages, 
    setImageCache 
} from '@/services/images/imageCacheService';

export function useImages(options = {}) {

    const { 
        documents,
        docsInitialized,
        countTempIds,
        activeDocument,
        imageCache
    } = options;

    let udpateEditorContent = null;

    function setUpdateEditorContent(fn) {
        udpateEditorContent = fn;
    }

    async function syncFromLocalToServer(requiredImages, serverImages) {
        if (!requiredImages || !serverImages) {
            throw new Error(
                `useImages.syncFromLocalToServer:\n` +
                `requiredImages: ${requiredImages}\n` +
                `serverImages: ${serverImages}`
            );
        }

        console.log(`entered syncFromLocalToServer with requiredImages: ${requiredImages}`);
        for (const image of requiredImages) {
            console.log(`reqImg: ${image.id}`);

            if (serverImages.includes(image.id)) {
                console.log(`image ${image.id} already exists on server. continue.`);
                continue;
            }
            
            console.log(`getLocalRecord: ${image.id}`);

            const localImage = await getLocalRecord(DB_IMAGES, image.id);
            
            if (!localImage) {
                console.log(`localImg ${image.id} not found.`);
                continue;
            }

            console.log(`result getLocalRecord: ${localImage._id}`);

            const insertedId = await createNewServerImage(
                localImage.doc_id,
                localImage.name,
                localImage.file
            );

            console.log(`deleteLocalRecord: ${localImage.id}`);

            console.log(`response: ${insertedId}`);
            if (!insertedId) {
                console.log(`Invalid response from server. continue`);
                continue;
            }

            console.log(`Requesting with localImg.doc_Id ${localImage.doc_id}`);

            let localDocument = await getLocalRecord(
                DB_DOCUMENTS,
                localImage.doc_id
            );

            console.log(`received local record: ${localDocument._id}`);

            if (!localDocument) {
                console.error(`could not fetch local document ${localImage.doc_id}`);
                continue;
            }

            console.log(`asdf: ${localImage._id}`);
            
            if (localDocument._id === activeDocument._id) {
                const content = activeDocument.value.content.replace(
                    localImage._id,
                    insertedId
                );

                udpateEditorContent(content);
            } else {
                localDocument.content = localDocument.content.replace(
                    localImage._id,
                    insertedId
                );

                addOrSetLocalRecord(DB_DOCUMENTS, localDocument);
            }

            const doc = documents.value.find(
                (doc) => doc._id === localImage.doc_id
            );

            doc.content = doc.content.replace(
                localImage._id,
                insertedId
            );

            console.log(`replacing ${localImage._id}, with ${insertedId}`);
            await addOrSetLocalRecord(
                DB_IMAGES, 
                {
                    _id: insertedId,
                    file: localImage.file,
                    name: localImage.name,
                    doc_id: localImage.doc_id,
                    user_id: localStorage.userId
                }
            );

            console.log(`deleteLocalRecord: ${localImage._id}`);
            await deleteLocalRecord(DB_IMAGES, localImage._id);
        }
    }

    async function fetchMissingImages(requiredImages, serverImages) {
        if (!requiredImages || !serverImages) {
            throw new Error(
                `useImages.fetchMissingImages:\n` +
                `requiredImages: ${requiredImages}\n` +
                `serverImages: ${serverImages}`
            );
        }
        for (const reqImg of requiredImages) {
            console.log(`Local image: ${reqImg.id}`);

            const exists = await localEntryExists(DB_IMAGES, reqImg.id); 
            if (exists) {
                console.log(`${reqImg.id} already exists. Continue.`);
                continue;
            }

            if (!serverImages.includes(reqImg.id)) {
                continue;
            }

            let response = undefined;
            try {
                response = await fetch(
                    endpointImageGetById + reqImg.id
                );
            } catch (err) {
                console.error(err);
                return;
            }
            
            if (!response.ok) {
                continue;
            }
            console.log(`adding ${reqImg.id} to local Storage`);

            const blob = await response.blob();

            addOrSetLocalRecord(
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

            setImageToCache(reqImg.id);
        }
    }

    async function initializeImageCacheForDocument(docId) {
        // validate parameter
        Validator.validateStringEmptyNotAllowed(docId);
        
        console.log(`initializeImageCacheForDocument called with docId: ${docId}`);

        // fetch IndexedDB-images for document id
        const images = await getLocalRecordsByIndex(
            DB_IMAGES,
            'doc_id',
            docId
        );

        // call service
        createCacheEntriesForImages(images);
    }

    async function setImageToCache(imageId) {
        console.log(`setImageToCache called with: ${imageId}`);

        if (imageId === '' || !imageId) {
            throw new Error(`useImages.addOrSetImageCache: ${imageId}`);
        }

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

    async function createNewServerImage(docId, name, file) {
        // validate Parameters
        Validator.validateStringEmptyNotAllowed(docId);
        Validator.validateStringEmptyNotAllowed(name);
        Validator.validateFile(file);

        console.log(`doc_id: ${docId},\nimage size: ${file.size},\nuser_id: ${localStorage.userId}\nname ${name}`);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('name', name);
        formData.append('user_id', localStorage.userId);
        formData.append('doc_id', docId);

        try {
            const response = await fetch(
                endpointImgNew, 
                {
                    method: 'POST',
                    body: formData
                }
            );

            console.log(formData);
            const json = await response.json();
            console.log(`new image returned: ${json.id}`);

            if (json.success) {
                return json.id;
            }
        } catch (err) {
            console.error(err.message);
        }
    }

    async function createNewLocalImage(docId, name, file) {
        // validate Parameters
        Validator.validateStringEmptyNotAllowed(docId);
        Validator.validateStringEmptyNotAllowed(name);
        Validator.validateFile(file);

        if (!await storeExists(DB_IMAGES)) {
            await createImageStore();
        }

        const id = `temp-${Number(countTempIds.value) + 1}`;

        try {
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

        imageCache.setUrl(id, file);
        return id;
    }

    async function deleteImagesForDoc(doc) {
        if (!doc) {
            throw new Error(`useImages.deleteImagesForDocId: ${doc}`);
        }
        const imagePaths = [];
        const regex = /!\[(.*?)\]\((.*?)\)/g;

        for (const match of doc.content.matchAll(regex)) {
            console.log(`adding ${match[2]}`);
            imagePaths.push(match[2]);
        }

        for (const path of imagePaths) {
            try {
                const response = serverRequest(
                    'DELETE',
                    { id: path },
                    endpointImgDelete
                );

                if (response.success) {
                    await deleteLocalRecord(
                        DB_IMAGES,
                        path
                    );
                }
            } catch (err) {
                console.error(`could not delete ${path}`);
            }
        }
    }

    async function revokeImageUrlsForDocId(id) {
        if (!id || id === '') {
            throw new Error(`useImages.revokeImageUrlsForDocId: ${id}`);
        }

        const images = await getLocalRecordsByIndex(
            DB_IMAGES,
            'doc_id',
            id
        );

        images.forEach((image) => {
            const url = imageCache.get(image._id);
            if (url) {
                URL.revokeObjectURL(url);
                imageCache.delete(image._id);
            }
        });
    }
    
    async function createImageStore() {
        await createStore(
            DB_IMAGES,
            '_id',
            [
                {
                    indexName: 'doc_id', 
                    keyPath: 'doc_id', 
                    options: { unique: false }
                },
                {
                    indexName: 'user_id',
                    keyPath: 'user_id',
                    options: { unique: false }
                }
            ]
        );
    }

    onMounted(async () => {        
        while (!docsInitialized.value) {
            await new Promise(r => setTimeout(r, 100));
            console.log('sleeping');
        }

        setImageCache(imageCache);

        if (!await storeExists(DB_IMAGES)) {
            console.log()
            await createImageStore();
        }

        const regex = /!\[(.*?)\]\((.*?)\)/g;

        let requiredImages = [];
        let counter = 0;
        for (const doc of documents.value) {
            for (const match of doc.content.matchAll(regex)) {
                requiredImages.push({
                    id: match[2],
                    doc_id: doc._id
                });
                console.log(`requiredImages, iteration ${counter}: ${requiredImages[counter].id}; ${typeof requiredImages[counter].id}`);
                console.log(`match[2] typeof: ${typeof match[2]}`);
                counter++;
            }
        }

        if (requiredImages.length === 0) {
            return;
        }

        let serverIsReachable = true;
        let serverImages = [];

        for (const doc of documents.value) {
            if (!serverIsReachable) {
                continue;
            }

            try {
                console.log(`onMounted useImages: fetch imgs for docId: ${doc._id}`);
                const response = await fetch(
                    endpointGetImageidsForDocId + doc._id
                );

                if (!response) {
                    continue;
                }

                const json = await response.json();
                let images = [];

                for (const img of json.images) {
                    images.push(img);
                }
                serverImages.push(...images);
            } catch (err) {
                console.log(`onMounted: useImages: could not fetch images for ${doc._id}. ${err}`);
                serverIsReachable = false;
            }    
        }

        console.log(`serverIsReachable: ${serverIsReachable}`);
        if (serverIsReachable) {
            await fetchMissingImages(requiredImages, serverImages);
            await syncFromLocalToServer(requiredImages, serverImages);
        }
    });

    return {
        imageCache,
        createNewLocalImage,
        createNewServerImage,
        initializeImageCacheForDocument,
        revokeImageUrlsForDocId,
        deleteImagesForDocId: deleteImagesForDoc,
        addOrSetImageToCache: setImageToCache,
        setUpdateEditorContent
    };
}