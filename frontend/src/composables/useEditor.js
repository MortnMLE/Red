import { onMounted, onBeforeUnmount, ref } from 'vue';
import { EditorState } from '@codemirror/state';
import {
    EditorView,
    keymap,
    lineNumbers
} from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';

export function useEditor() {
    const editorRef = ref(null);
    const editorView = ref(null);
    const editorState = ref(null);

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

        editorView = new EditorView({
            state,
            parent: editorRef.value,
        });
    }

    function updateEditorContent(content) {
        if (!editorView){
            return;
        }

        const current = editorView.state.doc.toString();

        if (current === content) {
            return;
        }

        editorView.dispatch({
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
        if (editorView) {
            editorView.destroy();
        }
    });

    return {
        editorRef,
        editorView,
        createEditor,
    }
}