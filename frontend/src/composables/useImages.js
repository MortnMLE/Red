import { 
    createLocalDatabase,
    localDbExists, 
    DB_IMAGES, 
    addOrSetLocalRecord 
} from "@/services/indexedDbService";
import { getLocalRecordsByIndex } from "@/services/indexedDbService";
import { onMounted } from "vue";

const imageCache = new Map();

export function useImages(options = {}) {

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

    async function createNewLocalImage(docId, name, file) {
        if (!docId || !name || !file) {
            console.log('createNewLocalImage: docId, name, and file are required');
            return;
        }

        if (!await localDbExists(DB_IMAGES)) {
            await createImageStore();
        }

        const id = crypto.randomUUID();

        try {
            addOrSetLocalRecord(DB_IMAGES, {
                _id: id,
                name: name,
                doc_id: docId,
                file: file
            });
        } catch (err) {
            console.error('Error saving image to local database: ' + err.message);
        }

        const url = URL.createObjectURL(file);
        imageCache.set(id, url);
        return id;
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
            ['doc_id', 'doc_id', { unique: false }]
        );
    }

    async function cleanUp() {
        
    }

    onMounted( async () => {
        if (!localDbExists(DB_IMAGES)) {
            await createImageStore();
        }


    });

    return {
        imageCache,
        createNewLocalImage,
        initializeImageCacheForDocument,
        revokeImageUrlsForDocId
    };
}