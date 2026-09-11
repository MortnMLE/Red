# Red

## Contents

- [Concept](#Concept)
- [Features](#Features)
- [Tech Stack](#Tech-Stack)
- [Dependencies](#Dependencies)
- [Technical Documentation](#Technical-Documentation)
    - [Database](https://github.com/MortnMLE/Red/tree/main/docs/Database)
    - [Server](https://github.com/MortnMLE/Red/tree/main/docs/Server)
        - [API Routes](https://github.com/MortnMLE/Red/tree/main/docs/Server#API-Routes)
        - [Dependencies](https://github.com/MortnMLE/Red/tree/main/docs/Server#Dependencies)

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

## Technical Documentation
- Technical documentation for the database can be found here: [Database](https://github.com/MortnMLE/Red/tree/main/docs/Database)
