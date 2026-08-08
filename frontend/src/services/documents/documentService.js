import { DB_DOCUMENTS } from '@/constants/stores';
import { Validator } from '@/services/validator';
import { addOrSetLocalRecord } from '../indexedDB/indexedDbService';

export async function replaceImageIdForStoredDocument(oldId, newId, docId) {
    // validate input
    Validator.validateStringEmptyNotAllowed(oldId);
    Validator.validateStringEmptyNotAllowed(newId);

    try {
        // get the document entry from local storage
        const doc = await getLocalRecord(DB_DOCUMENTS, docId);

        if (!doc) {
            return;
        }

        // update content of the document
        doc.content = doc.content.replace(oldId, newId);

        // update the entry in the local storage
        await addOrSetLocalRecord(DB_DOCUMENTS, doc);
        
        return 1;
    } catch (err) {
        console.warn('could not update document', err);
        return 0;
    }
}