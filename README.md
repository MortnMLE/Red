# Red

## Contents

- [Concept](#Concept)
- Features
- Tech Stack
- Dependencies
- Documentation

## Concept

Red (Spanish for network) is a minimalistic browser-based text editor that limits formatting to Markdown and offers optional Vim motions. Its purpose is to provide an efficient note-taking environment where fast Markdown structuring and keyboard-driven editing keep the focus on the content rather than the interface. 

The app includes full user and account management, a clean editing environment with undo/redo, inline image embedding, and internal linking between notes. Data is stored on the server and supported by local caching and offline access for quick and reliable use. 

Navigation is streamlined through full-text search, linked-note traversal, and Vim-based movement, forming a lightweight workspace for writing and organizing information.

## Features
- **User & Account**: 
    - Account Creation
    - Login
    - Logout
- **Content & Editing**:
    - Text Editor Interface
    - Rendered Preview
    - Inline Image Embedding
    - Internal References Between Documents
- **Data Storage**:
    - Offline Support in Case of Connection Failure
    - Autosave
- **Navigation**: 
    - Optional Vim Motions
- **Formatting**:
    - Quick Formatting with Markdown

## Tech Stack
- **Server**: Express, Node.js
- **Database**: MongoDB
- **Frontend**: Vue.js, HTML, CSS, JavaScript

## Dependencies

### Frontend Production
- `vue`  
  Core framework for the Vue 3 UI and component system used throughout the app.

- `vue-router`  
  Handles page navigation and route definitions for the application views.

- `codemirror`  
  Provides the base CodeMirror editor framework used in the document editor.

- `@codemirror/lang-markdown`  
  Adds Markdown language support and syntax handling inside the editor.

- `@codemirror/theme-one-dark`  
  Applies the One Dark theme to the editor interface.

- `@replit/codemirror-vim`  
  Enables Vim-style key bindings for the editor.

- `marked`  
  Converts Markdown content into HTML for rendering the document preview.

- `dompurify`  
  Sanitizes rendered HTML to reduce XSS risk before displaying Markdown content.

### Frontend Development
- `vite`  
  Build tool and local dev server for the Vue frontend.

- `@vitejs/plugin-vue`  
  Adds Vue support to the Vite build pipeline.

- `vite-plugin-vue-devtools`  
  Integrates Vue devtools into the local development experience.

- `vitest`  
  Runs the frontend unit and integration tests.

- `jsdom`  
  Provides a browser-like DOM environment for tests.

- `fake-indexeddb`  
  Simulates IndexedDB in tests for local document and image storage behavior.

### Server Production
- `express`  
  Main web framework for creating the HTTP API, routing requests, and handling middleware.

- `cors`  
  Enables Cross-Origin Resource Sharing so the frontend can call the backend during local development.

- `cookie-parser`  
  Reads cookies from incoming requests so refresh tokens can be validated and attached.

- `bcrypt`  
  Hashes and compares user passwords securely during registration and login.

- `jsonwebtoken`  
  Creates and verifies JWT tokens for authentication and refresh flow.

- `multer`  
  Handles form-data uploads for image files.

- `mongodb`  
  Connects the server to MongoDB and manages database collections used for the app’s storage.

### Server Development
- `jest`  
  Main test runner for server-side unit tests.

- `supertest`  
  Sends HTTP requests to the app in integration tests without a browser.

- `nodemon`  
  Restarts the server automatically while developing.

## Documentation
