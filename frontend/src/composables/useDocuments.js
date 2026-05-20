import { onMounted, ref } from 'vue';
import { DB_DOCUMENTS, getLocalDocumentVersionsByUserId,
    createLocalDatabase, localDbExists, updateLocalRecordFull, 
    getLocalRecord, deleteLocalRecord, addLocalRecord
 } from '@/services/indexedDbService';
import { postToServer } from '@/services/apiService';

export async function useDocuments() {
    const documents = ref([]);
    const serverDocuments = ref([]);
    const localVersions = ref([]);

    async function loadDocuments() {
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
    }

    async function syncDocuments() {
        try {
            // Handle synchronization between local storage and server
            for (const serverDoc of serverDocuments) {
                const localDoc = localVersions.find(doc => doc._id === serverDoc.id);

                if (!localDoc) {
                    continue;
                }

                if (localDoc.version < serverDoc.version) {
                    await updateLocalRecordFull(DB_DOCUMENTS, serverDoc._id, serverDoc);
                    localVersions = localVersions.filter(doc => doc._id !== localDoc._id);
                } else if (localDoc.version === serverDoc.version) {
                    console.log(`Document ${localDoc._id} is up to date with server version`);
                    localVersions = localVersions.filter(doc => doc._id !== localDoc._id);
                }
            }

            // Handle documents that exist in local storage but not on server
            for (const localDoc of localVersions) {
                const doc = await getLocalRecord(DB_DOCUMENTS, '_id', localDoc._id);
                console.log(doc);

                const response = await postToServer({
                    user_id: doc.user_id,
                    title: doc.title,
                    content: doc.content,
                    version: doc.version
                }, endpointDocNew);

                if (response.success) {
                    console.log(`New _id for ${localDoc._id}: ${response._id.toString()}`);
                    await deleteLocalRecord(DB_DOCUMENTS, localDoc._id);

                    await addLocalRecord(DB_DOCUMENTS, {
                    _id: response._id,
                    user_id: doc.user_id,
                    title: doc.title,
                    content: doc.content,
                    version: doc.version,
                    pendingSync: false
                    });
                } else {
                    console.error(`Failed to update document ${localDoc._id} on server`);
                    continue;
                }

                localVersions = localVersions.filter(doc => doc._id !== localDoc._id);
            }

            documents.value = serverDocuments;
        } catch (err) {
            console.error('Could not fetch documents: ' + err.message);
        }
    }

    onMounted(async () => {
        await loadDocuments();
        await syncDocuments();
    });

    return {
        documents
    };
}