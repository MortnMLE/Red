<template>
    <div class="editor-layout">
        <!-- Sidebar -->
        <aside class="sidebar">
            <!-- Logo -->
            <div class="sidebar-logo">
                Red<span class = logo-dots>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </span>
            </div>

            <div class="create-delete">
                <button class="sidebar-item" @click="createDocument()">
                    + New
                </button>
                <button class="sidebar-item" @click="removeDocument()">
                    - Delete
                </button>
            </div>

            <!-- List of Documents -->
            <button
                v-for="doc in documents"
                :key="doc.id"
                class="sidebar-item"
                :class="{ active: activeDocumentId === doc.id }"
                @click="openDocument(doc.id)"
            >
                {{ doc.title }}
            </button>
        </aside>

        <!-- Main -->
        <div class="main">
            <!-- Menubar -->
           <header class="menubar">
                    <button
                    v-for="doc in openDocuments"
                    :key="doc.id"
                    class="tab"
                    :class="{ active: activeDocumentId === doc.id }"
                    @click="setActiveDocument(doc.id)"
                    >
                    {{ doc.title }}

                    <span
                        class="close"
                        @click.stop="closeDocument(doc.id)"
                    >
                        ×
                    </span>
                </button>
            </header>

            <!-- Editor -->
            <section class="editor-container">
                <div ref="editorRef" class="editor"></div>
            </section>
        </div>
    </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
} from 'vue'

import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
} from '@codemirror/view';

import { defaultKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

import { postToServer } from '@/services/apiService';
import { 
  DB_DOCUMENTS, addLocalRecord
} from '@/services/indexedDbService';

import { useDocuments } from '@/composables/useDocuments';
import { useSettings } from '@/composables/useSettings';

const { documents } = useDocuments();
const { countTempIds } = useSettings();

const openDocumentIds = ref(['1'])

const activeDocumentId = ref('1')

const openDocuments = computed(() => {
  return documents.value.filter((doc) =>
    openDocumentIds.value.includes(doc.id),
  )
});

const activeDocument = computed(() => {
  return documents.value.find(
    (doc) => doc.id === activeDocumentId.value,
  )
});

const editorRef = ref(null);

let editorView = null;

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

async function removeDocument() {

}

async function createDocument() {
  const tempId = `temp-${countTempIds.value}`;
  let newDoc = {
    _id:tempId,
    user_id: localStorage.userId,
    title: 'New Document',
    content: '',
    version: 0,
    pendingSync: true
  } 

  documents.value.push(newDoc);
  openDocument(newDoc._id);
  activeDocumentId.value = newDoc._id;
  
  await addLocalRecord(DB_DOCUMENTS, newDoc);

  const response = await postToServer({
    user_id: localStorage.userId,
    title: newDoc.title,
    content: newDoc.content,
    version: newDoc.version
  }, 'http://localhost:5000/doc/new');

  if (response.success) {
    await udpateLocalDocumentId(tempId, response._id);
    
    console.log(`Created new document with id ${response._id} on server`);
  } else {
    console.error('Failed to create document on server');
  }
}

function updateEditorContent(content) {
  if (!editorView){
    return;
  }

  const current =
    editorView.state.doc.toString()

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

function openDocument(id) {
  if (!openDocumentIds.value.includes(id)) {
    openDocumentIds.value.push(id)
  }

  activeDocumentId.value = id
}

function setActiveDocument(id) {
  activeDocumentId.value = id
}

function closeDocument(id) {
  openDocumentIds.value =
    openDocumentIds.value.filter(
      (docId) => docId !== id,
    );

  if (activeDocumentId.value === id) {
    activeDocumentId.value =
      openDocumentIds.value[0] || '';
  }
}

watch(activeDocument, (doc) => {
  if (doc) {
    updateEditorContent(doc.content);
  }
});

onMounted(async () => { 
  createEditor(
    activeDocument.value?.content || '',
  )
});

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy();
  }
});
</script>

<style scoped>
.editor-layout {
  display: flex;
  height: 100vh;
  background: #1e1e1e;
  color: #e5e5e5;
}

/* Sidebar */

.sidebar {
  /*width: 240px;*/
  display: flex;
  flex-direction: column;
  background: #252526;
  border-right: 1px solid #333;
  width: 15vh;
}


.logo-dots span {
  opacity: 0;
  animation: blink 1.5s infinite;
  color: #f00817;
}

.logo-dots span:nth-child(1) {
  animation-delay: 0s;
}

.logo-dots span:nth-child(2) {
  animation-delay: 0.4s;
}

.logo-dots span:nth-child(3) {
  animation-delay: 0.8s;
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  65% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

.sidebar-logo{
  font-size: 36px;
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #333;
}

.sidebar-item {
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.sidebar-item:hover {
  background: #2d2d2d;
}

.sidebar-item.active {
  background: #37373d;
}

/* Main */

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Menubar */

.menubar {
  height: 66px;
  display: flex;
  align-items: center;
  background: #2d2d2d;
  border-bottom: 1px solid #333;
  overflow-x: auto;
}

.tab {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: none;
  border-right: 1px solid #333;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.tab.active {
  background: #1e1e1e;
}

.close {
  opacity: 0.6;
  font-size: 14px;
}

.close:hover {
  opacity: 1;
}

/* Editor */

.editor-container {
  flex: 1;
  overflow: hidden;
}

.editor {
  height: 100%;
}

:deep(.cm-editor) {
  height: 100%;
  background: #121212;
  color: white;
}

:deep(.cm-gutters) {
  background: #252526;
  color: #858585;
  border-right: 1px solid #333;
}
</style>
