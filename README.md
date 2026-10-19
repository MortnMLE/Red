# Red

## Contents

- [Concept](#Concept)
- [Technical Approach](#Technical-Approach)
- [Installation & Setup](#Installation-&-Setup)
- [Features](#Features)
- [Tech Stack](#Tech-Stack)
- [Dependencies](#Dependencies)
- [Technical Documentation](#Technical-Documentation)

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

## Installation & Setup
Required tools: npm, vite

### Installation
1. In the console terminal, navigate to the desired installation path.
2. Clone the repository:
    - Run `git clone https://github.com/MortnMLE/Red.git`
3. Navigate into the newly created directory
5. Install frontend dependencies:
    - Navigate to the `frontend` directory
    - Run `npm install`
6. Install backend dependencies:
    - Navigate to the `server` directory
    - Run `npm install`

### Environment Variables
- Create frontend .env-file:
    - Navigate to the `frontend` directory
    - Run `cp .env.sample .env`
  No manual adjustment needed.
- Create backend `.env` file:
    - Navigate to the `server` directory
    - Run `cp .env.sample .env`
    - Replace the `MONGODB` value in `.env`, see next section.

### MongoDB Connection
Store the MongoDB connection string in the .env-`MONGODB` variable.
Step-by-step:
- Login / Create an account on https://cloud.mongodb.com and follow.
- Create a free database
- Setup the connection
    - (If not directly prompted after creation of the database, click "Connect" in the cluster)
    - Select "Drivers and Client Libraries"
    - Copy the connection string
    - If the connection string does not include the password, replace `<db_password>` with the password
    - Click "Done"
    - Replace the examplatory connection string in the `MONGODB` variable of the `.env` file
- The database, including required collections are automatically created on first startup of the server

### Starting the application
1. Starting the server:
   - Navigate to the `server` directory
   - Run `npm start`
2. Run the Vite dev-environment:
   - Navigate to the `frontend` directory
   - Run `npm run dev`
3. Open the web app on http://localhost:3000/

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
- Technical documentation for the server can be found here: [Server](https://github.com/MortnMLE/Red/tree/main/docs/Server)
    - [API Routes](https://github.com/MortnMLE/Red/tree/main/docs/Server#API-Routes)
    - [Middleware](https://github.com/MortnMLE/Red/tree/main/docs/Server#Middleware)
    - [Dependencies](https://github.com/MortnMLE/Red/tree/main/docs/Server#Dependencies)
- Technical documentation for the frontend can be found here: [Frontend](https://github.com/MortnMLE/Red/tree/main/docs/Frontend)
    - [Processes](https://github.com/MortnMLE/Red/blob/main/docs/Frontend/README.md#processes)
        - [Documents](https://github.com/MortnMLE/Red/blob/main/docs/Frontend/README.md#documents)
        - [Images](https://github.com/MortnMLE/Red/blob/main/docs/Frontend/README.md#images)
    - [Responsiveness](https://github.com/MortnMLE/Red/blob/main/docs/Frontend/README.md#responsiveness)
    - [Dependencies](https://github.com/MortnMLE/Red/blob/main/docs/Frontend/README.md#dependencies)
