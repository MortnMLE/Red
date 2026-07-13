import { Validator } from "../validator";

export async function newServerImage(docId, name, file) {
    // validate Parameters
    Validator.validateStringEmptyNotAllowed(docId);
    Validator.validateStringEmptyNotAllowed(name);
    Validator.validateFile(file);

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
            return json.id;
        }
    } catch (err) {
        console.error(err.message);
        
        return null;
    }
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