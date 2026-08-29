import { DB_DOCUMENTS, DB_IMAGES, DB_SETTINGS } from "@/constants/stores";
import { storeExists, createStore, addOrSetLocalRecord } from "./indexedDbApi";
import { 
    settingStoreOptions,
    documentStoreOptions, 
    imageStoreOptions 
} from "@/constants/storeOptions";

export async function createDocumentStore() {
    console.log('entered createDocumentStore');
    if (await storeExists(DB_DOCUMENTS)){
        return true;
    }

    try {
        await createStore(documentStoreOptions);
    } catch (error) {
        console.log(error);
        return false;
    }

    return true;
}

export async function createSettingStore() {
    console.log('entered createSettingsStore');

    const exists = await storeExists(DB_SETTINGS);
    console.log(`store exists: ${exists}`);
    
    if (await storeExists(DB_SETTINGS)) {
        return true;
    }
    
    try {
        await createStore(settingStoreOptions);
        console.log('created Setting Store');

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
    } catch (error) {
        console.log(error);
        return false;
    }

    return true;
}

export async function createImageStore() {
    console.log('entered createImageStore');
    if (await storeExists(DB_IMAGES)) {
        return true;
    }
    
    try {
        await createStore(imageStoreOptions);
    } catch (error) {
        console.log(error);
        return false;
    }

    return true;
}