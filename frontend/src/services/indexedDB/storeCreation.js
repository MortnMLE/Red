import { DB_DOCUMENTS, DB_IMAGES, DB_SETTINGS } from "@/constants/stores";
import { storeExists, createStore, addOrSetLocalRecord } from "@/services/indexedDB/indexedDbApi";
import { 
    settingStoreOptions,
    documentStoreOptions, 
    imageStoreOptions 
} from "@/constants/storeOptions";

export async function createDocumentStore() {
    if (await storeExists(DB_DOCUMENTS)){
        return true;
    }

    try {
        await createStore(documentStoreOptions);
    } catch (error) {
        return false;
    }

    return true;
}

export async function createSettingStore() {
    if (await storeExists(DB_SETTINGS)) {
        return true;
    }
    
    try {
        await createStore(settingStoreOptions);

        await addOrSetLocalRecord(DB_SETTINGS, { 
            key: 'countTemporaryIds',
            value: 0,
            userId: localStorage.userId
        });

        await addOrSetLocalRecord(DB_SETTINGS, { 
            key: 'enableVim',
            value: true, 
            userId: localStorage.userId
        });
    } catch {
        return false;
    }

    return true;
}

export async function createImageStore() {
    if (await storeExists(DB_IMAGES)) {
        return true;
    }
    
    try {
        await createStore(imageStoreOptions);
    } catch (error) {
        return false;
    }

    return true;
}