import { ref, onMounted } from 'vue';
import { DB_SETTINGS, DB_DOCUMENTS,
    getLocalRecord, 
    createLocalDatabase, addOrSetLocalRecord, 
    localDbExists, getLocalRecordsByIndex
} from '@/services/indexedDbService';

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
                await addOrSetLocalRecord(DB_SETTINGS, { key: 'countTemporaryIds', value: 0 });
                console.log('Local settings database does not exist, created new database');
            } 
        } catch (err) {
            console.error('Error initializing local settings database: ' + err.message);
        }

    }

    async function updateCountTempIds() {
        let documents = await getLocalRecordsByIndex(
            DB_DOCUMENTS,
            'user_id', 
            localStorage.userId);

        const count = documents.filter(doc => 
            doc._id.includes('temp-')
        ).length;

        await addOrSetLocalRecord(DB_SETTINGS, {
            key: 'countTemporaryIds',
            value: count
        });
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
