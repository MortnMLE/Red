const API_BASE_URL = 'http://localhost:5000';

// documents
export const GETdocsForUser = `${API_BASE_URL}/doc/byUser/`;
export const POSTnewDocument = `${API_BASE_URL}/doc`;
export const DELETEdoc = `${API_BASE_URL}/doc`;
export const PATCHdocument = `${API_BASE_URL}/doc`;
export const GETdocById = `${API_BASE_URL}/doc/byId/`;
// images
export const GETimageById = `${API_BASE_URL}/img/byId/`;
export const POSTnewImage = `${API_BASE_URL}/img`;
export const DELETEimage = `${API_BASE_URL}/img`;
export const GETimageIdsForDocumentId = `${API_BASE_URL}/img/allForDocId/`;
// authentication
export const POSTrefreshAccessToken = `${API_BASE_URL}/auth/refresh`;
export const POSTauthRegister = `${API_BASE_URL}/auth/register`;
export const POSTauthLogin = `${API_BASE_URL}/auth/login`;