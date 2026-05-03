//Imports:
const BSON = require('BSON');
const express = require('express');
const doc = require('../database/docService');
const { ValidationError, DatabaseError } = require('../errors/errors');
const diff = require('diff');

//Variables:
const docRouter = express.Router();

docRouter.get('/byUser', async (req, res) => {

    try {
        //Validation
        if (typeof req.body.user_id !== 'string' || req.body.user_id === '') {
            res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid user_id provided by client'
            });
            return;
        }

        // fetch all documents for given user_id
        const docs = await doc.getDocsByUserId(req.body.user_id);
        
        res.status(200).json(docs);

    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }
});

docRouter.get('/', async (req, res) => {

    try {
        //Validation
        if (typeof req.body.id !== 'string' || req.body.id === '') {
            res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid id provided by client'
            });
            return;
        }

        const result = await doc.getDocById(req.body.id);
        
        if (!result) {
            res.status(404).json({
                error: 'NOT_FOUND',
                message: 'document not found'
            });
            return;
        }

        res.status(200).json(result);

    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }
});

docRouter.post('/', async (req, res) => {

    try {
        // Validation
        if (typeof req.body.user_id !== 'string' || req.body.user_id === '' ||
            typeof req.body.title !== 'string' || 
            typeof req.body.content !== 'string'
        ) {
            res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'invalid input values provided by client'
            });
            return;
        }

        const id = await doc.createDoc(
            req.body.user_id,
            req.body.title,
            req.body.content
        );

        res.status(201).json({ 
            id: id,
            version: 1 
        });

    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }    
});

docRouter.patch('/full', async (req, res) => {

    try {
        //Validation
        if (typeof req.body.id !== 'string' || req.body.id === '' ||
            typeof req.body.content !== 'string' ||
            typeof req.body.title !== 'string' ||
            typeof req.body.localVersion !== 'number'
        ) {
            res.status(400).json({
                error: 'FULL_DOC_VALIDATION_ERROR',
                message: 'invalid document data provided by client'
            });
            return;
        }

        const existingDoc = await doc.getDocById(req.body.id);
        
        if (!existingDoc) {
            res.status(404).json({
                error: 'NOT_FOUND',
                message: 'document not found'
            });
            return;
        }

        if (existingDoc.version >= req.body.localVersion) {
            res.status(409).json('VERSION_CONFLICT');
            return;
        }

        existingDoc.content = req.body.content;
        existingDoc.title = req.body.title;
        existingDoc.version += 1;
        
        await doc.updateDocument(existingDoc);

        res.status(200).json({
            id: existingDoc.uuid,
            newSyncedVersion: existingDoc.version 
        });

        return;

    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
        return;
    }
});

docRouter.patch('/diff', async (req, res) => {

    try {
        //validation
        if (typeof req.body.id !== 'string' || req.body.id === '' || 
            typeof req.body.patch !== 'object' ||
            typeof req.body.title !== 'string' ||
            typeof req.body.localVersion !== 'number' || req.body.localVersion === 0 
        ) {
            res.status(400).json({
                error: 'DIFF_DOC_VALIDATION_ERROR',
                message: 'invalid diff data provided by client'
            });
            return;
        }

        // Fetch existing document by id
        const existingDoc = await doc.getDocById(req.body.id);
        if (!existingDoc) {
            res.status(404).json({
                error: 'NOT_FOUND',
                message: 'Document not found'
            });
            return;
        }

        // Check for version conflict
        if (existingDoc.version >= req.body.localVersion) {
            res.status(409).json('DECLINED');
            return;
        }
        
        // Apply patch 
        const patched = diff.applyPatch(existingDoc.content, req.body.patch);
        // Update Document on Atlas
        if (patched) {
            existingDoc.title = req.body.title;
            existingDoc.content = patched;
            existingDoc.version += 1;

            await doc.updateDocument(existingDoc);
            
            res.status(200).json({
                id: existingDoc.uuid,
                newSyncedVersion: existingDoc.version
            });
            return;
        } else {
            res.status(400).json('Patch could not be applied');
            return;
        }
    // Catch Errors
    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
        return;
    }
});

module.exports = docRouter;