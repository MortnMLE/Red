import { authenticatedFetch } from "../accessToken";
import { GETdocsForUser } from "@/constants/endpoints";
import { getLocalRecordsByIndex } from "../indexedDB/indexedDbApi";
import { DB_DOCUMENTS } from "@/constants/stores";
import { createDocuments } from '@/services/documents/documentFactory';

export async function loadDocuments() {
    const [serverDocuments, localDocuments] = await Promise.all([
        getDocumentsFromServer(),
        getDocumentsFromLocalStorage()
    ]);

    return {serverDocuments, localDocuments};
}

// get all documents that belong to the user from the server
export async function getDocumentsFromServer() {
    try {
        const userId = localStorage.getItem('userId');

        const response = await authenticatedFetch(
            GETdocsForUser + userId
        );

        const json = await response.json();

        let serverDocuments = [];
        
        if (json.success) {
            serverDocuments = json.documents;
        }

        return createDocuments(serverDocuments);
    } catch (error) {
        console.log(`error: ${error}`);
        return [];
    }
}

// get all documents that belong to the user from local storage
export async function getDocumentsFromLocalStorage() {
    try {
        const userId = localStorage.getItem('userId');

        const localDocuments = await getLocalRecordsByIndex(
            DB_DOCUMENTS,
            'userId',
            userId
        );

        return createDocuments(localDocuments);
    } catch (error) {
        console.log(`getDocumentsFromLocalStorage error: ${error}`);
        return [];
    }
}