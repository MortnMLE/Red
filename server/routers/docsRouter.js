//Imports:
const bodyParser = require('body-parser');
const BSON = require('BSON');
const express = require('express');
//Variables:
const docsRouter = express.Router();

docsRouter.get('/docs', (req, res) => {
    res.send('Received /docs GET request');
    // receive list of docs with hashes
    // check for changes by comparing hashes
    // return new hashes for files
});

docsRouter.post('/docs', (req, res) => {
    res.send('Received /docs POST request');
    //receive new db entry
    //return hash for file
});

docsRouter.patch('/docs', (req, res) => { // might not be needed
    res.send('Received /docs PUT request');
});

module.exports = docsRouter;