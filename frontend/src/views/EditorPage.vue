<template>
  <div class="editor-layout">
    <nav class="activity-bar" 
      aria-label="Application navigation"
    >
      <div class="brand-mark" aria-label="Red home">
          R
      </div>
      
      <button class="activity-item" :class="{ active: activeActivity === 'explorer' }" aria-label="Explorer" title="Explorer" @click="showExplorer">
        <span>☷</span>
      </button>
      
      <button class="activity-item" :class="{ active: activeActivity === 'search' }" aria-label="Search" title="Search" @click="showSearch">
        <span>⌕</span>
      </button>
    </nav>

    <aside class="sidebar">
      <div class="sidebar-heading">
        <span>RED Notes</span>
      </div>

      <div class="workspace-name">{{ activeActivity === 'search' ? 'Search' : 'Explorer' }}</div>

      <form v-if="activeActivity === 'search'" class="document-toolbar search-toolbar" @submit.prevent="handleSearch">
        <input
          v-model="searchInput"
          ref="searchInputElement"
          class="search-input"
          type="search"
          aria-label="Search documents"
          placeholder="Search documents"
        >
        <button class="toolbar-button" type="submit">Search</button>
      </form>

      <div v-else class="document-toolbar">
        <button class="toolbar-button" @click="handleDocumentCreation()">
          + New file
        </button>

        <button class="toolbar-button" @click="handleDeleteActiveDocument()">
          - Delete
        </button>
      </div>

      <div class="document-list" aria-label="Documents">
        <button v-for="doc in visibleDocuments" :key="doc.id"
          class="sidebar-item" :class="{ active: activeDocument && activeDocument.id === doc.id }" 
          @click="openDocument(doc.id); handleChangeActiveDocument(doc.id)"
        >
          <span class="file-icon">M</span>
          <span class="document-title">{{ doc.title }}</span>
        </button>
      </div>

      <button class="vim-toggle" :class="{ enabled: enableVim }" @click="enableVim = !enableVim">
        <span class="vim-indicator"></span> 
          Vim mode 
        <span class="vim-state">{{ enableVim ? 'ON' : 'OFF' }}</span>
      </button>
    </aside>

    <main class="main">
      <header class="tab-bar">
        <button v-for="doc in openDocuments" :key="doc.id" 
          class="tab" :class="{ active: activeDocument && activeDocument.id === doc.id }" 
          @click="handleChangeActiveDocument(doc.id)"
        >
          <span class="tab-file-icon">M</span>
          <span class="tab-title">{{ doc.title }}</span>
          <span class="close" aria-label="Close document" @click.stop="handleCloseDocument(doc)">x</span>
        </button>
      </header>

      <section class="editor-container">
        <div class="pane editor-pane">
          <div class="pane-label">
            <span class="file-icon">M</span> 
            Markdown editor
          </div>
          <div v-show="activeDocument" ref="editorElement" class="editor"></div>
        </div>
        <div class="pane preview-pane">
          <div class="pane-label">
            <span class="preview-icon">&gt;</span> 
            Preview
          </div>
          <div class="preview" v-html="renderedMarkdown" @click.prevent="handlePreviewClick"></div>
        </div>
      </section>

      <footer class="statusbar">
        <span class="status-message">Red workspace</span>
        <span>Markdown</span>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useSettings } from '@/composables/useSettings';
import { useDocuments } from '@/composables/useDocuments';
import { useEditor } from '@/composables/useEditor';
import { useImages } from '@/composables/useImages';
import { ImageCache } from '../services/images/imageCache';

const imageCache = new ImageCache();
const activeActivity = ref('explorer');
const searchInput = ref('');
const searchQuery = ref('');
const searchInputElement = ref(null);

const { countTempIds, updateCountTempIds, enableVim } = useSettings();

const {
  documents, activeDocument, openDocuments, handleDocumentCreation, deleteDocument,
  openDocument, setActiveDocument, updateDocumentContent, closeDocument,
  docsInitialized, getNextActiveDocument,
} = useDocuments({ countTempIds, updateCountTempIds });

const {
  createNewLocalImage, initializeImageCacheForDocument, revokeImageUrlsForDocId,
  deleteImagesForDocId, createNewServerImage, setUpdateEditorContent,
  imageCacheVersion,
} = useImages({ documents, docsInitialized, countTempIds, activeDocument, imageCache });

const { 
  editorElement, renderedMarkdown, updateEditorContent 
} = useEditor({
  activeDocument, documents, onChange: updateDocumentContent, enableVim, imageCache,
  imageCacheVersion,
  createNewLocalImage, createNewServerImage, updateCountTempIds,
});

setUpdateEditorContent(updateEditorContent);

function handleGlobalKeydown(event) {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    showSearch();
  }

  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'e') {
    event.preventDefault();
    showExplorer();
    editorElement.value?.querySelector('.cm-content')?.focus();
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKeydown));

const visibleDocuments = computed(() => {
  if (activeActivity.value !== 'search' || !searchQuery.value.trim()) {
    return documents.value;
  }

  const query = searchQuery.value.trim().toLowerCase();
  return documents.value.filter(doc =>
    doc.title.toLowerCase().includes(query) ||
    doc.content.toLowerCase().includes(query)
  );
});

function showExplorer() {
  activeActivity.value = 'explorer';
  searchInput.value = '';
  searchQuery.value = '';
}

async function showSearch() {
  activeActivity.value = 'search';
  await nextTick();
  searchInputElement.value?.focus();
}

function handleSearch() {
  searchQuery.value = searchInput.value.trim();
}

async function handlePreviewClick(event) {
  event.preventDefault();

  const link = event.target.closest('a[href^="#document="]');

  if (!link) return;

  const documentId = decodeURIComponent(link.getAttribute('href').slice('#document='.length));
  await handleChangeActiveDocument(documentId);
}

async function handleChangeActiveDocument(nextDocumentId) {
  const previousDocumentId = activeDocument.value.id;
  if (nextDocumentId === previousDocumentId) return;
  await initializeImageCacheForDocument(nextDocumentId);
  await revokeImageUrlsForDocId(previousDocumentId);
  setActiveDocument(nextDocumentId);
}

async function handleCloseDocument(docToBeClosed) {
  const nextDocument = getNextActiveDocument(docToBeClosed, -1);

  if (!nextDocument) {
    setActiveDocument('welcome');
  }
  else if (nextDocument.id !== activeDocument.value.id) {
    await handleChangeActiveDocument(nextDocument.id);
  }

  closeDocument(docToBeClosed.id);
}

async function handleDeleteActiveDocument() {
  if (activeDocument.value.id == 'welcome') return;

  const docToBeDeleted = documents.value.find(
    doc => doc.id === activeDocument.value.id
  );

  handleCloseDocument(docToBeDeleted);
  await deleteDocument(docToBeDeleted);
  await deleteImagesForDocId(docToBeDeleted);
}
</script>

<style>
.cm-md-faded { 
  opacity: 0.25; 
  transition: opacity 0.12s ease; 
}

.cm-image-block { 
  display: block; 
  margin: 1px 0; 
}

/*for images inm the codemirror editor*/
.cm-image-block img { 
  display: block; 
  max-width: 50%; 
  max-height: 50vh; 
  width: auto; 
  height: auto; 
  object-fit: contain; 
  border-radius: 8px; 
}
</style>

<style scoped>
:global(*) { 
  box-sizing: border-box; 
}

:global(body) { 
  margin: 0; 
  overflow: hidden; 
  font-family: "Segoe UI", system-ui, sans-serif; 
}

/*scroll-bar*/
:global(.editor-layout *) {
  scrollbar-color: #f14c4c #1e1e1e;
  scrollbar-width: thin;
}

:global(.editor-layout *::-webkit-scrollbar) {
  width: 10px;
  height: 10px;
}

:global(.editor-layout *::-webkit-scrollbar-track) {
  background: #1e1e1e;
}

:global(.editor-layout *::-webkit-scrollbar-thumb) {
  background: #682f32;
  border: 2px solid #1e1e1e;
}

:global(.editor-layout *::-webkit-scrollbar-thumb:hover) {
  background: #682f32;
}

/*whole editor page*/
.editor-layout { 
  display: flex;
  height: 100vh; 
  min-width: 680px; 
  background: #181818; 
  color: #cccccc; 
  font-size: 13px; 
}

/*left-most bar, containing the explorer and search activity items*/
.activity-bar { 
  display: flex; 
  width: 48px; 
  flex-direction: column; 
  align-items: center; 
  background: #181818; 
  border-right: 1px solid #252525; 
}

/*The 'R' at the top left*/
.brand-mark { 
  display: grid; 
  width: 48px; 
  height: 55px; 
  place-items: center; 
  color: #f14c4c; 
  font-size: 23px; 
  font-weight: 600; 
  border-bottom: 1px solid #252525; 
}

/*individual items of the activity-bar*/
.activity-item { 
  position: relative; 
  width: 48px; 
  height: 52px; 
  padding: 0; 
  border: 0; 
  background: transparent; 
  color: #858585; 
  font-size: 20px; 
  cursor: pointer; 
}

/*hover behavior for activity-item*/
.activity-item:hover, 
.activity-item.active {
  color: #f1f1f1; 
}

/*behavior when activity-item is active*/
.activity-item.active::before { 
  position: absolute; 
  top: 0; 
  bottom: 0; 
  left: 0; 
  width: 2px; 
  background: #f14c4c; 
  content: ""; 
}

/*sidebar containing options for document creation and deletion + list of documents*/
.sidebar { 
  display: flex; 
  width: 248px; 
  min-width: 190px; 
  flex-direction: column; 
  background: #181818;
  border-right: 1px solid #2b2b2b; 
}

/*'RED Notes'*/
.sidebar-heading { 
  display: flex; 
  height: 55px; 
  align-items: center; 
  justify-content: space-between; 
  padding: 0 12px 0 20px; 
  color: #bbbbbb; 
  font-size: 11px; 
  letter-spacing: 0.08em; 
}

/*workspace name, e.g. 'Explorer' or 'Search'*/
.workspace-name { 
  padding: 9px 20px 8px; 
  border-top: 1px solid #252525; 
  color: #888888; 
  font-size: 10px; 
  font-weight: 600; 
  letter-spacing: 0.08em; 
}

/*contains the toolbar-buttons, see below*/
.document-toolbar { 
  display: flex; 
  gap: 4px; 
  padding: 0 12px 9px; 
}

.search-toolbar {
  align-items: center;
}

.search-input {
  min-width: 0;
  flex: 1;
  padding: 5px 7px;
  border: 1px solid #3b3b3b;
  outline: none;
  background: #252526;
  color: #cccccc;
  font: inherit;
  font-size: 11px;
}

.search-input:focus {
  border-color: #f14c4c;
}

/**/
.toolbar-button { 
  padding: 5px 7px; 
  border: 1px solid transparent; 
  background: transparent; 
  color: #9d9d9d; 
  font-size: 11px; 
  cursor: pointer; 
}

.toolbar-button:hover { 
  border-color: #3b3b3b; 
  background: #252526; 
  color: #ffffff; 
}

.document-list { 
  flex: 1; 
  overflow: auto; 
}

.sidebar-item { 
  display: flex; 
  width: 100%; 
  min-height: 31px; 
  align-items: center; 
  gap: 8px; 
  padding: 5px 16px; 
  border: 0; 
  background: transparent; 
  color: #bdbdbd; 
  font-size: 13px; 
  text-align: left; 
  cursor: pointer; 
}

.sidebar-item.active { 
  background: #37373d; 
  color: #ffffff;
}

.sidebar-item:hover {
  background: #37373d; 
  color: #f14c4c;
}

.file-icon, 
.tab-file-icon { 
  color: #57a6d9; 
  font-family: Consolas, monospace; 
  font-size: 11px; 
  font-weight: 700; 
}

.document-title, 
.tab-title { 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap; 
}

.vim-toggle { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  margin: 12px; 
  padding: 8px 10px; 
  border: 1px solid #303030; 
  background: #202020; 
  color: #999999; 
  font-size: 11px; 
  text-align: left; 
  cursor: pointer; 
}

.vim-toggle.enabled { 
  border-color: #684042; 
  color: #f1d7d7; 
}

.vim-indicator { 
  width: 7px; 
  height: 7px; 
  border-radius: 50%; 
  background: #666666; 
}

.vim-toggle.enabled .vim-indicator { 
  background: #f14c4c; 
  box-shadow: 0 0 7px rgba(241, 76, 76, 0.7); 
}

.vim-state { 
  margin-left: auto; 
  color: #777777; 
  font-size: 10px; 
}

.main { 
  display: flex; 
  min-width: 0;
  flex: 1; 
  flex-direction: column; 
  background: #1e1e1e; 
}

.tab-bar { 
  display: flex; 
  height: 36px; 
  min-height: 36px; 
  align-items: stretch; 
  background: #181818; 
  border-bottom: 1px solid #2b2b2b; 
  overflow-x: auto; 
}

.tab { 
  display: flex; 
  height: 100%; 
  min-width: 100px; 
  max-width: 220px; 
  align-items: center; 
  gap: 8px; 
  padding: 0 10px; 
  border: 0; 
  border-right: 1px solid #2b2b2b; 
  border-top: 1px solid transparent; 
  background: transparent; 
  color: #999999; 
  font-size: 12px; 
  cursor: pointer; 
}

.tab.active { 
  border-top-color: #f14c4c; 
  background: #1e1e1e; 
  color: #ffffff; 
}

.tab:hover{
  background: #37373d; 
  color: #f14c4c;
}

.close { display: grid; 
  width: 20px; 
  height: 20px; 
  margin-left: auto; 
  place-items: center; 
  opacity: 0.6; 
  font-size: 16px; 
}

.close:hover { 
  background: #3a3a3a; 
  opacity: 1; 
}

.editor-container { 
  display: grid; 
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); 
  flex: 1; 
  min-height: 0; 
  overflow: hidden; 
}

.pane { 
  display: flex; 
  min-width: 0; 
  min-height: 0; 
  flex-direction: column; 
  border-right: 1px solid #2b2b2b; 
}

.pane-label { 
  display: flex; 
  height: 29px; 
  min-height: 29px; 
  align-items: center; 
  gap: 8px; 
  padding: 0 14px; 
  background: #1e1e1e; 
  border-bottom: 1px solid #2b2b2b; 
  color: #888888; 
  font-size: 11px; 
}

.preview-icon { 
  color: #c586c0; 
}

.editor { 
  height: 100%; 
  min-height: 0; 
}

:deep(.cm-editor) { 
  height: 100%; 
  background: #1e1e1e; 
  color: #d4d4d4; 
}

:deep(.cm-gutters) { 
  background: #1e1e1e; 
  color: #858585; 
  border-right: 1px solid #2b2b2b; 
}

.preview { 
  flex: 1; 
  padding: 22px 28px; 
  overflow: auto; 
  background: #202020; 
  color: #d4d4d4; 
  line-height: 1.65; 
  white-space: pre-line;
}

.preview :deep(a),
.preview :deep(a:visited),
.preview :deep(a:hover),
.preview :deep(a:active),
.preview :deep(a:focus) {
  color: #f14c4c;
  text-decoration: none;
}

.preview :deep(ul),
.preview :deep(ol) {
  white-space: normal;
}

.preview :deep(img) { 
  display: block; 
  max-width: 50%; 
  max-height: 50vh; 
  width: auto; 
  height: auto; 
  object-fit: contain; 
  border-radius: 8px; 
}

.preview pre { 
  background: #181818; 
  padding: 12px; 
  overflow-x: auto; 
}

.preview code { 
  background: #2a2d2e; 
  padding: 2px 4px; 
}

.statusbar { 
  display: flex; 
  height: 22px; 
  min-height: 22px; 
  align-items: center; 
  gap: 15px; 
  padding: 0 12px; 
  background: #682f32; 
  color: #f5e6e6; 
  font-size: 11px; 
}

.status-message { 
  flex: 1; 
}

@media (max-width: 1400px) { 
  .sidebar {
    width: 180px;
  }

  .editor-container { 
    grid-template-columns: 1fr; 
  } 

  .preview-pane {
    display: none;
  }
}

@media (max-width: 576px) {
  .editor-layout {
    min-width: 380px;
  }

  .sidebar {
    width: 105px;
    min-width: 100px;
  }

  .tab {
    width: 95px;
    min-width: 90px;
  }
}
</style>