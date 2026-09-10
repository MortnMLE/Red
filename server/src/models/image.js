const { ObjectId, Binary } = require('mongodb');

function create(docId, name, file) {
    return {
        docId: new ObjectId(docId),
        name,
        mimeType: file.mimetype || file.mimeType,
        size: file.size,
        data: new Binary(file.buffer)
    };
}

module.exports = {
    create
};