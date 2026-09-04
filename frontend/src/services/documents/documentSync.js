import { Validator } from "@/services/validator";
import { 
    tryCreateNewLocalDocument, 
    tryDeleteLocalDocument, 
    tryUpdateLocalDocument 
} from "./localDocumentService";
import {
    tryDeleteServerDocument,
    tryPostNewDocumentToServer,
    tryUpdateServerDocument
} from './serverDocumentService';

export async function syncLocalDocument(localDocument, serverDocuments) {
    Validator.validateArrEmptyAllowed(serverDocuments);
    Validator.validateObjectNotNull(localDocument);

    const serverDocument = serverDocuments.find(document => document.id === localDocument.id);

    if (serverDocument != null) {
        await tryDeleteLocalDocument(localDocument, serverDocument);
        await tryUpdateLocalDocument(localDocument, serverDocument);
    } else {
        await tryPostNewDocumentToServer(localDocument);
    }
}

export async function syncServerDocument(serverDocument, localDocuments) {
    Validator.validateArrEmptyAllowed(localDocuments);
    Validator.validateObjectNotNull(serverDocument);

    const localDocument = localDocuments.find(document => document.id === serverDocument.id);

    if (localDocument != null) {
        await tryDeleteServerDocument(localDocument, serverDocument);
        await tryUpdateServerDocument(localDocument, serverDocument);
    } else {
        await tryCreateNewLocalDocument(serverDocument);
    }
}