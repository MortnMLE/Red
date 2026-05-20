import { ref, onMounted } from 'vue';
import { DB_SETTINGS, getLocalRecord, 
    createLocalDatabase, addLocalRecord, 
    localDbExists } from '@/services/indexedDbService';

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

    onMounted(() => {
        loadSettings();
    });

    return {
        countTempIds
    };
}
