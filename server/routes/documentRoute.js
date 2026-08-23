const express = require('express');
const { authenticateToken } = require('../middlewares/authenticate');
//Variables:
const documentRoute = express.Router();
const documentController = require('../controllers/documentController');

documentRoute.get('/forUser/:user_id', authenticateToken, documentController.getAllForUser);

documentRoute.get('/get/:id', authenticateToken, documentController.getById);

documentRoute.post('', authenticateToken, documentController.create);

documentRoute.patch('', authenticateToken, documentController.patch);

module.exports = documentRoute;