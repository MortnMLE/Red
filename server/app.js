//Imports:
const express = require('express');
const {connectDB, closeDB} = require('./database/connection');
const MongoClient = require('mongodb');
const cors = require('cors');
//Local Variables:
const app = express();
const port = 5000;

//Import routers:
const userRouter = require('./routers/userRouter');
const docRouter = require('./routers/docRouter');
const imgRouter = require('./routers/imgRouter');

app.set('view engine');
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    exposedHeaders: ['Content-Disposition']
}));
app.use('/user', userRouter);
app.use('/doc', docRouter);
app.use('/img', imgRouter);

//Start server and initialize connection to Atlas
async function start() {
    try {
        await connectDB();

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (err) {
        console.error(`Failed to start server: ${err}`);
        process.exit(1);
    }
};

// Shutdown on Ctrl + C. Close connection to Atlas.
process.on('SIGINT', async () => {
    console.log('Shutting down.');
    await closeDB();
    process.exit(0);
});

// Start the server.
start();

module.exports = {
    app
};