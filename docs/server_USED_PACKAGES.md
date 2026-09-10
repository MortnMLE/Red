# Server Used Packages

This file lists the packages currently used by the server app and briefly explains why they are included.

## Production dependencies

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

## Development dependencies

- `jest`  
  Main test runner for server-side unit tests.

- `supertest`  
  Sends HTTP requests to the app in integration tests without a browser.

- `nodemon`  
  Restarts the server automatically while developing.