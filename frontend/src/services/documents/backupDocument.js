import { authenticatedFetch } from "@/services/authentication";
import { POSTnewDocument } from "@/constants/endpoints";
import { createDocument, createDocumentFlags } from "@/services/documents/documentFactory";
import { addOrSetLocalRecord } from "@/services/indexedDB/indexedDbApi";
import { DB_DOCUMENTS } from "@/constants/stores";

export async function backupDocument(document) {
    const flags = document.flags;
    flags.dirty = false;

    const backupTitle = document.title + ' - backup';

    const response = await authenticatedFetch(POSTnewDocument, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: backupTitle,
            content: document.content,
            version: document.version,
            flags
        })
    });

    let id = '';
    if (response.status === 201) {
        const json = await response.json();
        id = json.id;
    }

    const backupDocument = createDocument(
        id !== '' ? id :document.id + '_backup',
        document.content,
        backupTitle,
        1,
        createDocumentFlags(
            false,
            false,
            true
        ),
    );

    await addOrSetLocalRecord(DB_DOCUMENTS, backupDocument);
}