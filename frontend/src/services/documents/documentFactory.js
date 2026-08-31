import { Validator } from '@/services/validator';

export function createDocument(id, content, title, version, dirty = false) {
    Validator.validateStringEmptyNotAllowed(id);
    Validator.validateStringEmptyAllowed(content);
    Validator.validateStringEmptyAllowed(title);
    Validator.validateNumber(version);

    return {
        id,
        content,
        title,
        version,
        dirty,
        userId: localStorage.getItem('userId'),
    };
}

export function createDocuments(documents) {
    Validator.validateArrEmptyAllowed(documents);

    const result = [];

    for(const document of documents) {
        result.push(createDocument(
            document.id,
            document.content,
            document.title,
            document.version,
            document.dirty != null ? document.dirty : false
        ));
    }

    return result;
}