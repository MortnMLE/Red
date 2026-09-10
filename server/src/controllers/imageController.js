const image = require('../models/image');
const db = require('../db/databaseService');
const { imageDbName, documentDbName } = require('../constants');
const { validate } = require('../utils/validate');
const { ObjectId } = require('mongodb');

exports.create = async (req, res) => {
    try {
        const { docId, name } = req.body;
        const file = req.file;

        if (!validate([docId, name, file])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        if (!ObjectId.isValid(docId)) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const document = await db.getOne(documentDbName, {
            _id: new ObjectId(docId),
            userId: new ObjectId(req.user)
        });

        if (!document) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        const newImage = image.create(docId, name, file);

        const response = await db.insertOne(imageDbName, newImage);

        return res.status(200).json({
            id: response.insertedId,
            success: response.acknowledged
        });
    } catch (error) {
        return res.status(500).json({
            error,
            success: false
        });
    }
}

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!validate([id]) || !ObjectId.isValid(id)) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const image = await db.getOne(imageDbName, new ObjectId(id));

        if (!image) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        const document = await db.getOne(documentDbName, {
            _id: image.docId,
            userId: new ObjectId(req.user)
        });

        if (!document) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        res.setHeader('Content-Type', image.mimeType);
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${image.name}"`
        );
        res.setHeader(
            'Access-Control-Expose-Headers',
            `Content-Disposition`
        );

        return res.status(200).send(image.data.buffer);
    } catch (error) {
        return res.status(500).json({
            error,
            success: false 
        });
    }
}

exports.getAllIdsByDocId = async (req, res) => {
    try {
        const { docId } = req.params;

        if (!validate([docId]) || !ObjectId.isValid(docId)) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const document = await db.getOne(documentDbName, {
            _id: new ObjectId(docId),
            userId: new ObjectId(req.user)
        });

        if (!document) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        const cursor = await db.getAll(imageDbName, { docId: new ObjectId(docId) });
        const images = await cursor.toArray();

        if (!images) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        let result = [];
        for(const image of images) {
            result.push(image._id);
        }

        return res.status(200).json({
            images: result,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            error,
            success: false
        });
    }
}

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;

        if (!validate([id]) || !ObjectId.isValid(id)) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const existingImage = await db.getOne(imageDbName, new ObjectId(id));

        if (!existingImage) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        const documentId = String(existingImage.docId);
        if (!ObjectId.isValid(documentId)) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        const document = await db.getOne(documentDbName, {
            _id: new ObjectId(documentId),
            userId: new ObjectId(req.user)
        });

        if (!document) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        const response = await db.deleteOne(imageDbName, {
            _id: new ObjectId(id)
        });

        if (response.deletedCount === 1) {
            return res.status(200).json({
                success: true
            });
        } else {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }
    } catch (error) {
        return res.status(500).json({
            error,
            success: false
        });
    }
}