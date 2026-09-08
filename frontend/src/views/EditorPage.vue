<template>
  <div class="editor-layout">
    <nav class="activity-bar" 
      aria-label="Application navigation"
    >
      <div class="brand-mark" aria-label="Red home">
          R
      </div>
      
      <button class="activity-item active" aria-label="Explorer" title="Explorer">
        <span>☷</span>
      </button>
      
      <button class="activity-item" aria-label="Search" title="Search">
        <span>⌕</span>
      </button>
      
      <button class="activity-item settings-item" aria-label="Settings" title="Settings">
        <span>⚙</span>
      </button>
    </nav>

    <aside class="sidebar">
      <div class="sidebar-heading">
        <span>RED Notes</span>
      </div>

      <div class="workspace-name">
        Explorer
      </div>

      <div class="document-toolbar">
        <button class="toolbar-button" @click="createDocument()">
          + New file
        </button>

        <button class="toolbar-button" @click="handleDeleteActiveDocument()">
          - Delete
        </button>
      </div>

      <div class="document-list" aria-label="Documents">
        <button v-for="doc in documents" :key="doc.id"
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
      <header class="tabbar">
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
          <div class="preview" v-html="renderedMarkdown"></div>
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
import { useSettings } from '@/composables/useSettings';
import { useDocuments } from '@/composables/useDocuments';
import { useEditor } from '@/composables/useEditor';
import { useImages } from '@/composables/useImages';
import { ImageCache } from '../services/images/imageCache';

const imageCache = new ImageCache();
const { countTempIds, updateCountTempIds, enableVim } = useSettings();
const {
  documents, activeDocument, openDocuments, createDocument, deleteDocument,
  openDocument, setActiveDocument, updateDocumentContent, closeDocument,
  docsInitialized, getNextActiveDocument,
} = useDocuments({ countTempIds, updateCountTempIds });
const {
  createNewLocalImage, initializeImageCacheForDocument, revokeImageUrlsForDocId,
  deleteImagesForDocId, createNewServerImage, setUpdateEditorContent,
  imageCacheVersion,
} = useImages({ documents, docsInitialized, countTempIds, activeDocument, imageCache });
const { editorElement, renderedMarkdown, updateEditorContent } = useEditor({
  activeDocument, onChange: updateDocumentContent, enableVim, imageCache,
  imageCacheVersion,
  createNewLocalImage, createNewServerImage, updateCountTempIds,
});

setUpdateEditorContent(updateEditorContent);

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

.editor-layout { 
  display: flex;
  height: 100vh; 
  min-width: 680px; 
  background: #181818; 
  color: #cccccc; 
  font-size: 13px; 
}

.activity-bar { 
  display: flex; 
  width: 48px; 
  flex-direction: column; 
  align-items: center; 
  background: #181818; 
  border-right: 1px solid #252525; 
}

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

.activity-item:hover, .activity-item.active {
  color: #f1f1f1; 
}

.activity-item.active::before { 
  position: absolute; 
  top: 0; 
  bottom: 0; 
  left: 0; 
  width: 2px; 
  background: #f14c4c; 
  content: ""; 
}

.settings-item { 
  margin-top: auto; 
}

.sidebar { 
  display: flex; 
  width: 248px; 
  min-width: 190px; 
  flex-direction: column; 
  background: #181818;
  border-right: 1px solid #2b2b2b; 
}

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

.icon-button:hover { 
  background: #2a2d2e; 
  color: #ffffff; 
}

.workspace-name { 
  padding: 9px 20px 8px; 
  border-top: 1px solid #252525; 
  color: #888888; 
  font-size: 10px; 
  font-weight: 600; 
  letter-spacing: 0.08em; 
}

.document-toolbar { 
  display: flex; 
  gap: 4px; 
  padding: 0 12px 9px; 
}

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

.sidebar-item:hover, .sidebar-item.active { 
  background: #37373d; 
  color: #ffffff; 
}

.file-icon, .tab-file-icon { 
  color: #57a6d9; 
  font-family: Consolas, monospace; 
  font-size: 11px; 
  font-weight: 700; 
}

.document-title, .tab-title { 
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

.tabbar { 
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
  min-width: 130px; 
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

@media (max-width: 1280px) { 
  .sidebar { 
    width: 210px; 
  } 

  .editor-container { 
    grid-template-columns: 1fr; 
  } 

  .preview-pane { 
    display: none; 
  } 
}
</style>