import { Validator } from "../validator";
import { 
    GETimageIdsForDocumentId,
    GETimageById,
    POSTnewImage,
    DELETEimage 
} from "@/constants/endpoints";
import { authenticatedFetch } from "../accessToken";

export async function newServerImage(docId, name, file) {
    // validate Parameters
    Validator.validateStringEmptyNotAllowed(docId);
    Validator.validateStringEmptyNotAllowed(name);
    Validator.validateFile(file);

    let result = undefined;

    // multer expects a multipart form upload.
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name);
    formData.append('docId', docId);

    try {
        // POST image to server
        const response = await authenticatedFetch(
            POSTnewImage, 
            {
                method: 'POST',
                body: formData
            },
        );

        if (response.status != 200) {
            return result;
        }

        // get json content of response
        const data = await response.json();

        // if image has been successfully created return id
        if (data.success) {
            result = data.id;
        }
    } finally {
        return result;
    }
}

export async function deleteImageFromServer(id) {
    // valiate parameter
    Validator.validateStringEmptyNotAllowed(id);

    let result = false;
    try {
    // delete the id from the server
        const response = await authenticatedFetch(DELETEimage, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
        });

        result = await response.json().success;
    } finally {
        return result;
    }
}

// fetches all imageIds that belong to passed documents
export async function serverFetchImageIdsForDocuments(documents) {
    Validator.validateArrEmptyAllowed(documents);

    const tasks = [];
    const result = {
        arr: [],
        serverWasReached: true
    };
    
    for (const doc of documents) {
        tasks.push(authenticatedFetch(
            GETimageIdsForDocumentId + doc.id
        ));
    }

    let responses = [];

    try { 
        // wait for all fetch requests to finish
        responses = await Promise.all(tasks);
    } catch {
        // if fetch is unsuccessful the server is unreachable and we exit
        result.serverWasReached = false;
        return result;
    }

    for (const response of responses) {
        // continue if fetch was not successfull
        if (response.status != 200) {
            continue;
        }

        let json = [];
        try {
            json = await response.json();
        } catch {
            result.serverWasReached = false;
            return result;
        }

        // push individual imageIds to result
        for (const imageId of json.images) {
            result.arr.push(imageId);
        }
    }

    return result;
}

// fetches all image objects for passed image ids
export async function serverFetchImagesForIds(ids) {
    // validate parameter
    Validator.validateArrEmptyAllowed(ids);

    // asynchronous fetch of all required images
    try {
        const result = await Promise.all(ids.map(async (id) => {
            const response = await authenticatedFetch(GETimageById + id);
            
            if (response.status !== 200) {
                return;
            }

            const image = await response.blob();

            return {
                id,
                name: response.headers
                    .get('Content-Disposition')
                    ?.match(/filename='(.+)'/)?.[1] ?? '',
                image,
            };
        }));
        
        return result;
    } catch {
        return [];
    }
}