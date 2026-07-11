# Frontend source overview

This overview covers the JavaScript modules under [frontend/src](../frontend/src). It summarizes the main modules, their responsibilities, and the exported functions they provide.

## 1. Bootstrap and routing

### [frontend/src/main.js](../frontend/src/main.js)
- Boots the Vue app.
- Creates the app instance, mounts it to the `#app` element, and attaches the router.

### [frontend/src/router/index.js](../frontend/src/router/index.js)
- Defines the app routes.
- Registers:
  - `/` → login page
  - `/editor` → editor page
- Creates the Vue Router instance and exports it.

## 2. Composables

### [frontend/src/composables/useEditor.js](../frontend/src/composables/useEditor.js)
Main editor composable for the markdown editor experience.

Exports:
- `useEditor(options = {})`
  - `createEditor(initialContent = '')`: creates and initializes the CodeMirror editor view.
  - `updateEditorContent(newContent = '')`: replaces the editor content.
  - `handleImageCreationOnServer(doc, tempId, name, file)`: uploads a newly dropped image to the server and updates the editor references.
  - `replaceImageReference(tempId, uuid)`: swaps temporary image references for server-backed IDs.
- Includes lifecycle hooks for mounting, cleanup, Vim mode handling, and active-document syncing.

### [frontend/src/composables/useDocuments.js](../frontend/src/composables/useDocuments.js)
Document state management composable.

Exports:
- `useDocuments(options = {})`
  - `loadDocuments()`: loads documents from IndexedDB and the backend server.
  - `syncDocuments(serverDocuments, localDocuments)`: synchronizes local and remote documents.
  - `deleteDocument(doc)`: removes a document locally and remotely.
  - `createDocument()`: creates a new document, assigns a temporary ID, and syncs it.
  - `openDocument(id)`: opens a document in the UI.
  - `closeDocument(id)`: closes a document.
  - `setActiveDocument(id)`: marks a document as active.
  - `shiftActiveDocument(docToBeClosed, offset)`: moves focus between open documents.
  - `updateDocumentContent(content, title)`: updates the active document content and triggers save/sync.
- Also exposes shared state such as `documents`, `activeDocument`, `openDocuments`, and `docsInitialized`.

### [frontend/src/composables/useImages.js](../frontend/src/composables/useImages.js)
Image handling composable for local and server image storage.

Exports:
- `useImages(options = {})`
  - `setUpdateEditorContent(fn)`: registers a callback for editor content updates.
  - `syncFromLocalToServer(requiredImages, serverImages)`: uploads local images to the server when required.
  - `fetchMissingImages(requiredImages, serverImages)`: downloads missing images from the server into IndexedDB.
  - `initializeImageCacheForDocument(docId)`: preloads image blobs for a document.
  - `setImageToCache(imageId)`: stores an image URL in the in-memory cache.
  - `createNewServerImage(docId, name, file)`: uploads a new image to the server.
  - `createNewLocalImage(docId, name, file)`: saves a new image locally and prepares a temporary reference.
  - `deleteImagesForDoc(doc)`: deletes image references associated with a document.
  - `revokeImageUrlsForDocId(id)`: cleans up cached image object URLs.
  - `createImageStore()`: creates the image store in IndexedDB.

### [frontend/src/composables/useSettings.js](../frontend/src/composables/useSettings.js)
Settings composable for persistent local preferences.

Exports:
- `useSettings()`
  - `loadSettings()`: loads persisted settings such as Vim mode.
  - `updateCountTempIds()`: recalculates how many temporary IDs exist and persists the count.
- Exposes `countTempIds`, `updateCountTempIds`, and `enableVim` state.

## 3. Services

### [frontend/src/services/apiService.js](../frontend/src/services/apiService.js)
- `serverRequest(method, body, endpoint)`: sends a JSON request to the backend and returns the parsed response.

### [frontend/src/services/debouncer.js](../frontend/src/services/debouncer.js)
- `debouncer(callback, wait)`: returns a debounced wrapper that delays function execution until a pause occurs.

### [frontend/src/services/defaultDocument.js](../frontend/src/services/defaultDocument.js)
- `DEFAULT_DOCUMENT`: a frozen fallback document used as the welcome/default content.

### [frontend/src/services/endpoints.js](../frontend/src/services/endpoints.js)
- Exports URL constants for document and image API endpoints.

### [frontend/src/services/imageWidget.js](../frontend/src/services/imageWidget.js)
- `ImageWidget`: a CodeMirror widget class used to render images inline.
- `markdownImages(imageCache)`: a CodeMirror plugin that replaces markdown image syntax with rendered image widgets.

### [frontend/src/services/markdownService.js](../frontend/src/services/markdownService.js)
- `markdownFadeInactiveLines()`: a CodeMirror plugin that visually fades markdown syntax outside the active line.
- `removeMarkdown(str = '')`: strips markdown formatting from a string to produce a plain-text title or preview.

### [frontend/src/services/indexedDbService.js](../frontend/src/services/indexedDbService.js)
IndexedDB wrapper service.

Exports:
- `DB_DOCUMENTS`, `DB_SETTINGS`, `DB_IMAGES`: store definitions.
- `openLocalDatabase(database)`: opens the IndexedDB database.
- `createStore(storeObject, keyPath, indexes = [])`: creates or upgrades an object store.
- `storeExists(storeObject)`: checks whether a store exists.
- `addOrSetLocalRecord(storeObject, record)`: writes or updates a record.
- `getLocalRecordsByIndex(storeObject, indexName, indexValue)`: reads records by index.
- `localEntryExists(storeObject, id)`: checks whether a record exists.
- `getLocalRecord(storeObject, key)`: reads a single record.
- `deleteLocalRecord(storeObject, key)`: deletes a record.
- `getAllForStore(storeObject)`: returns all records in a store.
- `clearLocalDatabase(storeObject)`: clears all records from a store.

## 4. Overall architecture

The frontend is organized around:
- Vue composables for state and behavior.
- Services for persistence, networking, and editor extensions.
- A router for page-level navigation.
- A CodeMirror-based markdown editor with image support and local/offline persistence.
