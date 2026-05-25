import { onMounted, onBeforeUnmount, ref, watch} from 'vue';
import { EditorState } from '@codemirror/state';
import {
    EditorView,
    keymap,
    lineNumbers
} from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap } from '@codemirror/commands';

const editorRef = ref(null);
const editorView = ref(null);

export function useEditor(options = {}) {

    const { activeDocument } = options;

    function createEditor(content) {
        if (!editorRef.value) {
            return;
        }

        const state = EditorState.create({
            doc: content,
            extensions: [
            lineNumbers(),

            keymap.of(defaultKeymap),

            markdown(),

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
            }),
            ],
        });

        editorView.value = new EditorView({
            state,
            parent: editorRef.value,
        });
    }

    function updateEditorContent(content) {
        if (!editorView.value){
            return;
        }

        const current = editorView.value.state.doc.toString();

        if (current === content) {
            return;
        }

        editorView.value.dispatch({
            changes: {
            from: 0,
            to: current.length,
            insert: content,
            },
        });
    }

    onMounted(async () => {
        createEditor(
            activeDocument.value?.content || ''
        );
    });

    onBeforeUnmount(() => {
        if (editorView.value) {
            editorView.value.destroy();
        }
    });

    watch(activeDocument, (doc) => {
        updateEditorContent(doc?.content || '');
    });

    return {
        editorRef,
        editorView
    }
}