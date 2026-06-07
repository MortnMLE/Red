const express = require('express');
const img = require('../services/imgService');
const {
    ValidationError,
    DatabaseError
} = require('../errors/errors');
const fs = require('fs');
const { Binary } = require('mongodb');
const multer = require('multer');

const imgRouter = express.Router();
const upload = multer({
    storage: multer.memoryStorage()
});

imgRouter.post('/new', upload.single('image'), async (req, res) => {
    // req body:
    // doc_id
    // file
    // name

    if (typeof req.body.doc_id !== 'string' ||
        req.body.user_id === '' ||
        req.body.file === null
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
            req.body.file
        );

        if (response.success) {
            return res.status(201).json({
                _id: response.insertedId,
                success: true
            });
        }
    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.messsage,
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

        res.set('Content-Type', result.mimeType);
        res.send(result.data.buffer);
        // return res.status(200).json({
        //     mimeType: result.mimeType,
        //     file: result.data,
        //     name: result.name,
        //     success: true
        // });
    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
});

imgRouter.get('/:doc_id', async (req, res) => {
    const { doc_id } = req.params;

    if (typeof doc_id !== 'string' ||
        doc_id === ''
    ) {
        return res.status(400).json({
            error: 'INVALID_INPUT',
            message: 'invalid id provided by client',
            success: false
        });
    }

    try {
        const result = await img.getImagesByDocId(docId);

        if (!result) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'images not found',
                success: false
            });
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

    try {

    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.messsage,
            success: false
        });
    }
});