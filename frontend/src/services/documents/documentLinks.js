import { Validator } from '@/services/validator';

const documentLinkPattern = /\[\[([^\[\]\r\n]+)\]\]/g;

export function replaceDocumentTitleLinks(content, oldTitle, newTitle) {
    Validator.validateStringEmptyAllowed(content);
    Validator.validateStringEmptyAllowed(oldTitle);
    Validator.validateStringEmptyAllowed(newTitle);

    if (oldTitle === newTitle) {
        return content;
    }

    return content.replaceAll(`[[${oldTitle}]]`, `[[${newTitle}]]`);
}

export function updateDocumentTitleLinks(documents, renamedDocument, oldTitle, newTitle) {
    Validator.validateArrEmptyAllowed(documents);
    Validator.validateObjectNotNull(renamedDocument);
    Validator.validateStringEmptyAllowed(oldTitle);
    Validator.validateStringEmptyAllowed(newTitle);

    return documents.filter(document =>
        document.id !== renamedDocument.id &&
        document.content.includes(`[[${oldTitle}]]`)
    ).map(document => ({
        ...document,
        content: replaceDocumentTitleLinks(document.content, oldTitle, newTitle),
    }));
}

export function renderDocumentLinks(content, documents) {
    Validator.validateStringEmptyAllowed(content);
    Validator.validateArrEmptyAllowed(documents);

    return content.replace(documentLinkPattern, (match, title) => {
        const document = documents.find(doc => doc.title === title);

        if (!document) {
            return match;
        }

        return `[${title}](#document=${encodeURIComponent(document.id)})`;
    });
}