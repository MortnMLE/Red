//Imports:
const express = require('express');
const {connectDB, closeDB} = require('./db/connection');
const cors = require('cors');
//Local Variables:
const app = express();
const port = process.env.PORT || 5000;
const cookieparser = require('cookie-parser');

//Import routes:
const authenticationRoute = require('./routes/authenticationRoute');
const documentRoute = require('./routes/documentRoute');
const imageRoute = require('./routes/imageRoute');

process.loadEnvFile('.env');

app.set('view engine');
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    exposedHeaders: ['Content-Disposition'],
    credentials: true
}));
app.use(cookieparser());
app.use('/auth', authenticationRoute);
app.use('/doc', documentRoute);
app.use('/img', imageRoute);

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

// Shutdown on Ctrl + C. Close connection to Atlas
process.on('SIGINT', async () => {
    console.log('Shutting down.');

    await closeDB();
    process.exit(0);
});

// Start the server
start();

module.exports = {
    app
};