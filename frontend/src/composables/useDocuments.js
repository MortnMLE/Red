import { onMounted, ref, computed, toRaw } from 'vue';
import { DB_DOCUMENTS, getLocalRecordsByIndex,
    createLocalDatabase, localDbExists, getLocalRecord, 
    deleteLocalRecord, addOrSetLocalRecord,
    clearLocalDatabase
 } from '@/services/indexedDbService';

import { postToServer } from '@/services/apiService';
import { endpointDocByUser, endpointDocDelete, endpointDocNew } from '@/services/endpoints';

const documents = ref([]);
const activeDocumentId = ref('');
const openDocumentIds = ref([]);

const links = ref([]);
let creationInProgress = false;

const activeDocument = computed (() => 
    documents.value.find(
        doc => doc._id === activeDocumentId.value
    )
);

const openDocuments = computed (() =>
    documents.value.filter(
        doc => openDocumentIds.value.includes(doc._id)
    )
);

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
        let postToServerArr = [];
        let deleteFromServerArr = [];

        deleteFromServerArr = localDocuments.filter(
            doc => doc.deleted
        );
        
        localDocuments = localDocuments.filter(
            doc => !doc.deleted
        );

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
                    postToServerArr.push(localDoc);
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

            postToServerArr.push(...localDocuments);
        } catch (err) {
            console.error('Error synchronizing server-documents: ' + err.message);
        }

        // Handle documents that exist in local storage but not on server
        let serverIsReachable = true;
        
        for (const doc of postToServerArr) {
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

        if (serverIsReachable) {
            try {
                for(const doc of deleteFromServerArr) {
                    const response = await postToServer(
                        { _id: doc._id }, 
                        endpointDocDelete
                    );
                    
                    console.log(`${doc._id}: ${JSON.stringify(response)}`);

                    if (response.success) {
                        deleteLocalRecord(DB_DOCUMENTS, doc._id);
                    }
                }
            } catch (err) {
                console.log('Could not delete document from server. Skipping deletion process');
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
        const doc = documents.value.find(
            doc => doc._id === activeDocumentId.value
        );

        // documents.value = documents.value.filter(
        //     doc => doc._id !== activeDocumentId.value
        // );

        // openDocumentIds.value = openDocumentIds.value.filter(
        //     openDocId => openDocId !== activeDocumentId.value
        // );

        const id = activeDocumentId.value;
        
        documents.value = documents.value.filter(
            doc => doc._id !== activeDocumentId.value
        )
        
        handleCloseDocuments(doc);

        try {
            const response = await postToServer(
                { _id: id },
                endpointDocDelete
            ); 

            if (response.success) {
                deleteLocalRecord(DB_DOCUMENTS, id);
            } else {
                doc.deleted = true;
                addOrSetLocalRecord(DB_DOCUMENTS, structuredClone(toRaw(doc)));
            }
        } catch (err) {
            console.log(`Document ${id} could not be deleted. Set to deleted instead.${err.message}`);
            doc.deleted = true;
            console.log(toRaw(doc));
            addOrSetLocalRecord(DB_DOCUMENTS, structuredClone(toRaw(doc)));
        } 
    }

    // an "open" document appears in the head-bar.
    function openDocument(id) {
        const exists = openDocumentIds.value.some(
            openDocId => openDocId === id
        );
        
        if (!exists) {
            openDocumentIds.value.push(id);
        }
    }

    // removes a document from the head-bar.
    function closeDocument(id) {
        openDocumentIds.value = openDocumentIds.value.filter(
                openDocId => openDocId !== id,
            );

        if (activeDocumentId.value === id) {
            activeDocumentId.value = '';
        }
    }

    function setActiveDocument(id) {
        const doc  = documents.value.find(
            doc => doc._id === id
        );

        activeDocumentId.value = doc._id;
    }

    function shiftActiveDocument(docToBeClosed, offset) {
        const index = openDocumentIds.value.findIndex(
            openDocId => openDocId === docToBeClosed._id
        );

        if (docToBeClosed._id !== activeDocumentId.value) {
            return;
        }

        if (index > 0) {
            activeDocumentId.value = openDocumentIds.value[index + Number(offset)];
        } else if  (index === 0 && openDocumentIds.value.length > 1) {
            activeDocumentId.value = openDocumentIds.value[index + 1];
        } else if (index !== -1) {
            activeDocumentId.value = null;
        }
    }

    function handleCloseDocuments(doc) {
        shiftActiveDocument(doc, -1);
        closeDocument(doc._id);
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
        setActiveDocument,
        handleCloseDocuments
    };
}