import { Validator } from '@/services/validator';

export function createDocument(id, content, title, version, flags) {
    Validator.validateStringEmptyNotAllowed(id);
    Validator.validateStringEmptyAllowed(content);
    Validator.validateStringEmptyAllowed(title);
    Validator.validateNumber(version);

    return {
        id,
        content,
        title,
        version,
        userId: localStorage.getItem('userId'),
        flags
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
            document.flags
        ));
    }

    return result;
}

export function createDocumentFlags(dirty, deleted, isNew) {
    return {
        dirty: dirty != null ? dirty : false,
        deleted: deleted != null ? deleted : false,
        isNew: isNew != null ? isNew : false,
    };
}