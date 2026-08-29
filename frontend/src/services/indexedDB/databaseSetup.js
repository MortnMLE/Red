import { 
    createDocumentStore,
    createSettingStore,
    createImageStore
} from './storeCreation';
import { DB_DOCUMENTS, DB_IMAGES, DB_SETTINGS } from '@/constants/stores';
import { resetDB } from './databaseReset';

export async function ensureDBs() {

    const settingsOk = await createSettingStore();
    const documentsOk = await createDocumentStore();
    const imagesOk = await createImageStore();

    let resetDocumentsOk = true;
    let resetImagesOk = true;
    let resetSettingOk = true;

    if (!settingsOk) {
        resetSettingOk = await resetDB(DB_SETTINGS, createSettingStore);
    }
    
    if (!documentsOk) {
        resetDocumentsOk = await resetDB(DB_DOCUMENTS, createDocumentStore)
    }

    if (!imagesOk) {
        resetImagesOk = await resetDB(DB_IMAGES, createImageStore);
    }

    if (!resetSettingOk) {
        throw new Error('003_FATAL_DB_ERROR');
    }

    if (!resetDocumentsOk) {
        throw new Error('001_FATAL_DB_ERROR');
    }

    if (!resetImagesOk) {
        throw new Error('002_FATAL_DB_ERROR');
    }
}

