const image = require('../models/image');
const db = require('../db/databaseService');
const { imageDbName } = require('../constants');
const { response } = require('express');

exports.create = async (req, res) => {
    const { doc_id, user_id, name, file } = req.body;

    try {
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
    const { id } = req.params;

    try {
        // get the image
        const image = await db.getOne(imageDbName, id);

        // return 404 if result is undefined
        if (!result) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                mesasge: 'image not found',
                success: false
            });
        }

        // set the headers
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
    const { doc_id } = req.params;

    try {
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
            images = result,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            error,
            success: false
        });
    }
}