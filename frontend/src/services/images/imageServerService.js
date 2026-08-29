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

    let result = '';

    // create the body for the POST
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name);
    formData.append('userId', localStorage.userId);
    formData.append('docId', docId);

    try {
        // POST image to server
        const response = await authenticatedFetch(
            POSTnewImage, 
            {
                method: 'POST',
                body: JSON.stringify(formData),
            },
        );

        // catch bug
        Validator.validateObjectNotNull(response);

        // get json content of response
        const data = await response.json();

        // if image has been successfully created return id
        if (data.success) {
            result = data.id;
        }
    } catch (err) {
        console.error(err.message);
    }

    return result;
}

export async function deleteImageFromServer(id) {
    // valiate parameter
    Validator.validateStringEmptyNotAllowed(id);

    try {
    // delete the id from the server
        const response = await authenticatedFetch(DELETEimage, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
        });

        return await response.json().success;
    } catch (err) {
        return false;
    }
}

// fetches all imageIds that belong to passed documents
export async function serverFetchImageIdsForDocuments(documents) {
    // validate parameter
    Validator.validateArrEmptyAllowed(documents);
    
    // initialize tasks and result
    const tasks = [];
    const result = {
        arr: [],
        serverWasReached: true
    };
    
    // start individual fetch requests
    for (const doc of documents) {
        tasks.push(authenticatedFetch(
            GETimageIdsForDocumentId + doc.id
        ));
    }

    // initialize responses
    let responses = [];

    // try block, errors may be thrown during the await all
    try { 
        // wait for all fetch requests to finish
        responses = await Promise.all(tasks);
    } catch (err) {
        // if fetch is unsuccessful the server is unreachable and we exit
        result.serverWasReached = false;
        return result;
    }

    // loop through all responses and add images to result
    for (const response of responses) {
        // continue if a request resulted in an empty response
        if (!response) {
            continue;
        }

        // try getting json content
        let json;
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
            
            return {
                id,
                image: response,
            };
        }));
        
        return result;
    } catch {
        return [];
    }
}