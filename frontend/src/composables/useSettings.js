import { ref, onMounted } from 'vue';
import { DB_SETTINGS, getLocalRecord, 
    createLocalDatabase, addLocalRecord, 
    localDbExists, getLocalDocumentVersionsByUserId, 
    updateLocalRecordFull} from '@/services/indexedDbService';

export function useSettings() {
    const countTempIds = ref(0);

    async function loadSettings() {
        try {
            if (await localDbExists(DB_SETTINGS)) {
            countTempIds.value = await getLocalRecord(DB_SETTINGS, "key", "countTemporaryIds");
            } else {
            await createLocalDatabase(DB_SETTINGS, "key");
            await addLocalRecord(DB_SETTINGS, { key: "countTemporaryIds", value: 0 });
            console.log('Local settings database does not exist, created new database');
            } 
        } catch (err) {
            console.error('Error initializing local settings database: ' + err.message);
        }

    }

    async function updateCountTempIds() {
        const documents = await getLocalDocumentVersionsByUserId(localStorage.userId);

        if (documents.length === 0) {
            return;
        }

        documents.value = documents.filter(doc => 
            doc._id.includes('temp-')
        );

        const count = documents.value.length;
        await updateLocalRecordFull(DB_SETTINGS, 'countTemporaryIds', count);
        countTempIds.value = count;   
        throw err;
    }

    onMounted(() => {
        loadSettings();
    });

    return {
        countTempIds, 
        updateCountTempIds
    };
}
