const express = require('express');
const img = require('../database/imgService');
const {
    ValidationError,
    DatabaseError
} = require('../errors/errors');
const fs = require('fs');
const { Binary } = require('mongodb');

const imgRouter = express.Router();

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

imgRouter.post('/new', upload.single('image'), async (req, res) => {
    // req body:
    // doc_id
    // file
    // name

    if (typeof req.body.doc_id !== 'string' || req.body.doc_id === '' ||
        typeof req.body.user_id !== 'string' || req.body.user_id === '' ||
        typeof req.body.name !== 'string' || req.body.name === '' ||
        !req.file
    ) {
        return res.status(400).json({
            error: 'INVALID_INPUT',
            message: 'Invalid credentials provided by client',
            success: false
        });
    }

    try {
        const response = await img.createImage(
            req.body.doc_id,
            req.body.name,
            req.file
        );

        if (!response.acknowledged) {
            return res.status(500).json({
                error: 'DATABASE_ERROR',
                message: 'Failed to create image in database',
                success: false
            });
        }

        return res.status(201).json({
            id: response.insertedId,
            success: true
        });
    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
});

imgRouter.get('/:id', async (req, res) => {

    const { id } = req.params;

    //validation
    if (typeof id !== 'string' ||
        id === ''
    ) {
        res.status(400).json({
            error: 'INVALID_INPUT',
            message: 'invalid id provided by client',
            success: false
        });
    }

    try {
        const result = await img.getImage(id);

        if (!result) {
            return res.status(404).json({
                    error: 'NOT_FOUND',
                    message: 'image not found',
                    success: false            
            });
        }

        res.setHeader('Content-Type', result.mimeType);
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${result.name}"`
        );
        res.setHeader(
            'Access-Control-Expose-Headers',
            `Content-Disposition`
        );
        
        return res.status(200).send(result.data.buffer);
    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
});

imgRouter.get('/allForDocId/:doc_Id', async (req, res) => {

    const { doc_Id } = req.params;

    if (typeof doc_Id !== 'string' ||
        doc_Id === ''
    ) {
        return res.status(400).json({
            error: 'INVALID_INPUT',
            message: 'invalid id provided by client',
            success: false
        });
    }

    try {
        const images = await img.getImagesByDocId(doc_Id); 

        if (!images) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'images not found',
                success: false
            });
        }

        let result = [];
        for (const image of images) {
            result.push(image._id);
        }

        return res.status(200).json({
            images: result,
            success: true
        });
    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
})

imgRouter.delete('/delete', async (req,res) => {
    if (typeof req.body.id !== 'string' || req.body.id === '') {
        return res.status(400).json({
            error: 'INVALID_INPUT',
            message: 'invalid id provided by client',
            success: false
        });
    }

    try {
        const dbResponse = await img.deleteImage(req.body.id);

        if (dbResponse.deletedCount !== 1 &&
            dbResponse.deletedCount !== 0
        ) {
            return status(500).json({
                error: 'DATABASE_ERROR',
                message: 'Failed to delete document',
                success: false
            });
        }

        return res.status(200).json({
            success: true
        });
    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.messsage,
            success: false
        });
    }
});

module.exports = imgRouter;