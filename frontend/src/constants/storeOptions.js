import { DB_DOCUMENTS, DB_IMAGES, DB_SETTINGS } from "./stores";

export const documentStoreOptions = {
    storeObject: DB_DOCUMENTS,
    keyPath: 'id',
    indexes: [{
        indexName: 'userId',
        keyPath: 'userId',
        options: { unique: false }
    }],
};

export const imageStoreOptions = {
    storeObject: DB_IMAGES,
    keyPath: 'id', 
    indexes: [
        {
            indexName: 'userId',
            keyPath: 'userId',
            options: { unique: false },
        },
        {
            indexName: 'docId',
            keyPath: 'docId',
            options: { unique: false },
        }
    ],
};

export const settingStoreOptions = {
    storeObject: DB_SETTINGS,
    keyPath: 'key', 
    indexes: [{
        indexName: 'userId',
        keyPath: 'userId',
        options: { unique: false },
    }],
};