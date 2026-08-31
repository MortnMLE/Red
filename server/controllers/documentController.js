const { documentDbName } = require('../constants');
const db = require('../db/databaseService');
const { ObjectId } = require('mongodb');
const { validate } = require('../utils/validate');

exports.getAllForUser = async (req, res) => {
    try {
        const userId = req.user;

        if (!validate([userId])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const documents = await db.getAll(documentDbName, { userId: new ObjectId(userId) });

        let documentsArray = await documents.toArray();
        documentsArray = documentsArray.map(doc => {
            const { _id, ...rest } = doc;

            return {
                ...rest,
                id: _id
            };
        });

        return res.status(200).json({
            documents: documentsArray,
            success: true
        });
    } catch (error) {
        console.log(error);
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

        const document = await db.getOne(documentDbName, id);

        if (!document) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        return res.status(200).json({
            id: document.id,
            title: document.title,
            content: document.content,
            version: document.version,
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

        const response = await db.deleteOne(documentDbName, id);

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

exports.create = async (req, res) => {
    try {
        const { title, content, version } = req.body;

        if (!validate([title, version])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const response = await db.insertOne(
            documentDbName,
            {
                userId: new ObjectId(req.user),
                title,
                content,
                version
            }
        );

        if (!response.acknowledged) {
            return res.status(500).json({
                success: false
            });
        }

        return res.status(201).json({
            id: response.insertedId,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            error,
            success: false
        });
    }
}

exports.patch = async (req, res) => {
    try {
        const { id, content, title, version } = req.body;

        if (!validate([id, title, version])) {
            return res.status(400).json({
                error: 'BAD_REQUEST',
                success: false
            });
        }

        const document = await db.getOne(documentDbName, id);

        if (!document) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        if (document.version >= version) {
            return res.status(409).json({
                error: 'VERSION_CONFLICT',
                success: false
            });
        }

        document.title = title;
        document.content = content;
        document.version = version;

        const result = await db.update(documentDbName, document);

        if (result.modifiedCount === 0) {
            return res.status(500).json({
                error: 'NOT_CHANGED',
                success: false
            });
        }

        return res.status(200).json({
            id: document.uuid,
            newSyncedVersion: document.version,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            error,
            success: false
        });
    }
}