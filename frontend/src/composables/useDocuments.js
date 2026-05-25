import { onMounted, ref } from 'vue';
import { DB_DOCUMENTS, getLocalRecordsByIndex,
    createLocalDatabase, localDbExists, getLocalRecord, 
    deleteLocalRecord, addOrSetLocalRecord,
    clearLocalDatabase
 } from '@/services/indexedDbService';

import { postToServer } from '@/services/apiService';
import { endpointDocByUser, endpointDocDelete, endpointDocNew } from '@/services/endpoints';

const documents = ref([]);
const activeDocument = ref();
const openDocuments = ref([]);
const links = ref([]);
let creationInProgress = false;

export function useDocuments(options = {}) {
    // documents: 
    // _id: string
    // title: string
    // content: string
    // version: number
    // pendingSync: boolean
    // deleted: boolean

    const { countTempIds, updateCountTempIds } = options;

    async function loadDocuments() {
        let serverDocuments = [];
        let localDocuments = [];

        try {
        // Check if local database exists and load documents from local storage
            if (await localDbExists(DB_DOCUMENTS)) {
                console.log('Local database exists, loading documents from local storage');
                localDocuments = await getLocalRecordsByIndex(
                    DB_DOCUMENTS,
                    'user_id',
                    localStorage.userId
                );

                console.log('Local database exists.');
                console.log(`Local Documents: ${localDocuments.length}`);
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
            const fetchedDocs = await postToServer({ user_id: localStorage.userId }, endpointDocByUser);

            if (fetchedDocs.success) {
                serverDocuments = await JSON.parse(fetchedDocs.documents);
                console.log(`Server Documents: ${serverDocuments.length}`);
            } else {
                console.log('Failed to fetch documents: ' + fetchedDocs.message);
            }
        } catch (err) {
            console.error('Error loading documents: ' + err.message);
        }

        return { serverDocuments, localDocuments };
    }

    async function syncDocuments(serverDocuments, localDocuments) {
        //postToserverDocs = documents that should be updated or added on the server
        let postToServerDocs = [];

        try {
            // Handle synchronization between local storage and server
            for (let serverDoc of serverDocuments) {
                const localDoc = localDocuments.find(
                    doc => doc._id === serverDoc._id
                );

                if (!localDoc) {
                    serverDoc.pendingSync = false;
                    serverDoc.deleted = false;

                    await addOrSetLocalRecord(
                        DB_DOCUMENTS,
                        serverDoc
                    );

                    console.log(`Document ${serverDoc._id} added to local`);
                    documents.value.push(serverDoc);
                    continue;
                }

                if (localDoc.deleted) {
                    const response = await postToServer(
                        { _id: localDoc._id },
                        endpointDocDelete
                    );
                    
                    if (response.success) {
                        await deleteLocalRecord(DB_DOCUMENTS, localDoc._id);
                    }
                }
                if (localDoc.version === serverDoc.version) {
                    console.log(`Document ${localDoc._id} is up to date with server version`);
                } else if (localDoc.version > serverDoc.version) {
                    postToServerDocs.push(localDoc);
                    console.log(`Document ${localDoc._id} has a newer version in local storage, will attempt to push to server`);
                } else {
                    serverDoc.pendingSync = false;
                    serverDoc.deleted = false;

                    await addOrSetLocalRecord(
                        DB_DOCUMENTS,
                        serverDoc
                    );
                }

                localDocuments = localDocuments.filter(
                    doc => doc._id !== localDoc._id
                );

                documents.value.push(serverDoc);
            }

            postToServerDocs.push(...localDocuments);
        } catch (err) {
            console.error('Error synchronizing server-documents: ' + err.message);
        }

        // Handle documents that exist in local storage but not on server
        let serverIsReachable = true;
        
        for (const doc of postToServerDocs) {
            let newDoc = doc;
            try{
                //Only try to reach the server once.
                if (serverIsReachable) {
                    const response = await postToServer({
                        user_id: doc.user_id,
                        title: doc.title,
                        content: doc.content,
                        version: doc.version
                    }, endpointDocNew);

                    if (response.success) {
                        console.log(`New _id for ${doc._id}: ${response._id}`);

                        newDoc = {
                            _id: response._id,
                            user_id: doc.user_id,
                            title: doc.title,
                            content: doc.content,
                            version: doc.version,
                            pendingSync: false,
                            deleted: false
                        }    
                        
                        await deleteLocalRecord(DB_DOCUMENTS, doc._id);
                        await addOrSetLocalRecord(DB_DOCUMENTS, newDoc);
                    } else {
                        console.error(`Failed to push document ${doc._id} to server: ${response.message}`);
                        serverIsReachable = false;
                    }
                }
            } catch (err) {
                console.log('Could not synchronize with server: ' + err.message);
                serverIsReachable = false;
                newDoc = doc;
            } finally {
                const index = documents.value.findIndex(
                    d => d._id === doc._id
                );

                if (index !== -1) {
                    documents.value[index] = newDoc;
                } else {
                    documents.value.push(newDoc);
                }
            }
        }
    }

    async function createDocument() {

        while(creationInProgress) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        creationInProgress = true;

        const tempId = `temp-${Number(countTempIds.value) + 1}`;
        console.log(countTempIds.value);
        
        let newDoc = {
            _id: tempId,
            user_id: localStorage.userId,
            title: 'New Document',
            content: '',
            version: 0,
            pendingSync: true,
            deleted: false
        }

        documents.value.push(newDoc);
        openDocument(newDoc._id, newDoc.title);
        setActiveDocument(newDoc._id);
        
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
                newDoc.deleted = false;

                const index = openDocuments.value.findIndex(id => id === tempId);

                if (index !== -1) {
                    openDocuments.value[index] = newDoc._id;
                }
            } else {
                console.log(`Failed to create document on server, keeping temporary ID ${tempId}`);
            }
        } catch (err) {
            console.error('failed to add document to server');
        }
        finally {
            await addOrSetLocalRecord(DB_DOCUMENTS, newDoc);
            await updateCountTempIds();
            console.log(activeDocument.value);
            creationInProgress = false;
        }
    }

    async function deleteDocument() {
        const id = activeDocument._id;
        const doc = documents.value.find(
            doc => doc._id === id
        );

        documents.value = documents.value.filter(
            doc => doc._id !== id
        );

        activeDocument.value = null;

        openDocuments.value = openDocuments.value.filter(
            doc => doc._id !== id
        );

        try {
            const response = await postToServer(
                { _id: id },
                endpointDocDelete
            ); 

            if (response.success) {
                deleteLocalRecord(DB_DOCUMENTS, activeDocument._id);
            } else {
                doc.deleted = true;
            }
        } catch (err) {
            console.log(`Document ${activeDocument._id} could not be deleted. Set to deleted instead.`);
            doc.deleted = true;
        } 
    }

    // an "open" document appears in the head-bar.
    function openDocument(id, title) {
        const exists = openDocuments.value.some(
            doc => doc._id === id
        );
        
        if (!exists) {
            openDocuments.value.push({
                _id: id,
                title: title
            });
        }
    }

    // removes a document from the head-bar.
    function closeDocument(id) {
        openDocuments.value =
            openDocuments.value.filter(
                doc => doc._id !== id,
            );

        if (activeDocument.value._id === id) {
            activeDocumentId.value = '';
        }
    }

    function setActiveDocument(id) {
        activeDocument.value = documents.value.find(
            doc => doc._id === id
        );
    }

    function shiftActiveDocument(docToBeClosed, offset) {
        const index = openDocuments.value.findIndex(
            doc => doc._id === docToBeClosed._id
        );

        if (docToBeClosed._id !== activeDocument.value._id) {
            return;
        }

        if (index > 0) {
            activeDocument.value = openDocuments.value[index + Number(offset)];
        } else if  (index === 0 && openDocuments.length > 1) {
            activeDocument.value = openDocuments.value[index + 1];
        } else {
            activeDocument.value = null;
        }
    }

    onMounted(async () => {
        const { serverDocuments, localDocuments } = await loadDocuments();
        await syncDocuments(serverDocuments, localDocuments);
        console.log(`Loaded ${[...documents.value].length} documents.`);
    });

    return {
        documents,
        activeDocument,
        openDocuments,
        createDocument,
        deleteDocument,
        openDocument,
        closeDocument,
        setActiveDocument,
        shiftActiveDocument
    };
}