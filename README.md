# Red

## Contents

- [Concept](#Concept)
- [Technical Approach](#Technical-Approach)
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

## Technical Approach

For this project, a fat-client architecture was chosen, placing the majority of data processing and application logic on the client device. This approach allows independent user interaction in the event of server connectivity issues or a loss of internet connection.
The server primarily acts as the interface for data storage and retrieval while applying security measures to block clients from accessing unauthorized resources.

On startup, the application synchronizes data between the server and local client storage, enabling users to work sequentially across different devices. Once logged in, users can continue working even without an internet connection.

User interaction is limited to two pages: a registration/login page at the `/` path and the single-page editor at `/editor`. Upon successful login or registration, the user is routed to `/editor`.

Authorization and authentication are handled using JSON Web Tokens (JWTs). Upon successful registration or login, the client receives a JWT refresh token, valid for seven days, and a JWT access token, valid for 15 minutes. Middleware is used to verify the authenticity, validity, and expiration of the access token, which is included in all read and write requests to the server. In case of an expired access token, the client requests a new access token by sending a `/refresh` request. After successful validation of the refresh token on the server, a new access token is returned.

## Features
- **User & Account**: 
    - Account Creation
    - Login
    - Logout
- **Content & Editing**:
    - Single-Page Text Editor Interface
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
