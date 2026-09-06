import { addOrSetLocalRecord } from "../indexedDB/indexedDbApi";
import { DB_DOCUMENTS } from "@/constants/stores";
import { backupDocument } from "./backupDocument";

export async function tryCreateNewLocalDocument(document) {
    try {
        await addOrSetLocalRecord(DB_DOCUMENTS, document);
    } catch {
        // do nothing
    }
}

export async function tryDeleteLocalDocument(localDocument, serverDocument) {
    if (!serverDocument.flags.deleted || localDocument.flags.deleted) {
        return;
    }

    try {
        localDocument.flags.deleted = true;
        await addOrSetLocalRecord(DB_DOCUMENTS, localDocument);
    } catch {
        //do nothing
    }
}

export async function tryUpdateLocalDocument(localDocument, serverDocument) {
    if (localDocument.flags.deleted || serverDocument.flags.deleted) {
        return;
    } else if (serverDocument.version < localDocument.version) {
        return; 
    } else if (serverDocument.version === localDocument.version) {
        return; 
    } 

    try {
        if (localDocument.flags.dirty) {
            await backupDocument(localDocument);
        }

        localDocument.title = serverDocument.title;
        localDocument.content = serverDocument.content;
        localDocument.version = serverDocument.version;
        localDocument.flags.dirty = false;

        await addOrSetLocalRecord(DB_DOCUMENTS, localDocument);
    } catch {
        //do nothing
    }
}