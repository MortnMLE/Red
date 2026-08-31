import { onMounted, ref, computed, toRaw } from 'vue';
import { deleteLocalRecord,
    addOrSetLocalRecord,
 } from '@/services/indexedDB/indexedDbApi';

import { GETdocsForUser, DELETEdoc, POSTnewDocument, PATCHdocument } from '@/constants/endpoints';
import { DEFAULT_DOCUMENT } from '@/constants/defaultDocument';
import { debouncer } from '@/services/debouncer';
import { DB_DOCUMENTS } from '@/constants/stores';
import { Validator } from '@/services/validator';
import { authenticatedFetch } from '@/services/accessToken';
import { loadDocuments } from '@/services/documents/documentInitialization';

//state
const documents = ref([]);
const activeDocumentId = ref('');
const openDocumentIds = ref([]);
const docsInitialized = ref(false);

let creationInProgress = false;

const activeDocument = computed (() => 
    documents.value.find(
        doc => doc.id === activeDocumentId.value
    ) || DEFAULT_DOCUMENT
);

const openDocuments = computed (() =>
    documents.value.filter(
        doc => openDocumentIds.value.includes(doc.id)
    )
);

export function getDocumentById(id) {
    Validator.validateArrEmptyAllowed(documents.value);
    Validator.validateStringEmptyNotAllowed(id);

    return documents.value.find(
        (doc) => doc.id === id
    );
}

export function useDocuments(options = {}) {
    const { 
        countTempIds,
        updateCountTempIds 
    } = options;
    
    // synchronization with IndexedDB
    // async function loadDocuments() {
    //     let serverDocuments = [];
    //     let localDocuments = [];

    //     try {
    //         // Fetch documents from server
    //         const userId = localStorage.userId;

    //         console.log(`sending GET: ${GETdocsForUser + userId}`);

    //         const response = await authenticatedFetch(
    //             GETdocsForUser + userId
    //         );

    //         console.log(`fetched response: ${toString(response)}`);
    //         const data = await response.json();
    //         console.log(`fetched data: ${toString(data)}`);
    //         if (data.success) {
    //             serverDocuments = data.documents;
    //         }
    //     } catch (err) {
    //         console.warn(err);
    //     }

    //     return { serverDocuments, localDocuments };
    // }

    async function syncDocuments(serverDocuments, localDocuments) {
        Validator.validateArrEmptyAllowed(serverDocuments);
        Validator.validateArrEmptyAllowed(localDocuments);
        //postToServerDocs = documents that should be updated or added on the server
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
                    doc => doc.id === serverDoc.id
                );

                if (!localDoc) {
                    serverDoc.deleted = false;

                    console.log(`doc to be stored on local: ${serverDoc.id}`);

                    await addOrSetLocalRecord(
                        DB_DOCUMENTS,
                        serverDoc
                    );

                    const i = documents.value.findIndex(
                        doc => doc.id === serverDoc.id
                    );

                    if (i > -1) {
                        documents.value[i] = serverDoc;
                    } else {
                        documents.value.push(serverDoc);
                    }

                    continue;
                }

                if (localDoc.deleted) {
                    const response = await authenticatedFetch(DELETEdoc, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ id: localDoc.id}),
                    });

                    const data = await response.json();
                   
                    if (data.success) {
                        await deleteLocalRecord(DB_DOCUMENTS, localDoc.id);
                    }
                }

                if (localDoc.version > serverDoc.version) {
                    docsToBePatched.push(localDoc);
                } else {
                    serverDoc.deleted = false;

                    await addOrSetLocalRecord(
                        DB_DOCUMENTS,
                        serverDoc
                    );
                }

                localDocuments = localDocuments.filter(
                    doc => doc.id !== localDoc.id
                );
                
                const j = documents.value.findIndex( 
                    doc => doc.id === serverDoc.id 
                );

                if (j > -1) {
                    documents.value[j] = serverDoc;
                } else {
                    documents.value.push(serverDoc);
                }
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
                        body: JSON.stringify({
                            userI: doc.userId,
                            title: doc.title,
                            content: doc.content,
                            version: doc.version
                        }),
                    });

                    const data = await response.json();

                    if (data.success) {
                        newDoc = {
                            id: data.id,
                            userId: doc.userId,
                            title: doc.title,
                            content: doc.content,
                            version: doc.version,
                            deleted: false
                        }
                        
                        await deleteLocalRecord(DB_DOCUMENTS, doc.id);
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
                    d => d.id === doc.id
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
                        body: JSON.stringify({ id: doc.id }),
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                        deleteLocalRecord(DB_DOCUMENTS, doc.id);
                    }
                } catch (err) {
                    console.warn('Could not delete document from server. Skipping deletion process', err);
                }
            }

            for (const doc of docsToBePatched) {
                try {
                    const response = await authenticatedFetch(PATCHdocument, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            id: doc.id,
                            content: doc.content,
                            title: doc.title,
                            version: doc.version
                        }),
                    });

                    const data = await response.json();

                    if (!data.success) {
                        console.error(`error during patch: ${response.message}; ${doc.id}`);
                    }
                } catch (err) {

                }
            }
        }
    }

    async function deleteDocument(doc) {
        const id = doc.id;
        
        documents.value = documents.value.filter(
            doc => doc.id !== id
        )
        
        try {
            const response = await authenticatedFetch(DELETEdoc, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: id
                }),
            });

            const data = await response.json();

            if (data.success) {
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
            id: tempId,
            userId: localStorage.userId,
            title: 'Title',
            content: '',
            version: 1,
            deleted: false
        }

        documents.value.push(newDoc);
        openDocument(newDoc.id, newDoc.title);
        setActiveDocument(newDoc.id);
        
        try {
            const response = await authenticatedFetch(POSTnewDocument, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: localStorage.userId,
                    title: newDoc.title,
                    content: newDoc.content,
                    version: newDoc.version
                }),
            });

            const data = await response.json();

            if (data.success) {
                newDoc.id = data.id;
                newDoc.deleted = false;

                const index = openDocuments.value.findIndex(id => id === tempId);

                if (index !== -1) {
                    openDocuments.value[index] = newDoc.id;
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
            doc => doc.id === id
        );

        activeDocumentId.value = doc?.id;
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
            openDocId => openDocId === docToBeClosed.id
        );

        if (docToBeClosed.id !== activeDocumentId.value) {
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
        if (docToBeClosed.id !== activeDocumentId.value) {
            return activeDocument.value;
        }

        // fetch the index of the document to be closed in opendocuments
        const index = openDocumentIds.value.findIndex(
            id => id === docToBeClosed.id
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
                    body: JSON.stringify({
                        id: ref.value.id,
                        content: ref.value.content,
                        title: ref.value.title,
                        version: ref.value.version
                    }),
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
        if (activeDocument.value.id === 'welcome') {
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

        for(const serverDoc of serverDocuments) {
            console.log(`serverDoc: ${serverDoc.id}`);
        }

        for(const localDoc of localDocuments) {
            console.log(`localDoc: ${localDoc.id}`);
        }

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