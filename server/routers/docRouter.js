const express = require('express');
const doc = require('../database/docService');
const { ValidationError, DatabaseError } = require('../errors/errors');
const diff = require('diff');

//Variables:
const docRouter = express.Router();

docRouter.post('/byUser', async (req, res) => {

    try {
        //Validation
        if (typeof req.body.user_id !== 'string' || req.body.user_id === '') {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid user_id provided by client',
                success: false
            });
        }

        // fetch all documents for given user_id
        const docs = await doc.getDocsByUserId(req.body.user_id);
        
        return res.status(200).json({
            documents: docs,
            success: true
        });

    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
});

docRouter.post('/byId', async (req, res) => {

    try {
        //Validation
        if (typeof req.body._id !== 'string' || req.body._id === '') {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid id provided by client',
                success: false
            });
        }

        const result = await doc.getDocById(req.body._id);
        
        if (!result) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'document not found',
                success: false
            });
        }

        return res.status(200).json({
            _id: result._id,
            title: result.title,
            content: result.content,
            version: result.version,
            success: true
        });

    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
});

docRouter.post('/new', async (req, res) => {

    try {
        // Validation
        if (typeof req.body.user_id !== 'string' || req.body.user_id === '' ||
            typeof req.body.title !== 'string' || 
            typeof req.body.content !== 'string' ||
            typeof req.body.version !== 'number'
        ) {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid input values provided by client',
                success: false
            });
        }

        const dbResponse = await doc.createDoc(
            req.body.user_id,
            req.body.title,
            req.body.content,
            req.body.version
        );

        if (dbResponse.acknowledged !== true) {
            return res.status(500).json({
                error: 'DATABASE_ERROR',
                message: 'Failed to create document in database',
                success: false
            });
        }

        return res.status(201).json({ 
            _id: dbResponse.insertedId,
            success: true 
        });

    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }    
});

docRouter.patch('/full', async (req, res) => {

    try {
        //Validation
        if (typeof req.body._id !== 'string' || req.body._id === '' ||
            typeof req.body.content !== 'string' ||
            typeof req.body.title !== 'string' ||
            typeof req.body.localVersion !== 'number'
        ) {
            return res.status(400).json({
                error: 'FULL_DOC_VALIDATION_ERROR',
                message: 'invalid document data provided by client',
                success: false
            });
        }

        const existingDoc = await doc.getDocById(req.body._id);
        
        if (!existingDoc) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'document not found',
                success: false
            });
        }

        if (existingDoc.version >= req.body.localVersion) {
            return res.status(409).json({
                error: 'VERSION_CONFLICT',
                message: 'Version conflict detected',
                success: false
            });
        }

        existingDoc.content = req.body.content;
        existingDoc.title = req.body.title;
        existingDoc.version += 1;
        
        await doc.updateDoc(existingDoc);

        return res.status(200).json({
            _id: existingDoc.uuid,
            newSyncedVersion: existingDoc.version,
            success: true
        });

    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            success: false
        });
    }
});

docRouter.patch('/diff', async (req, res) => {

    try {
        //validation
        if (typeof req.body._id !== 'string' || req.body._id === '' || 
            typeof req.body.patch !== 'object' ||
            typeof req.body.title !== 'string' ||
            typeof req.body.localVersion !== 'number' || req.body.localVersion === 0 
        ) {
            return res.status(400).json({
                error: 'DIFF_DOC_VALIDATION_ERROR',
                message: 'invalid diff data provided by client'
            });
        }

        // Fetch existing document by id
        const existingDoc = await doc.getDocById(req.body._id);
        if (!existingDoc) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Document not found'
            });
        }

        // Check for version conflict
        if (existingDoc.version >= req.body.localVersion) {
            return res.status(409).json('DECLINED');
        }
        
        // Apply patch 
        const patched = diff.applyPatch(existingDoc.content, req.body.patch);
        // Update Document on Atlas
        if (patched) {
            existingDoc.title = req.body.title;
            existingDoc.content = patched;
            existingDoc.version += 1;

            await doc.updateDoc(existingDoc);
            
            return res.status(200).json({
                _id: existingDoc.uuid,
                newSyncedVersion: existingDoc.version
            });
        } else {
            return res.status(400).json('Patch could not be applied');
        }
    // Catch Errors
    } catch (err) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }
});

module.exports = docRouter;