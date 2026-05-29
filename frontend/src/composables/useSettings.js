import { ref, onMounted, watch } from 'vue';
import { DB_SETTINGS, DB_DOCUMENTS,
    createLocalDatabase, addOrSetLocalRecord, 
    localDbExists, getLocalRecordsByIndex
} from '@/services/indexedDbService';

const countTempIds = ref(0);

export function useSettings() {

    const enableVim = ref(Boolean);

    async function loadSettings() {
        try {
            if (await localDbExists(DB_SETTINGS)) {
                updateCountTempIds();

                const settings = await getLocalRecordsByIndex(
                    DB_SETTINGS,
                    'user_id',
                    localStorage.userId
                );

                if (settings) {
                    const vimSetting = settings.find(
                        setting => setting.key === 'vimEnabled'
                    );

                    enableVim.value = vimSetting?.value ?? false;
                    
                    console.log(`fetched enableVim: ${enableVim.value}`);
                }
            } else {
                await createLocalDatabase(
                    DB_SETTINGS,
                    'key', 
                    ['user_id', 'user_id', { unique: false }]
                );

                await addOrSetLocalRecord(DB_SETTINGS, { 
                    key: 'countTemporaryIds',
                    value: 0,
                    user_id: localStorage.userId
                });

                await addOrSetLocalRecord(DB_SETTINGS, { 
                    key: 'enableVim',
                    value: true, 
                    user_id: localStorage.userId
                });

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
            value: count,
            user_id: localStorage.userId
        });
        countTempIds.value = count;
    }

    onMounted(() => {
        loadSettings();
    });

    return {
        countTempIds, 
        updateCountTempIds,
        enableVim
    };
}
