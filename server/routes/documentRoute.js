const express = require('express');
const { authenticateToken } = require('../middlewares/authenticate');
const documentController = require('../controllers/documentController');
const documentRoute = express.Router();

documentRoute.get('/byUser', authenticateToken, documentController.getAllForUser);

documentRoute.get('/byId/:id', authenticateToken, documentController.getById);

documentRoute.post('', authenticateToken, documentController.create);

documentRoute.patch('', authenticateToken, documentController.patch);

documentRoute.delete('', authenticateToken, documentController.delete);

module.exports = documentRoute;