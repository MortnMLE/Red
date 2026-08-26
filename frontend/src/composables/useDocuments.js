import { onMounted, ref, computed, toRaw } from 'vue';
import { getLocalRecordsByIndex,
    createStore,
    storeExists, 
    deleteLocalRecord,
    addOrSetLocalRecord,
    clearLocalDatabase
 } from '@/services/indexedDB/indexedDbService';

import { GETdocsForUser, DELETEdoc, POSTnewDocument, PATCHdocument } from '@/constants/endpoints';
import { DEFAULT_DOCUMENT } from '@/constants/defaultDocument';
import { debouncer } from '@/services/debouncer';
import { DB_DOCUMENTS } from '@/constants/stores';
import { Validator } from '@/services/validator';
import { authenticatedFetch } from '@/services/accessToken';

//state
const documents = ref([]);
const activeDocumentId = ref('');
const openDocumentIds = ref([]);
const docsInitialized = ref(false);

const links = ref([]);
let creationInProgress = false;

const activeDocument = computed (() => 
    documents.value.find(
        doc => doc._id === activeDocumentId.value
    ) || DEFAULT_DOCUMENT
);

const openDocuments = computed (() =>
    documents.value.filter(
        doc => openDocumentIds.value.includes(doc._id)
    )
);

export function getDocumentById(id) {
    Validator.validateArrEmptyAllowed(documents.value);
    Validator.validateStringEmptyNotAllowed(id);

    return documents.value.find(
        (doc) => doc._id === id
    );
}

export function useDocuments(options = {}) {
    // document: 
    // _id: string
    // title: string
    // content: string
    // version: number
    // pendingSync: boolean
    // deleted: boolean

    const { 
        countTempIds,
        updateCountTempIds 
    } = options;
    
    // synchronization with IndexedDB
    async function loadDocuments() {
        const serverDocuments = [];
        const localDocuments = [];

        try {
        // Check if local database exists and load documents from local storage
            if (await storeExists(DB_DOCUMENTS)) {
                localDocuments = await getLocalRecordsByIndex(
                    DB_DOCUMENTS,
                    'user_id',
                    localStorage.userId
                );
            } else { 
                await createStore(
                    DB_DOCUMENTS, 
                    "_id",
                    [{
                        indexName: 'user_id',
                        keyPath: 'user_id',
                        options: { unique: false }
                    }]
                );
            }
        } catch (err) {
            await clearLocalDatabase(DB_DOCUMENTS);
            await loadDocuments(); // Retry loading documents after clearing local database
        }

        try {
            // Fetch documents from server
            const response = await authenticatedFetch(GETdocsForUser, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: { user_id: localStorage.userId }
            });

            if (response.success) {
                // serverDocuments = await JSON.parse(fetchedDocs.documents);
                serverDocuments = await response.json();
            }
        } catch (err) {
            console.warn('Error loading documents: ', err);
        }

        return { serverDocuments, localDocuments };
    }

    async function syncDocuments(serverDocuments, localDocuments) {
        //postToserverDocs = documents that should be updated or added on the server
        let docsToBeCreated = [];
        let docsToBeDeleted = [];
        let docsToBePatched = [];
        
        docsToBeDeleted = localDocuments.filter(
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

                    documents.value.push(serverDoc);
                    continue;
                }

                if (localDoc.deleted) {
                    const response = await authenticatedFetch(DELETEdoc, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: { _id: localDoc._id}
                    });
                   
                    if (response.success) {
                        await deleteLocalRecord(DB_DOCUMENTS, localDoc._id);
                    }
                }

                if (localDoc.version > serverDoc.version) {
                    docsToBePatched.push(localDoc);
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

            docsToBeCreated.push(...localDocuments);
        } catch (err) {
            console.warn('Error synchronizing server-documents: ', err);
        }

        // Handle documents that exist in local storage but not on server
        let serverIsReachable = true;
        
        for (const doc of docsToBeCreated) {
            let newDoc = doc;
            try{
                //Only try to reach the server once.
                if (serverIsReachable) {
                    const response = await authenticatedFetch(POSTnewDocument, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: {
                            user_id: doc.user_id,
                            title: doc.title,
                            content: doc.content,
                            version: doc.version
                        }
                    });

                    if (response.success) {
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
                        serverIsReachable = false;
                    }
                }
            } catch (err) {
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
            for (const doc of docsToBeDeleted) {
                try {
                    const response = await authenticatedFetch(DELETEdoc, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: { _id: doc._id }
                    });
                    
                    if (response.success) {
                        deleteLocalRecord(DB_DOCUMENTS, doc._id);
                    }
                } catch (err) {
                    console.warn('Could not delete document from server. Skipping deletion process', err);
                }
            }

            for (const doc of docsToBePatched) {
                try {
                    const response = authenticatedFetch(PATCHdocument, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: {
                            _id: doc._id,
                            content: doc.content,
                            title: doc.title,
                            localVersion: doc.localVersion
                        },
                    });

                    if (!response.success) {
                        console.error(`error during patch: ${response.message}; ${doc._id}`);
                    }
                } catch (err) {

                }
            }
        }
    }

    async function deleteDocument(doc) {
        const id = doc._id;
        
        documents.value = documents.value.filter(
            doc => doc._id !== id
        )
        
        try {
            const response = await authenticatedFetch(DELETEdoc, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {
                    _id: id
                },
            });

            if (response.success) {
                deleteLocalRecord(DB_DOCUMENTS, id);
            } else {
                doc.deleted = true;
                addOrSetLocalRecord(DB_DOCUMENTS, structuredClone(toRaw(doc)));
            }
        } catch (err) {
            doc.deleted = true;
            addOrSetLocalRecord(DB_DOCUMENTS, structuredClone(toRaw(doc)));
        } 
    }

    // actions for creation, deletion and updating documents 
    async function createDocument() {

        while(creationInProgress) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        creationInProgress = true;

        const tempId = `temp-${Number(countTempIds.value) + 1}`;

        
        let newDoc = {
            _id: tempId,
            user_id: localStorage.userId,
            title: 'Title',
            content: '',
            version: 0,
            pendingSync: true,
            deleted: false
        }

        documents.value.push(newDoc);
        openDocument(newDoc._id, newDoc.title);
        setActiveDocument(newDoc._id);
        
        try {
            const response = await authenticatedFetch(POSTnewDocument, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {
                    user_id: localStorage.userId,
                    title: newDoc.title,
                    content: newDoc.content,
                    version: newDoc.version
                },
            });

            if (response.success) {

                
                newDoc._id = response._id;
                newDoc.pendingSync = false;
                newDoc.deleted = false;

                const index = openDocuments.value.findIndex(id => id === tempId);

                if (index !== -1) {
                    openDocuments.value[index] = newDoc._id;
                }
            } else {

            }
        } catch (err) {
            console.error('failed to add document to server');
        }
        finally {
            await addOrSetLocalRecord(DB_DOCUMENTS, newDoc);
            await updateCountTempIds();

            creationInProgress = false;
        }
    }

    function openDocument(id) {
        // validate parameter
        Validator.validateStringEmptyNotAllowed(id);

        // check if the document is already open
        const exists = openDocumentIds.value.some(
            openDocId => openDocId === id
        );
        
        // if the document is not open yet, add it to openDocumentIds
        if (!exists) {
            openDocumentIds.value.push(id);
        }
    }

    function closeDocument(id) {
        // validate parameter
        Validator.validateStringEmptyNotAllowed(id);

        // remove id from openDocuments
        openDocumentIds.value = openDocumentIds.value.filter(
                openDocId => openDocId !== id,
        );
    }

    function setActiveDocument(id) {
        // validate paramter
        Validator.validateStringEmptyNotAllowed(id);

        const doc = documents.value?.find(
            doc => doc._id === id
        );

        activeDocumentId.value = doc?._id;
    }

    function shiftActiveDocument(docToBeClosed, offset) {
        // validate parameters
        Validator.validateObjectNotNull(docToBeClosed);
        Validator.validateNumber(offset);
        
        if (offset === 0) {
            throw new Error('must not be 0');
        }

        // 
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

    function getNextActiveDocument(docToBeClosed, offset) {
        // validate parameters
        Validator.validateObjectNotNull(docToBeClosed);
        Validator.validateNumber(offset);

        // if the offset is zero we return the currently active document
        if (offset === 0) {
            return activeDocument.value;
        }

        // if the document to be closed is not the activeDocument
        // we do not need to change the active document, hence return active document 
        if (docToBeClosed._id !== activeDocumentId.value) {
            return activeDocument.value;
        }

        // fetch the index of the document to be closed in opendocuments
        const index = openDocumentIds.value.findIndex(
            id => id === docToBeClosed._id
        );

        let nextId = null;
        
        // if position of the document in opendocuments is greater than 0, we 
        if (index > 0) {
            nextId = openDocumentIds.value[index + Number(offset)];
        } else if  (index === 0 && openDocumentIds.value.length > 1) {
            nextId = openDocumentIds.value[index + 1];
        }

        if (!nextId) {
            return undefined;
        }

        return getDocumentById(nextId);
    }

    // debounces incoming changes to reduce unnecessary write to local storage
    const saveLocalDebounced = debouncer(
        async (ref) => {
            try {
                ref.value.version += 1;
                await addOrSetLocalRecord(
                    DB_DOCUMENTS,
                    structuredClone(toRaw(ref.value)), 
                );

            } catch (err) {
                console.error(err);
            }
        },
        200
    )

    // debounces incoming changes to reduce unnecessary posts to the server
    const syncRemoteDebounced = debouncer(
        async (ref) => {
            try {
                await authenticatedFetch( PATCHdocument, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        _id: ref.value._id,
                        content: ref.value.content,
                        title: ref.value.title,
                        localVersion: ref.value.version
                    }
                });
            } catch (err) {
                console.error(err);
            }
        },
        300
    )

    function updateDocumentContent(content, title) {
        // validate parameters
        Validator.validateStringEmptyAllowed(content);
        Validator.validateStringEmptyAllowed(title);

        // if the activeDocument is the default-document we exit
        if (activeDocument.value._id === 'welcome') {
            return;
        }
        
        // update the content and title of the active document
        activeDocument.value.content = content;
        activeDocument.value.title = title !== '' ? title : 'Title';

        // queue change to be stored on the server and local storage
        // using a debouncer
        saveLocalDebounced(activeDocument);
        syncRemoteDebounced(activeDocument);
    }

    // initialization
    onMounted(async () => {       
        const { serverDocuments, localDocuments } = await loadDocuments();
        await syncDocuments(serverDocuments, localDocuments);

        docsInitialized.value = true;
    });

    return {
        documents,
        activeDocument,
        openDocuments,
        createDocument,
        deleteDocument,
        openDocument,
        setActiveDocument,
        updateDocumentContent,
        shiftActiveDocument,
        closeDocument,
        docsInitialized,
        getNextActiveDocument
    };
}