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
import { markdownFadeInactiveLines, blurMarkdown } from '@/services/markdownService';
import { addOrSetLocalRecord } from '@/services/indexedDbService';
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
                        blurMarkdown(firstLine)
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

                        const id = await createNewLocalImage(
                            activeDocument.value._id,
                            file.name,
                            file
                        );

                        const markdown =
                            `\n![image](${id})\n`;

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
    };
}