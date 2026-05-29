<template>
  <div class="editor-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <!-- Logo -->
      <div class="sidebar-logo">
        Red<span class="logo-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </div>

      <button @click="enableVim = !enableVim">
        Vim: {{ enableVim ? 'ON' : 'OFF' }}
      </button>

      <div class="create-delete">
        <button class="sidebar-item" @click="createDocument()">
          + New
        </button>
        <button class="sidebar-item" @click="deleteDocument()">
          - Delete
        </button>
      </div>
      <!-- List of Documents -->
      <button
        v-for="doc in documents"
        :key="doc._id"
        class="sidebar-item"
        :class="{ active: activeDocument && activeDocument._id === doc._id }"
        @click="openDocument(doc._id); setActiveDocument(doc._id)"
      >
          {{ doc.title }}
      </button>
    </aside>

    <!-- Main -->
    <div class="main">
      <!-- tabbar -->
      <header
        class="tabbar">
        <button
          v-for="doc in openDocuments"
          :key="doc._id"
          class="tab"
          :class="{ active: activeDocument && activeDocument._id === doc._id }"
          @click="setActiveDocument(doc._id)"
        >
          {{ doc.title }}
          <span
            class="close"
            @click.stop="handleCloseDocuments(doc)"
          >
            ×
          </span>
        </button>
      </header>

      <!-- Editor -->
      <section class="editor-container">
          <div v-show="activeDocument"
            ref="editorElement" 
            class="editor"
            ></div>

          <div
            class="preview"
            v-html="renderedMarkdown"
          ></div>
      </section>
    </div>
  </div>
</template>

<script setup>

import { useSettings } from '@/composables/useSettings';
import { useDocuments } from '@/composables/useDocuments';
import { useEditor } from '@/composables/useEditor';

const {
  countTempIds,
  updateCountTempIds,
  enableVim,
} = useSettings();

const { 
  documents,
  activeDocument,
  openDocuments,
  createDocument,
  deleteDocument,
  openDocument,
  setActiveDocument,
  handleCloseDocuments,
  updateDocumentContent
} = useDocuments({
  countTempIds,
  updateCountTempIds
});

const {
  editorElement,
  renderedMarkdown
} = useEditor({ 
  activeDocument,
  onChange: updateDocumentContent,
  enableVim
});

</script>

<!--global style-->
<style>
  .cm-md-faded {
    opacity: 0.25;
    transition: opacity 0.12s ease;
  }

  .cm-image-block {
    display: block;
    margin: 16px 0;
  }

  .cm-image-block img {
    display: block;
    max-width: 50%;
    max-height: 50vh;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 12px;
  }
</style>

<!--local style-->
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
  background: #252525;
  border-right: 1px solid #333;
  width: 10vh;
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
  background: #393939;
}

/* Main */

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Menubar */

.tabbar {
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

.preview {
  padding: 16px;
  overflow: auto;
  background: #121212;
  color: #121212;
}

.preview pre {
  background: #121212;
  padding: 12px;
  overflow-x: auto;
}

.preview code {
  background: #121212;
  padding: 2px 4px;
}

</style>
