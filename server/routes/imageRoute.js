const express = require('express');
const imageRoute = express.Router();
const imageController = require('../controllers/imageController');
const { authenticateToken } = require('../middlewares/authenticate');

// multer setup
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Not an image file.'));
        }
        cb(undefined, true);
    }
});

imageRoute.post('', upload.single('image'), authenticateToken, imageController.create);

imageRoute.get('/byId/:id', authenticateToken, imageController.getById);

imageRoute.get('/allForDocId/:docId', authenticateToken, imageController.getAllIdsByDocId);

imageRoute.delete('', authenticateToken, imageController.delete);

module.exports = imageRoute;