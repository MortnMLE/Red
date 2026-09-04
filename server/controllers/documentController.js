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

        const document = await db.getOne(documentDbName, new ObjectId(id));

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
            flags: document.flags,
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

        const document = await db.getOne(documentDbName, new ObjectId(id));

        if (!document.flags?.deleted) {
            document.flags.deleted = true;
        }

        const filter = { _id: new ObjectId(id) };
        const query = {
            $set: {
                'flags.deleted': true
            }
        }

        const response = await db.update(documentDbName, filter, query);

        if (response.modifiedCount == 1) {
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
                version,
                flags: {deleted: false}
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

        const existingDocument = await db.getOne(documentDbName, new ObjectId(id));

        if (!existingDocument) {
            return res.status(404).json({
                error: 'NOT_FOUND',
                success: false
            });
        }

        if (existingDocument.version >= version) {
            return res.status(409).json({
                error: 'VERSION_CONFLICT',
                success: false
            });
        }

        const filter = { _id: new ObjectId(id)};
        const query = {
            $set: {
                title,
                content,
                version
            }
        };

        const result = await db.update(documentDbName, filter, query);

        if (result.modifiedCount === 0) {
            return res.status(500).json({
                error: 'NOT_CHANGED',
                success: false
            });
        }

        return res.status(200).json({
            id: existingDocument.uuid,
            newSyncedVersion: existingDocument.version,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            error,
            success: false
        });
    }
}