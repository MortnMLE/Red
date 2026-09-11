# Server

In the following sections implemented API routes, as well as used production and development dependencies are highlighted.

## Contents

- [API Routes](#API-Routes)
- [Dependencies](#Dependencies)

# API Routes

The server listens on `http://localhost:5000` by default. The API prefixes are
registered in `server/app.js`:

- `/auth` for authentication
- `/doc` for documents
- `/img` for images

Unless stated otherwise, JSON responses use `Content-Type: application/json`.
Successful JSON responses include `success: true`; error JSON responses include
`success: false`.

### Authentication

Authentication routes do not require an access token. A successful registration or
login response sets an HTTP-only `refreshToken` cookie.

#### `POST /auth/register`

Creates a user and returns an access token.

Request body:

```json
{
  "username": "username",
  "password": "password"
}
```

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "id": "<userId>", "success": true, "token": "<accessToken>" }` | User created. Also sets the `refreshToken` cookie. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `username` or `password` is missing or invalid. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Hashing, database, token, or another server error occurs. |

#### `POST /auth/login`

Authenticates an existing user.

Request body:

```json
{
  "username": "username",
  "password": "password"
}
```

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "id": "<userId>", "token": "<accessToken>", "success": true }` | Credentials are valid. Also sets the `refreshToken` cookie. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `username` or `password` is missing or invalid. |
| `400 Bad Request` | `{ "error": "INVALID_CREDENTIALS", "success": false }` | The user does not exist or the password is incorrect. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | A database, password, token, or another server error occurs. |

#### `POST /auth/refresh`

Issues a new access token using the `refreshToken` cookie. No request body is
required.

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "token": "<accessToken>", "success": true }` | The cookie exists, is stored by the server, and passes JWT verification. |
| `401 Unauthorized` | `{ "error": "UNAUTHORIZED", "success": false }` | The `refreshToken` cookie is missing. |
| `403 Forbidden` | `{ "error": "INVALID", "success": false }` | The cookie is not stored or the JWT is invalid or expired. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Another server error occurs. |

### Authentication Middleware

All document and image routes require an access token in the following header:

```text
Authorization: Bearer <accessToken>
```

The middleware returns these responses before the controller runs:

| Status | Body | Condition |
| --- | --- | --- |
| `401 Unauthorized` | `{ "message": "Token missing" }` | The header is absent, has no token, or contains `undefined` or `null`. |
| `403 Forbidden` | `{ "message": "Invalid or expired token" }` | JWT verification fails. |

### Documents

Document IDs and user IDs must be valid MongoDB ObjectId values where the route
validates them. Document access is restricted to the authenticated user.

#### `GET /doc/byUser`

Returns all documents for the authenticated user. The user identity comes from
the access token.

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "documents": [<document>], "success": true }` | Documents were queried. Each document contains its fields with `_id` exposed as `id`. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | The authenticated user ID is invalid or missing. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Database or another server error occurs. |

#### `GET /doc/byId/:id`

Returns one document owned by the authenticated user.

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "id": "<documentId>", "title": "<title>", "content": "<content>", "version": <number>, "flags": <object>, "success": true }` | The document exists and belongs to the authenticated user. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `id` is missing or is not a valid ObjectId. |
| `404 Not Found` | `{ "error": "NOT_FOUND", "success": false }` | The document does not exist or belongs to another user. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Database or another server error occurs. |

#### `POST /doc`

Creates a document.

Request body:

```json
{
  "title": "My document",
  "content": "# Text",
  "version": 1
}
```

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `201 Created` | `{ "id": "<documentId>", "success": true }` | The document was inserted. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `title` or `version` is missing or invalid. `content` is optional according to the controller. |
| `500 Internal Server Error` | `{ "success": false }` | The database insert is not acknowledged. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Another server error occurs. |

#### `PATCH /doc`

Updates a document when the submitted version is newer than the stored version.

Request body:

```json
{
  "id": "<documentId>",
  "title": "Updated title",
  "content": "Updated content",
  "version": 2
}
```

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "id": "<documentId>", "newSyncedVersion": 2, "success": true }` | The document is owned by the user and the update succeeds. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `id`, `title`, or `version` is missing or invalid, or `id` is not a valid ObjectId. |
| `404 Not Found` | `{ "error": "NOT_FOUND", "success": false }` | The document does not exist or belongs to another user. |
| `409 Conflict` | `{ "error": "VERSION_CONFLICT", "success": false }` | The submitted version is not newer, or the conditional update changed no document. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Database or another server error occurs. |

#### `DELETE /doc`

Soft-deletes a document by setting `flags.deleted` to `true`.

Request body:

```json
{
  "id": "<documentId>"
}
```

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "success": true }` | The document is owned by the user and its deleted flag is updated. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `id` is missing or is not a valid ObjectId. |
| `404 Not Found` | `{ "error": "NOT_FOUND", "success": false }` | The document is not owned by the user or the update changes no document. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Database or another server error occurs. |

### Images

Image upload uses `multipart/form-data`. The upload field must be named
`image`, and only filenames ending in `.jpg`, `.jpeg`, or `.png` are accepted
by the route's Multer filter.

#### `POST /img`

Uploads an image associated with a document.

Multipart fields:

- `docId`: the document ObjectId
- `name`: the image name
- `image`: the image file

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "id": "<imageId>", "success": true }` | The file is accepted, the document belongs to the user, and the image is inserted. `success` mirrors the database acknowledgement. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `docId`, `name`, or the file is missing, or `docId` is not a valid ObjectId. |
| `404 Not Found` | `{ "error": "NOT_FOUND", "success": false }` | The document does not exist or belongs to another user. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Database or another controller error occurs. |

#### `GET /img/byId/:id`

Downloads an image owned indirectly through one of the authenticated user's
documents.

Success response:

- `200 OK`
- Body: raw image bytes
- `Content-Type`: the stored image MIME type
- `Content-Disposition`: `inline; filename="<image name>"`
- `Access-Control-Expose-Headers: Content-Disposition`

Error responses:

| Status | Body | Condition |
| --- | --- | --- |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `id` is missing or is not a valid ObjectId. |
| `404 Not Found` | `{ "error": "NOT_FOUND", "success": false }` | The image does not exist, or its document is not owned by the user. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Database or another server error occurs. |

#### `GET /img/allForDocId/:docId`

Returns IDs for all images belonging to a document owned by the authenticated
user.

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "images": ["<imageId>"], "success": true }` | The document is owned by the user. An empty image collection returns `images: []`. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `docId` is missing or is not a valid ObjectId. |
| `404 Not Found` | `{ "error": "NOT_FOUND", "success": false }` | The document is not owned by the user, or the image query returns no collection. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Database or another server error occurs. |

#### `DELETE /img`

Deletes an image.

Request body:

```json
{
  "id": "<imageId>"
}
```

Responses:

| Status | Body | Condition |
| --- | --- | --- |
| `200 OK` | `{ "success": true }` | The image exists, its document belongs to the user, and deletion succeeds. |
| `400 Bad Request` | `{ "error": "BAD_REQUEST", "success": false }` | `id` is missing or is not a valid ObjectId. |
| `404 Not Found` | `{ "error": "NOT_FOUND", "success": false }` | The image, its document, or the deletion target is not found or not owned by the user. |
| `500 Internal Server Error` | `{ "error": <error>, "success": false }` | Database or another server error occurs. |

## Dependencies

This file lists the packages currently used by the server app and briefly explains why they are included.

### Production dependencies

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

### Development dependencies

- `jest`  
  Main test runner for server-side unit tests.

- `supertest`  
  Sends HTTP requests to the app in integration tests without a browser.

- `nodemon`  
  Restarts the server automatically while developing.