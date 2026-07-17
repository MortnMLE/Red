import { Validator } from "../validator";
import { 
    endpointGetImageidsForDocId,
    endpointImageGetById,
    endpointImgNew 
} from "@/constants/endpoints";

export async function newServerImage(docId, name, file) {
    // validate Parameters
    Validator.validateStringEmptyNotAllowed(docId);
    Validator.validateStringEmptyNotAllowed(name);
    Validator.validateFile(file);

    let result = '';

    console.log(`doc_id: ${docId},\nimage size: ${file.size},\nuser_id: ${localStorage.userId}\nname ${name}`);
    // create the body for the POST
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name);
    formData.append('user_id', localStorage.userId);
    formData.append('doc_id', docId);

    try {
        // POST image to server
        const response = await fetch(
            endpointImgNew, 
            {
                method: 'POST',
                body: formData
            }
        );

        console.log(formData);

        // catch bug
        Validator.validateObjectNotNull(response);

        // get json content of response
        const json = await response.json();

        console.log(`new image returned: ${json.id}`);

        // if image has been successfully created return id
        if (json.success) {
            result = json.id;
        }
    } catch (err) {
        console.error(err.message);
    }

    return result;
}

export async function deleteImageFromServer(id) {
    // valiate parameter
    Validator.validateStringEmptyNotAllowed(id);

    // delete the id from the server
    const response = serverRequest(
        'DELETE',
        { id: id },
        endpointImgDelete
    );

    return response.success;
}

// fetches all imageIds that belong to passed documents
export async function serverFetchImageIdsForDocuments(documents) {
    // initialize tasks and result
    const tasks = [];
    const result = {
        arr: [],
        serverWasReached: true
    };
    
    // start individual fetch requests
    for (const doc of documents) {
        tasks.push(fetch(
            endpointGetImageidsForDocId + doc._id
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

        // get json content
        const json = await response.json();
        
        // push individual imageIds to result
        for (const imageId of json.images) {
            result.arr.push(imageId);
        }
    }

    return result;
}

// fetches all image objects for passed image ids
export async function serverFetchImagesForIds(ids) {
    // initialize result object
    const result = [];

    // asynchronous fetch of all required images
    const tasks = [];
    for (const id of ids) {
        tasks.push(fetch(
            endpointImageGetById + id
        ));
    }

    let responses = [];
    // await for all fetches to finish
    try {
        responses = await Promise.all(tasks);
    } catch {

        return result;
    }

    return responses;
    // consolidate valid responses
    // for (const response of responses) {
    //     if (!response) {
    //         continue;
    //     }

    //     const json = await response.json();
    //     result.push(json);        
    // }

    // return valid image objects
    // return result;
}