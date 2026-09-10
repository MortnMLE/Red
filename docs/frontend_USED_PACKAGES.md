# Frontend Used Packages

This file lists the packages currently used by the frontend app and briefly explains why they are included.

## Production dependencies

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

## Development dependencies

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