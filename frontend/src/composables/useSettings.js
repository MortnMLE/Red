import { ref, onMounted } from 'vue';
import { 
    createStore,
    addOrSetLocalRecord, 
    storeExists,
    getLocalRecordsByIndex,
} from '@/services/indexedDB/indexedDbApi';

import { 
    DB_DOCUMENTS,
    DB_IMAGES,
    DB_SETTINGS
} from '@/constants/stores';

const countTempIds = ref(0);

export function useSettings() {

    const enableVim = ref(Boolean);

    async function loadSettings() {
        try {
            updateCountTempIds();

            const settings = await getLocalRecordsByIndex(
                DB_SETTINGS,
                'userId',
                localStorage.userId
            );

            if (settings) {
                const vimSetting = settings.find(
                    setting => setting.key === 'enableVim'
                );

                enableVim.value = vimSetting.value ?? false;
            }        
        } catch (err) {
            console.error('Error initializing local settings database: ' + err.message);
        }
    }

    async function updateCountTempIds() {
        let documents = await getLocalRecordsByIndex(
            DB_DOCUMENTS,
            'userId', 
            localStorage.userId
        );

        let images = await getLocalRecordsByIndex(
            DB_IMAGES,
            'userId',
            localStorage.userId
        );

        const countDocs = documents.filter(doc => 
            doc.id.includes('temp-')
        ).length;

        const countImgs = images.filter(doc => 
            doc.id.includes('temp-')
        ).length;

        const count = countDocs + countImgs;

        await addOrSetLocalRecord(DB_SETTINGS, {
            key: 'countTemporaryIds',
            value: count,
            userId: localStorage.userId
        });
        countTempIds.value = count;
    }

    onMounted(async () => {
        await loadSettings();
    });

    return {
        countTempIds, 
        updateCountTempIds,
        enableVim
    };
}
