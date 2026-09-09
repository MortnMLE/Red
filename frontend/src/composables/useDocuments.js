import { onMounted, ref, computed, toRaw } from 'vue';
import { addOrSetLocalRecord, getLocalRecord } from '@/services/indexedDB/indexedDbApi';
import { DELETEdoc, POSTnewDocument, PATCHdocument } from '@/constants/endpoints';
import { DEFAULT_DOCUMENT } from '@/constants/defaultDocument';
import { debouncer } from '@/services/debouncer';
import { DB_DOCUMENTS } from '@/constants/stores';
import { Validator } from '@/services/validator';
import { authenticatedFetch } from '@/services/authentication';
import { getDocumentsFromLocalStorage, loadDocuments } from '@/services/documents/documentInitialization';
import { syncLocalDocument, syncServerDocument } from '@/services/documents/documentSync';
import { createDocument, createDocumentFlags } from '@/services/documents/documentFactory';
import { updateDocumentTitleLinks } from '@/services/documents/documentLinks';

export function useDocuments(options = {}) {
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

    const { 
        countTempIds = 0,
        updateCountTempIds = async () => {} 
    } = options;
    
    // flags a document as deleted and removes the document from the sidebar
    async function deleteDocument(doc) {
        doc.flags.deleted = true;

        // flag server document as deleted
        const serverTask = authenticatedFetch(DELETEdoc, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: doc.id
            }),
        });

        // flag local document as deleted
        const localTask = addOrSetLocalRecord(DB_DOCUMENTS, 
            structuredClone(toRaw(doc))
        );

        try {
            // await both the fetch to the server and the local change
            await Promise.all([serverTask, localTask]);
        } finally {
            // remove the document from the sidebar
            documents.value = documents.value.filter(
                activeDocument => activeDocument.id !== doc.id
            );
        }
    }

    // creates a document locally and on the server, if possible
    async function handleDocumentCreation() {
        while(creationInProgress) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        creationInProgress = true;

        const tempId = `temp-${Number(countTempIds.value) + 1}`;

        const newDoc = createDocument(
            tempId,
            '',
            'Title',
            1,
            createDocumentFlags(false, false, true),
        );

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
                    version: newDoc.version,
                    flags: newDoc.flags
                }),
            });

            const data = await response.json();

            if (data.success) {
                newDoc.id = data.id;
                newDoc.flags.isNew = false;

                const index = openDocuments.value.findIndex(id => id === tempId);

                if (index !== -1) {
                    openDocuments.value[index] = newDoc.id;
                }
            }
        } catch  {
            // do nothing
        }
        finally {
            await addOrSetLocalRecord(DB_DOCUMENTS, newDoc);
            await updateCountTempIds();

            creationInProgress = false;
        }
    }

    function openDocument(id) {
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

    // removes the document from the document bar
    function closeDocument(id) {
        Validator.validateStringEmptyNotAllowed(id);

        // remove id from openDocuments
        openDocumentIds.value = openDocumentIds.value.filter(
                openDocId => openDocId !== id,
        );
    }

    // assigns a document to the activeDocument ref
    function setActiveDocument(id) {
        Validator.validateStringEmptyNotAllowed(id);

        const doc = documents.value?.find(
            doc => doc.id === id
        );

        activeDocumentId.value = doc?.id;
    }

    // shifts the active document in the document bar
    function shiftActiveDocument(docToBeClosed, offset) {
        Validator.validateObjectNotNull(docToBeClosed);
        Validator.validateNumber(offset);
        
        if (offset === 0) {
            throw new Error('must not be 0');
        }

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

    // shifts the currently active document from openDocumentIds ref
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

        return documents.value.find(
            doc => doc.id === nextId
        );
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
                // do nothing
            }
        },
        500
    )

    // debounces incoming changes to reduce unnecessary posts to the server
    const syncRemoteDebounced = debouncer(
        async (ref) => {
            try {
                const versionToBePosted = ref.value.version;

                const response = await authenticatedFetch(PATCHdocument, {
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

                if (response.status === 200 && 
                    versionToBePosted === ref.value.version
                ) {
                    ref.value.flags.dirty = false;
                    await addOrSetLocalRecord(DB_DOCUMENTS, structuredClone(toRaw(ref.value)));
                }
            } catch {
                // do nothing
            }
        },
        1000
    )

    // udpates the activeDocument ref and calls the debounced sync functions
    function updateDocumentContent(content, title) {
        Validator.validateStringEmptyAllowed(content);
        Validator.validateStringEmptyAllowed(title);

        // if the activeDocument is the default-document we exit
        if (activeDocument.value.id === 'welcome') {
            return;
        }
        
        const previousTitle = activeDocument.value.title;
        const nextTitle = title !== '' ? title : 'Title';

        // update the content and title of the active document
        activeDocument.value.content = content;
        activeDocument.value.title = nextTitle;
        activeDocument.value.flags.dirty = true;

        // queue change to be stored on the server and local storage
        // using a debouncer
        saveLocalDebounced(activeDocument);
        syncRemoteDebounced(activeDocument);

        // if the title has changed, all embedded links need to be udpated
        if (previousTitle === nextTitle) {
            return;
        }

        const documentsToUpdate = updateDocumentTitleLinks(
            documents.value,
            activeDocument.value,
            previousTitle,
            nextTitle,
        );

        for (const updatedDocument of documentsToUpdate) {
            const document = documents.value.find(
                currentDocument => currentDocument.id === updatedDocument.id
            );

            document.content = updatedDocument.content;
            document.flags.dirty = true;
            persistRenamedDocument(document);
        }
    }

    async function persistRenamedDocument(document) {
        document.version += 1;

        try {
            await addOrSetLocalRecord(
                DB_DOCUMENTS,
                structuredClone(toRaw(document)),
            );

            const response = await authenticatedFetch(PATCHdocument, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: document.id,
                    content: document.content,
                    title: document.title,
                    version: document.version,
                }),
            });

            if (response.status === 200) {
                document.flags.dirty = false;
                await addOrSetLocalRecord(
                    DB_DOCUMENTS,
                    structuredClone(toRaw(document)),
                );
            }
        } catch {
            // the next synchronization will retry the update
        }
    }

    // initialization
    onMounted(async () => {
        if (documents.value.length > 0) {
            docsInitialized.value = true;
            return;
        }

        const loadedDocuments = await loadDocuments();
        const { serverDocuments = [], localDocuments = [] } = loadedDocuments ?? {};
        const tasks = [];

        // synchronization between the local storage and server
        for(const document of localDocuments) {
            tasks.push(syncLocalDocument(document, serverDocuments));
        }

        for(const document of serverDocuments) {
            tasks.push(syncServerDocument(document, localDocuments));
        }

        await Promise.all(tasks);

        // -> allow initialization for images
        docsInitialized.value = true;

        // update the global documents for display in the sidebar
        // only display not deleted documents
        const updatedDocuments = await getDocumentsFromLocalStorage() ?? [];
        documents.value = updatedDocuments.filter(doc => !doc.flags.deleted);
    });

    return {
        documents,
        activeDocument,
        openDocuments,
        handleDocumentCreation,
        deleteDocument,
        openDocument,
        setActiveDocument,
        updateDocumentContent,
        persistRenamedDocument,
        shiftActiveDocument,
        closeDocument,
        docsInitialized,
        getNextActiveDocument,
        openDocumentIds,
    };
}