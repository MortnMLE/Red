import { authenticatedFetch } from "../accessToken";
import { addOrSetLocalRecord, replaceLocalDbEntry } from "../indexedDB/indexedDbApi";
import { DELETEdoc, PATCHdocument, POSTnewDocument } from "@/constants/endpoints";
import { DB_DOCUMENTS } from "@/constants/stores";

export async function tryUpdateServerDocument(localDocument, serverDocument) {
    if (localDocument.version <= serverDocument.version) {
        return;
    } else if (!localDocument.flags.dirty) {
        return;
    } else if (serverDocument.flags.deleted) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(PATCHdocument, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: localDocument.id,
                content: localDocument.content,
                title: localDocument.title,
                version: localDocument.version,
                flags: localDocument.flags
            }),
        });

        if (response.status != 200) {
            return;
        }

        localDocument.flags.dirty = false;
        await addOrSetLocalRecord(DB_DOCUMENTS, localDocument);
    } catch (error) {
        console.log(`tryUpdateServerDocument throws: ${error}`);
    }
}

export async function tryPostNewDocumentToServer(document) {
    if (!document.flags.isNew || document.flags.deleted) {
        return;
    }

    try {
        const response = await authenticatedFetch(POSTnewDocument, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: document.title,
                content: document.content,
                version: document.version,
                flags: document.flags
            }),
        });

        if (response.status != 201) {
            return;
        }

        const json = await response.json();

        const oldId = document.id;
        document.id = json.id;
        document.flags.isNew = false;

        await replaceLocalDbEntry(DB_DOCUMENTS,
            document,
            oldId
        );
    } catch (error) {
        console.log(`tryPostNewDocumentToServer: ${error}`);
    }
}

export async function tryDeleteServerDocument(localDocument, serverDocument) {
    if (!localDocument.flags.deleted || localDocument.flags.isNew) {
        return;
    } else if (serverDocument.flags.deleted) {
        return;
    }

    try {
        const a = await authenticatedFetch(DELETEdoc, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: localDocument.id }),
        });

        console.log(`tryDeleteServerDocument: ${a.status}`);
        // const response = await authenticatedFetch(PATCHdocument, {
        //     method: 'PATCH',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //         id: localDocument.id,
        //         title: localDocument.title,
        //         content: localDocument.content,
        //         version: localDocument.version,
        //         flags:  localDocument.flags
        //     }),
        // });

        // if (response.status != 200) {
        //     return;
        // }

        // await addOrSetLocalRecord(DB_DOCUMENTS, localDocument);
    } catch (error) {
        console.log(`tryDeleteDocumentOnServer: ${error}`);
    }
}