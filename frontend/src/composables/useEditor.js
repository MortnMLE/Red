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
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { oneDark } from '@codemirror/theme-one-dark';
import { markdownImages } from '@/services/imageWidget';
import { basicSetup } from 'codemirror';
import { markdownFadeInactiveLines, removeMarkdown } from '@/services/markdownService';
import { addOrSetLocalRecord, DB_IMAGES, deleteLocalRecord } from '@/services/indexedDbService';
import { DB_SETTINGS } from '@/services/indexedDbService';
import { toRaw, unref } from 'vue';

const vimCompartment = new Compartment();

export function useEditor(options = {}) {
    const { 
        activeDocument, 
        onChange,
        enableVim,
        imageCache,
        createNewLocalImage,
        // replaceImageReference,
        updateCountTempIds,
        createNewServerImage,
        addOrSetImageToCache
    } = options;

    const editorElement = ref(null);
    const editorView = ref(null);

    const content = ref('');

    const renderedMarkdown = computed(() =>
        DOMPurify.sanitize(
            marked.parse(content.value)
        )
    );

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
                            activeDocument.value._id,
                            file.name,
                            file
                        );

                        console.log(`OnDrop: new insertedId: ${insertedId}`);

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

                        handleImageCreationOnServer(
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

    async function handleImageCreationOnServer(doc, tempId, name, file) {
        if (
            !doc ||
            !tempId || tempId === '' ||
            !name || name === '' ||
            !(file instanceof File) || !file
        ) {
            throw new Error(
                `useEditor.handleImageCreationOnServer:\n` +
                `doc: ${doc}\n` +
                `name: ${name}\n` +
                `file: ${file}`
            );
        }

        console.log(`entered handleImageCreationOnServer with: ${doc} ${tempId} ${name} ${file}`);
        const insertedId = await createNewServerImage(doc._id, name, file);
        console.log(`POST to server returned id: ${insertedId}`);

        if (!insertedId) {
            return;
        }

        if (activeDocument.value._id !== doc._id) {
            console.log(`activeDocument not equal to doc._id`);
            return;
        }

        const url = imageCache.get(tempId);
        console.log(`url: ${url}`);
        if (url) {
            addOrSetImageToCache(tempId);

            console.log(`Replacing ${tempId} with ${insertedId}`);
            replaceImageReference(tempId, insertedId);

            await addOrSetLocalRecord(
                DB_IMAGES,
                {
                    _id: insertedId,
                    doc_id: doc._id,
                    file,
                    name,
                    user_id: localStorage.userId
                }
            );

            await deleteLocalRecord(DB_IMAGES,tempId);
            updateCountTempIds();
        }
    }

    function replaceImageReference(tempId, uuid) {
        if (
            !tempId || tempId === '' ||
            !uuid || uuid === ''
        ){
            throw new Error(
                `useEditor.replaceImageReference:\n` +
                `tempId: ${tempId}\n` +
                `uuid: ${uuid}`
            );
        }

        const text = editorView.value.state.doc.toString();
        const oldRef = `![image](${tempId})`;
        const newRef = `![image](${uuid})`;

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
            user_id: localStorage.userId
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