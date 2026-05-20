import { onMounted, ref } from 'vue';
import { DB_DOCUMENTS, getLocalDocumentVersionsByUserId,
    createLocalDatabase, localDbExists, updateLocalRecordFull, 
    getLocalRecord, deleteLocalRecord, addLocalRecord,
    clearLocalDatabase
 } from '@/services/indexedDbService';
import { postToServer } from '@/services/apiService';
import { endpointDocByUser, endpointDocNew } from '@/services/endpoints';
import { useSettings } from './useSettings';

export function useDocuments() {
    // documents: 
    // _id: string
    // title: string
    // content: string
    // version: number
    // pendingSync: boolean

    const documents = ref([]);
    const activeDocument = ref(null);
    const openDocumentIds = ref([]);
    const { 
        countTempIds, 
        updateCountTempIds 
    } = useSettings();

    async function loadDocuments() {
        const serverDocuments = ref([]);
        const localVersions = ref([]);

        try {
        // Check if local database exists and load documents from local storage
            if (await localDbExists(DB_DOCUMENTS)) {
                console.log('Local database exists, loading documents from local storage');
                localVersions.value = await getLocalDocumentVersionsByUserId(localStorage.userId);

                console.log(`Local database exists, loading ${localVersions.value.length} documents from local storage`);
            } else { 
                await createLocalDatabase(DB_DOCUMENTS, "_id");
                console.log('Local database does not exist, created new database');
            }
        } catch (err) {
            console.error('Error initializing local database: ' + err.message);
            await clearLocalDatabase(DB_DOCUMENTS);
            await loadDocuments(); // Retry loading documents after clearing local database
        }

        try {
            // Fetch documents from server
            console.log('fetching documents for user: ' + localStorage.userId);
            const fetchedDocs = await postToServer({ user_id: localStorage.userId }, endpointDocByUser);

            if (fetchedDocs.success) {
                serverDocuments.value = await JSON.parse(fetchedDocs.documents);
                console.log(`Fetched ${serverDocuments.value.length} documents from server`);
            } else {
                console.log('Failed to fetch documents: ' + fetchedDocs.message);
            }
        } catch (err) {
            console.error('Error loading documents: ' + err.message);
        }

        return { serverDocuments, localVersions };
    }

    async function syncDocuments(serverDocuments, localVersions) {
        const localOnlyDocs = ref([]);

        try {
            // Handle synchronization between local storage and server
            for (let serverDoc of serverDocuments.value) {
                const localDoc = localVersions.value.find(doc => doc._id === serverDoc._id);

                if (!localDoc) {
                    console.log(`Document ${serverDoc._id} exists on server but not in local storage, adding to local storage`);
                    const newDoc = {
                        _id: serverDoc._id,
                        user_id: serverDoc.user_id,
                        title: serverDoc.title,
                        content: serverDoc.content,
                        version: serverDoc.version,
                        pendingSync: false
                    };

                    await addLocalRecord(DB_DOCUMENTS, newDoc);
                    serverDoc = newDoc;
                } else if (localDoc.version < serverDoc.version) {
                    await updateLocalRecordFull(DB_DOCUMENTS, serverDoc._id, serverDoc);
                } else if (localDoc.version === serverDoc.version) {
                    console.log(`Document ${localDoc._id} is up to date with server version`);
                } else {
                    localOnlyDocs.value.push(localDoc);
                    console.log(`Document ${localDoc._id} has a newer version in local storage, will attempt to push to server`);
                }

                documents.value.push(serverDoc);
            }
        } catch (err) {
            console.error('Error synchronizing server-documents: ' + err.message);
        }

        try {
            // Handle documents that exist in local storage but not on server
            for (const localDoc of localOnlyDocs.value) {
                const doc = await getLocalRecord(DB_DOCUMENTS, '_id', localDoc._id);

                const response = await postToServer({
                    user_id: doc.user_id,
                    title: doc.title,
                    content: doc.content,
                    version: doc.version
                }, endpointDocNew);

                if (response.success) {
                    console.log(`New _id for ${localDoc._id}: ${response._id.toString()}`);

                    await deleteLocalRecord(DB_DOCUMENTS, localDoc._id);

                    const newDoc = {
                        _id: response._id,
                        user_id: doc.user_id,
                        title: doc.title,
                        content: doc.content,
                        version: doc.version,
                        pendingSync: false
                    }

                    await addLocalRecord(DB_DOCUMENTS, newDoc);
                    documents.value.push(newDoc);
                } else {
                    console.error(`Failed to push document ${localDoc._id} to server`);
                    documents.value.push(doc);
                    continue;
                }

                localVersions.value = localVersions.value.filter(doc => doc._id !== localDoc._id);
            }
        } catch (err) {
            console.error('Error synchronizing local-only documents: ' + err.message);
        }
    }

    async function createDocument() {
        const tempId = `temp-${countTempIds.value + 1}`;

        let newDoc = {
            _id: tempId,
            user_id: localStorage.userId,
            title: 'New Document',
            content: '',
            version: 0,
            pendingSync: true
        } 

        documents.value.push(newDoc);
        openDocument(newDoc._id);
        activeDocument.value = newDoc._id;
        
        const response = await postToServer({
            user_id: localStorage.userId,
            title: newDoc.title,
            content: newDoc.content,
            version: newDoc.version
        }, endpointDocNew);

        if (response.success) {
            console.log(`New _id for ${tempId}: ${response._id.toString()}`);

            newDoc._id = response.insertedId;
            newDoc.pendingSync = false;

            const index = documents.value.findIndex(
                doc => doc._id === tempId
            );
            
            const openDocumentIndex = openDocumentIds.value.findIndex(id => id === tempId);
            if (index !== -1) {
                documents.value[index]._id = newDoc._id;
                documents.value[index].pendingSync = false;

                activeDocument.value = documents.value[index];
            } else {
                console.error(`Failed to find document with temporary ID ${tempId} in documents array`);
                await updateCountTempIds();
            }

            if (openDocumentIndex !== -1) {
                openDocumentIds.value[openDocumentIndex] = newDoc._id;
            }
        } else {
            console.log(`Failed to create document on server, keeping temporary ID ${tempId}`);
            await updateCountTempIds();
        }
        
        await addLocalRecord(DB_DOCUMENTS, newDoc);
    }

    async function removeDocument(documentId) {

    }

    onMounted(async () => {
        const { serverDocuments, localVersions } = await loadDocuments();
        await syncDocuments(serverDocuments, localVersions);
    });

    return {
        documents,
        createDocument,
        removeDocument
    };
}