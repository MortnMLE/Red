import { Validator } from '@/services/validator';
import { clearLocalDatabase } from './indexedDbApi';

export async function resetDB(storeObject, createFunc) {
    Validator.validateObjectNotNull(storeObject);
    Validator.validateAsyncFunction(createFunc);

    let result;

    try {
        await clearLocalDatabase(storeObject);
        result = await createFunc();
    } catch (error) {
        result = false;
    } finally {
        return result;
    }
}