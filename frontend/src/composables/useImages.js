import { serverRequest } from "@/services/apiService";
import { 
    endpointGetImageidsForDocId, 
    endpointImageGetById, 
    endpointImgDelete, 
    endpointImgNew 
} from "@/services/endpoints";
import { 
    createLocalDatabase,
    localDbExists, 
    DB_IMAGES, 
    addOrSetLocalRecord, 
    localEntryExists,
    deleteLocalRecord,
    getLocalRecord,
    DB_DOCUMENTS
} from "@/services/indexedDbService";
import { getLocalRecordsByIndex } from "@/services/indexedDbService";
import { onMounted } from "vue";

const imageCache = new Map();

export function useImages(options = {}) {

    const { 
        documents,
        docsInitialized,
        countTempIds,
        activeDocument
    } = options;

    async function syncFromLocalToServer(requiredImages, serverImages) {
        console.log('entered syncFromLocalToServer');
        for (const reqImg of requiredImages) {
            console.log(`localImages: ${requiredImages}`);
            console.log(`serverImages: ${serverImages}`);
            if (serverImages.includes(reqImg.id)) {
                console.log(`serverImage ${reqImg.id} already exists. continue.`)
                continue;
            }

            const img = await getLocalRecord(DB_IMAGES, reqImg.id);

            if (!img) {
                console.log(`localImg ${reqImg} not found.`);
                continue;
            }

            const response = await createNewServerImage(
                img.doc_id,
                img.name,
                img.file
            );
            console.log(`response: ${response.id}`);
            if (!response) {
                console.log(`Invalid response from server. continue`);
                continue;
            }

            console.log(`Requesting with localImg.doc_Id ${reqImg.doc_id}`);

            let localEntry = await getLocalRecord(
                DB_DOCUMENTS,
                reqImg.doc_id
            );
            console.log(`received local record: ${localEntry._id}`);

            if (!localEntry) {
                console.error(`could not fetch local document ${reqImg.doc_id}`);
                continue;
            }

            localEntry.content = localEntry.content.replace(
                reqImg.id,
                response.id
            );

            const doc = documents.value.find(
                (doc) => doc._id === reqImg.doc_id
            );

            doc.content = doc.content.replace(
                reqImg.id,
                response.id
            );

            console.log(`replacing ${reqImg.id}, with ${response.id}`);
            await addOrSetLocalRecord(
                DB_IMAGES, 
                {
                    _id: response.id,
                    file: img.file,
                    name: img.name,
                    doc_id: img.doc_id
                }
            );

            await deleteLocalRecord(DB_IMAGES, reqImg.id);
        }
    }

    async function fetchMissingImages(requiredImages, serverImages) {
        console.log(`entered fetchMissingImages, localImages: ${requiredImages}`);
        console.log(`entered fetchMissingImages, serverImages: ${serverImages}`);
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
            console.log(`adding ${img.id} to local Storage`);
            addOrSetLocalRecord(
                DB_IMAGES,
                {
                    _id: img.id,
                    file: await response.blob(),
                    name: response.headers
                        .get('Content-Disposition')
                        ?.match(/filename="(.+)"/?.[1] ?? ''),
                    user_id: localStorage.userId,
                    doc_id: img.doc_Id
                }
            );
        }
    }

    async function initializeImageCacheForDocument(docId) {
        if (!docId) {
            console.error('initializeImageCacheForDocument: docId is required');
            return;
        }

        const images = await getLocalRecordsByIndex(
            DB_IMAGES,
            'doc_id',
            docId
        );

        images.forEach((image) => {
            if (!imageCache.has(image._id)) {
                const url = URL.createObjectURL(image.file);
                imageCache.set(image._id, url);
            }
        });
    }

    async function createNewServerImage(docId, name, file) {
        try {
            const response = await serverRequest(
                'POST',
                {
                    doc_id: docId,
                    file: file,
                    name
                },
                endpointImgNew
            );

            if (response.success) {
                return { id: response.id};
            }
        } catch (err) {
            console.error(err.message);
        }
    }

    async function createNewLocalImage(docId, name, file) {
        if (!await localDbExists(DB_IMAGES)) {
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

        const url = URL.createObjectURL(file);
        imageCache.set(id, url);
        return { id };
    }

    async function deleteImagesForDocId(doc) {
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
        await createLocalDatabase(
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
        if (!await localDbExists(DB_IMAGES)) {
            await createImageStore();
        }
        
        while (!docsInitialized.value) {
            await new Promise(r => setTimeout(r, 100));
            console.log('sleeping');
        }

        const regex = /!\[(.*?)\]\((.*?)\)/g;

        let requiredImages = [];

        for (const doc of documents.value) {
            for (const match of doc.content.matchAll(regex)) {
                console.log(`identified ${match[2]}`);
                requiredImages.push({
                    id: match[2],
                    doc_id: doc._id
                });
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
                serverImages.push(...json.images);
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
        deleteImagesForDocId
    };
}