const express = require('express')
const testRouter = require('./testRouter');
const bodyParser = require('body-parser');
const app = express();
const port = 5000;

app.set('view engine');
app.use(testRouter);
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
    console.log('Received Request');
});

app.post('/new', (req, res) => {
    const test = req.body['content'];
    res.send('received content:' + test);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
});
