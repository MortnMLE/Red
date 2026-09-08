import {
    onMounted,
    onBeforeUnmount,
    ref,
    watch,
    computed,
} from 'vue';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { vim } from '@replit/codemirror-vim'
import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';
import { oneDark } from '@codemirror/theme-one-dark';
import { markdownImages } from '@/services/editor/imageWidget';
import { basicSetup } from 'codemirror';
import { markdownFadeInactiveLines, removeMarkdown } from '@/services/editor/markdownService';
import { addOrSetLocalRecord, getLocalRecord, replaceLocalDbEntry } from '@/services/indexedDB/indexedDbApi';
import { DB_SETTINGS, DB_DOCUMENTS, DB_IMAGES} from '@/constants/stores';
import { toRaw, unref } from 'vue';
import { Validator } from '@/services/validator';
import { newServerImage } from '@/services/images/imageServerService';
import { PATCHdocument } from '@/constants/endpoints';
import { authenticatedFetch } from '@/services/authentication';
import { renderDocumentLinks } from '@/services/documents/documentLinks';

const vimCompartment = new Compartment();

export function useEditor(options = {}) {
    const { 
        activeDocument, 
        documents,
        onChange,
        enableVim,
        imageCache,
        imageCacheVersion = ref(0),
        createNewLocalImage,
        updateCountTempIds,
        createNewServerImage
    } = options;

    const editorElement = ref(null);
    const editorView = ref(null);

    const content = ref('');
    const renderer = new Renderer();
    const defaultImageRenderer = renderer.image.bind(renderer);

    renderer.image = (token) => {
        const imageUrl = imageCache.getUrl(token.href);
        return defaultImageRenderer({
            ...token,
            href: imageUrl || token.href,
        });
    };

    const renderedMarkdown = computed(() => {
        imageCacheVersion.value;
        return DOMPurify.sanitize(
            marked.parse(
                renderDocumentLinks(content.value, documents?.value || []),
                { renderer, breaks: true },
            ),
            {
                ALLOWED_URI_REGEXP: /^(?:#|blob:|https?:|data:image\/)/i,
            }
        );
    });

    function createEditor(initialContent = '') {
        if (!editorElement.value) {
            return;
        }

        const state = EditorState.create({
            doc: initialContent,

            extensions: [
                basicSetup,

                vimCompartment.of(
                    enableVim.value ? vim() : []
                ),

                markdown(),

                markdownImages(imageCache),
                
                markdownFadeInactiveLines(),

                oneDark,

                EditorView.lineWrapping,

                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        content.value =
                            update.state.doc.toString();
                    }

                    const firstLine = content.value.split('\n')[0];
                    onChange?.(
                        content.value,
                        removeMarkdown(firstLine)
                    );
                }),

                EditorView.theme({
                    '&': {
                        height: '100%',
                        fontSize: '14px',
                    },

                    '.cm-scroller': {
                        overflow: 'auto',
                        fontFamily:
                            'JetBrains Mono, monospace',
                    },

                    '.cm-content': {
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    },

                    '.cm-line': {
                        overflow: 'visible',
                    }
                }),

                // Handling for dropped images:
                EditorView.domEventHandlers({
                    async drop(event, view) {
                        const files =
                            event.dataTransfer?.files;

                        if (!files?.length) {
                            return false;
                        }

                        const file = files[0];

                        if (
                            !file.type.startsWith('image/')
                        ) {
                            return false;
                        }

                        event.preventDefault();
                        
                        const insertedId = await createNewLocalImage(
                            activeDocument.value.id,
                            file.name,
                            file
                        );

                        updateCountTempIds();

                        const markdown =
                            `\n![image](${insertedId})\n`;

                        const pos =
                            view.posAtCoords({
                                x: event.clientX,
                                y: event.clientY
                            });

                        if (pos == null) {
                            return true;
                        }

                        view.dispatch({
                            changes: {
                                from: pos,
                                insert: markdown
                            }
                        });

                        const doc = activeDocument.value;

                        uploadTempImageAndReplaceReferences(
                            doc,
                            insertedId,
                            file.name,
                            file,
                            editorView
                        );

                        return true;
                    }
                })
            ],
        });

        editorView.value = new EditorView({
            state,
            parent: editorElement.value,
        });

        // initial sync
        content.value = initialContent;
    }

    function updateEditorContent(newContent = '') {
        if (!editorView.value) {
            return;
        }

        const current =
            editorView.value.state.doc.toString();

        if (current === newContent) {
            return;
        }

        editorView.value.dispatch({
            changes: {
                from: 0,
                to: current.length,
                insert: newContent,
            },
        });
    }

    async function uploadTempImageAndReplaceReferences(doc, tempId, name, file) {
        // validate parameters
        Validator.validateObjectNotNull(doc);
        Validator.validateStringEmptyNotAllowed(tempId);
        Validator.validateStringEmptyAllowed(name);
        Validator.validateFile(file);

        // post the image to the server
        const insertedId = await newServerImage(doc.id, name, file);

        if (!insertedId) {
            return;
        }

        // replace the temporary image with a server image
        const replacedImage = await replaceLocalDbEntry(
            DB_IMAGES,
            {
                id: insertedId,
                docId: doc.id,
                file,
                name,
                userId: localStorage.userId
            },
            tempId
        );

        if (!replacedImage) {
            return;
        }

        // if the user is still in the original document, change the editor content,
        // which prompts the subsequent storing process for local storage and server
        if (activeDocument.value?.id === doc.id) {
            // replace the imageCache entry
            imageCache.replaceId(tempId, insertedId);
            imageCacheVersion.value += 1;

            replaceImageReferenceInLiveEditor(tempId, insertedId);

            // refresh display
            editorView.value.requestMeasure();

            // update the count of current temporary ids
            updateCountTempIds();

            return;
        }

        // if active document has changed while awaiting newServerImage:
        // fetch document from local storage, as it may have changed during await
        const storedDocument = await getLocalRecord(DB_DOCUMENTS, doc.id);

        // if true document has been deleted then exit
        if (!storedDocument) {
            return;
        }

        // if the content of the storedDocument does not contain the tempId then exit
        if (!storedDocument.content?.includes(tempId)) {
            return;
        }

        // replace the tempId with the serverId
        const newContent = storedDocument.content?.replaceAll(tempId, insertedId);

        // update content + verison
        storedDocument.content = newContent;
        storedDocument.version += 1;

        // udpate document in local storage
        await addOrSetLocalRecord(DB_DOCUMENTS, storedDocument);

        try {
            // update the document on the server
            await authenticatedFetch(
                PATCHdocument, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: storedDocument.id,
                        content: storedDocument.content,
                        title: storedDocument.title,
                        version: storedDocument.version
                    }),
                }
            );
        } catch (err) {
            // if an error occurs, the document will be updated with the next sync
            return;
        }
    }

    function replaceImageReferenceInLiveEditor(oldId, newId) { 
        Validator.validateStringEmptyNotAllowed(oldId);
        Validator.validateStringEmptyNotAllowed(newId);
        Validator.validateObjectNotNull(editorView.value);

        const text = editorView.value.state.doc.toString();
        const oldRef = `![image](${oldId})`;
        const newRef = `![image](${newId})`;

        const from = text.indexOf(oldRef);

        if (from === -1) {
            return;
        }

        editorView.value.dispatch({
            changes: {
                from,
                to: from + oldRef.length,
                insert: newRef,
            },
        });
    }

    onMounted(() => {
        createEditor(
            activeDocument?.value?.content || ''
        );
    });

    onBeforeUnmount(() => {
        editorView.value?.destroy();
    });

    watch(enableVim, async (enabled) => {
        if (!editorView.value) {
            return;
        }

        await addOrSetLocalRecord(DB_SETTINGS, { 
            key: 'enableVim', 
            value: toRaw(unref(enableVim.value)),
            userId: localStorage.userId
        });

        editorView.value.dispatch({
            effects:
                vimCompartment.reconfigure(
                    enabled ? vim() : []
                )
        });
    });

    if (activeDocument) {
        watch(activeDocument, (doc) => {
            updateEditorContent(doc?.content || '');
        });
    }

    return {
        editorElement,
        editorView,
        content,
        renderedMarkdown,
        updateEditorContent
    };
}