import { ref, onMounted } from 'vue';
import { DB_SETTINGS, getLocalRecord, 
    createLocalDatabase, addLocalRecord, 
    localDbExists, getLocalDocumentVersionsByUserId, 
    updateLocalRecordFull,
    updateLocalRecordPartial} from '@/services/indexedDbService';

const countTempIds = ref(0);

export function useSettings() {

    async function loadSettings() {
        try {
            if (await localDbExists(DB_SETTINGS)) {
                const response = await getLocalRecord(DB_SETTINGS, 'key', 'countTemporaryIds');
                
                if (response) {
                    countTempIds.value = response.value.value;
                }
            } else {
                await createLocalDatabase(DB_SETTINGS, 'key');
                await addLocalRecord(DB_SETTINGS, { key: 'countTemporaryIds', value: 0 });
                console.log('Local settings database does not exist, created new database');
            } 
        } catch (err) {
            console.error('Error initializing local settings database: ' + err.message);
        }

    }

    async function updateCountTempIds() {
        let documents = await getLocalDocumentVersionsByUserId(localStorage.userId);
        let count = 0;

        if (documents.length === 0) {
            count = 0;
        } else {
            documents = documents.filter(doc => 
                doc._id.includes('temp-')
            );

            count = documents.length;
            console.log('count: ' + count);
            await updateLocalRecordFull(DB_SETTINGS, 'countTemporaryIds', {
                key: 'countTemporaryIds',
                value: count
            });
        }

        countTempIds.value = count;   
    }

    onMounted(() => {
        loadSettings();
    });

    return {
        countTempIds, 
        updateCountTempIds
    };
}
