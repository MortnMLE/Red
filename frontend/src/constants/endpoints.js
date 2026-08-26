// documents
export const GETdocsForUser = 'http://localhost:5000/doc/byUser/';
export const POSTnewDocument = 'http://localhost:5000/doc';
export const DELETEdoc = 'http://localhost:5000/doc';
export const PATCHdocument = 'http://localhost:5000/doc';
export const GETdocById = 'http://localhost:5000/doc/byId/';
// images
export const GETimageById = 'http://localhost:5000/img/byId/';
export const POSTnewImage = 'http://localhost:5000/img';
export const DELETEimage = 'http://localhost:5000/img';
export const GETimageIdsForDocumentId = 'http://localhost:5000/img/allForDocId/';
// authentication
export const POSTrefreshAccessToken = 'https://localhost:5000/auth/refresh';
export const POSTauthRegister = 'http://localhost:5000/auth/register';
export const POSTauthLogin = 'http://localhost:5000/auth/login';