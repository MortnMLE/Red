const image = require('../models/image');
const db = require('../db/databaseService');
const { imageDbName } = require('../constants');
const { validate } = require('../utils/validate');

exports.create = async (req, res) => {
    try {
        const { doc_id, name, file } = req.body;

        if (!validate([doc_id, name, file])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const newImage = image.create(doc_id, name, file);

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

        if (!validate([id])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const image = await db.getOne(imageDbName, id);

        if (!image) {
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
        const { doc_id } = req.params;

        if (!validate([doc_id])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const images = await db.getAll(imageDbName, doc_id);

        if (!images) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                message: 'images not found document id',
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

        if (!validate([id])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const response = await db.deleteOne(imageDbName, id);

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