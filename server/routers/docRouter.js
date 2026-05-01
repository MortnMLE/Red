//Imports:
const BSON = require('BSON');
const express = require('express');
const doc = require('../database/docService');
const { ValidationError, DatabaseError } = require('../errors/errors');
const applyPatch = require('diff');

//Variables:
const docRouter = express.Router();

docRouter.get('/', (req, res) => {
    res.send('Received /docs GET request');
    // receive list of docs with hashes
    // check for changes by comparing hashes
    // return new hashes for files
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

        res.status(201).json({ id });
    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }    

    res.status(500).json({
        error: 'UNKNOWN',
        message: 'unknown error in docRouter.POST'
    })
});

docRouter.patch('/full', async (req, res) => {
    try {
        //Validation
        if (typeof req.body.docId !== 'string' || req.body.docId === '' ||
            typeof req.body.content !== 'string' ||
            typeof req.body.title !== 'string' ||
            typeof req.body.lastSyncedVersion !== 'number'
        ) {
            res.status(400).json({
                error: 'FULL_DOC_VALIDATION_ERROR',
                message: 'invalid document data provided by client'
            });
            return;
        }

        const document = await document.getDocById(req.body.docId);
        if (document.lastSyncedVersion >= req.body.lastSyncedVersion) {
            res.status(400).json('DECLINED');
            return;
        }

        const newVersion = req.body.lastSyncedVersion++;
        document.content = req.body.content;
        document.title = req.body.title;
        document.version = newVersion;
        
        await doc.updateDocument(document);

        res.status(200).json({
            id: document.uuid,
            newSyncedVersin: newVersion
        });
    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
        return;
    }

    res.status(500).json({
        error: 'UNKNOWN',
        message: 'unkown error in docRouter/PATCH/full'
    });
});

docRouter.patch('/diff', async (req, res) => {
    try {
        //validation
        if (typeof req.body.docId !== 'string' || req.body.docId === '' || 
            typeof req.body.patch !== 'object' ||
            typeof req.body.patch !== 'string' ||
            typeof req.body.lastSyncedVersion !== 'int' || req.body.lastSyncedVersion === 0 
        ) {
            res.status(400).json({
                error: 'DIFF_DOC_VALIDATION_ERROR',
                message: 'invalid diff data provided by client'
            });
        }

        const document = await doc.getDocById(req.body.docId);
        
        if (document.lastSyncedVersion >= req.body.lastSyncedVersion) {
            res.status(409).json('DECLINED');
            return;
        }
        
        if (applyPatch(document, req.body.patch)) {
            document.title = req.body.title;
            await doc.updateDocument(document);
        } else {
            res.status(400).json('Patch could not be applied');
            return;
        }

    } catch (err) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
        return;
    }

    res.status(500).json({
        error: 'UNKNOWN',
        message: 'unkown error in docRouter/PATCH/full'
    });
});

module.exports = docRouter;