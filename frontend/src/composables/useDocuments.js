import { onMounted, ref } from 'vue';
import { DB_DOCUMENTS, getLocalRecordsByIndex,
    createLocalDatabase, localDbExists, getLocalRecord, 
    deleteLocalRecord, addOrSetLocalRecord,
    clearLocalDatabase
 } from '@/services/indexedDbService';
import { postToServer } from '@/services/apiService';
import { endpointDocByUser, endpointDocNew } from '@/services/endpoints';
import { useSettings } from './useSettings';

const documents = ref([]);
const activeDocument = ref(null);
const openDocumentIds = ref(['1']);

export function useDocuments() {
    // documents: 
    // _id: string
    // title: string
    // content: string
    // version: number
    // pendingSync: boolean

    const { 
        countTempIds, 
        updateCountTempIds 
    } = useSettings();

    async function loadDocuments() {
        let serverDocuments = [];
        let localVersions = [];

        try {
        // Check if local database exists and load documents from local storage
            if (await localDbExists(DB_DOCUMENTS)) {
                console.log('Local database exists, loading documents from local storage');
                localVersions = await getLocalRecordsByIndex(
                    DB_DOCUMENTS,
                    'user_id',
                    localStorage.userId
                );

                console.log(`Local database exists, loading ${localVersions.length} documents from local storage`);
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
                serverDocuments = await JSON.parse(fetchedDocs.documents);
                console.log(`Fetched ${serverDocuments.length} documents from server`);
            } else {
                console.log('Failed to fetch documents: ' + fetchedDocs.message);
            }
        } catch (err) {
            console.error('Error loading documents: ' + err.message);
        }

        return { serverDocuments, localVersions };
    }

    async function syncDocuments(serverDocuments, localVersions) {
        let localOnlyDocs = [];

        try {
            // Handle synchronization between local storage and server
            for (let serverDoc of serverDocuments) {
                const localDoc = localVersions.find(doc => doc._id === serverDoc._id);

                if (!localDoc || 
                    localDoc.version < serverDoc.version
                ) {
                    console.log(`Document ${serverDoc._id} exists on server but not in local storage, adding to local storage`);
                    const newDoc = {
                        _id: serverDoc._id,
                        user_id: serverDoc.user_id,
                        title: serverDoc.title,
                        content: serverDoc.content,
                        version: serverDoc.version,
                        pendingSync: false
                    };

                    await addOrSetLocalRecord(DB_DOCUMENTS, newDoc);
                } else if (localDoc.version === serverDoc.version) {
                    console.log(`Document ${localDoc._id} is up to date with server version`);
                } else if (localDoc.version > serverDoc.verison){
                    localOnlyDocs.push(localDoc);
                    console.log(`Document ${localDoc._id} has a newer version in local storage, will attempt to push to server`);
                } else {
                    console.log('Check this please');
                }

                documents.value.push(serverDoc);
            }
        } catch (err) {
            console.error('Error synchronizing server-documents: ' + err.message);
        }

        try {
            // Handle documents that exist in local storage but not on server
            for (const localDoc of localOnlyDocs) {
                const doc = await getLocalRecord(DB_DOCUMENTS, '_id', localDoc._id);
                console.log(localDoc);

                const response = await postToServer({
                    user_id: doc.user_id,
                    title: doc.title,
                    content: doc.content,
                    version: doc.version
                }, endpointDocNew);

                const newDoc = {
                    _id: response._id,
                    user_id: doc.user_id,
                    title: doc.title,
                    content: doc.content,
                    version: doc.version,
                    pendingSync: false
                }     

                if (response.success) {
                    console.log(`New _id for ${localDoc._id}: ${response._id.toString()}`);

                    await deleteLocalRecord(DB_DOCUMENTS, localDoc._id);
                    await addOrSetLocalRecord(DB_DOCUMENTS, newDoc);

                    documents.value.push(newDoc);
                } else {
                    console.error(`Failed to push document ${localDoc._id} to server`);
                    documents.value.push(doc);
                    continue;
                }

                localVersions = localVersions.filter(doc => doc._id !== localDoc._id);
            }
        } catch (err) {
            console.error('Error synchronizing local-only documents: ' + err.message + ' ');
        }
    }

    async function createDocument() {
        const tempId = `temp-${Number(countTempIds.value) + 1}`;
        console.log(countTempIds.value);
        
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
        
        try {
            const response = await postToServer({
                user_id: localStorage.userId,
                title: newDoc.title,
                content: newDoc.content,
                version: newDoc.version
            }, endpointDocNew);

            if (response.success) {
                console.log(`New _id for ${tempId}: ${response._id.toString()}`);
                
                newDoc._id = response._id;
                newDoc.pendingSync = false;

                const openDocumentIndex = openDocumentIds.value.findIndex(id => id === tempId);

                if (openDocumentIndex !== -1) {
                    openDocumentIds.value[openDocumentIndex] = newDoc._id;
                }
            } else {
                console.log(`Failed to create document on server, keeping temporary ID ${tempId}`);
            }
        } catch (err) {
            console.error('failed to add document to server');
        }
        finally {
            console.log(newDoc);
            await addOrSetLocalRecord(DB_DOCUMENTS, newDoc);
            await updateCountTempIds();
        }
    }

    async function removeDocument(documentId) {

    }

    // an "open" document appears in the head-bar.
    function openDocument(id) {
        if (!openDocumentIds.value.includes(id)) {
            openDocumentIds.value.push(id);
        }
    }

    // removes a document from the head-bar.
    function closeDocument(id) {
        openDocumentIds.value =
            openDocumentIds.value.filter(
                (docId) => docId !== id,
            );

        if (activeDocument.value._id === id) {
            activeDocumentId.value = '';
        }
    }

    function setActiveDocument(id) {
        activeDocument.value = documents.value.filter(
            (doc) => doc._id === id
        );
    }

    onMounted(async () => {
        const { serverDocuments, localVersions } = await loadDocuments();
        await syncDocuments(serverDocuments, localVersions);
    });

    return {
        documents,
        activeDocument,
        openDocumentIds,
        createDocument,
        removeDocument,
        openDocument,
        closeDocument,
        setActiveDocument
    };
}