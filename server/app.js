const express = require('express');
const cors = require('cors');
const cookieparser = require('cookie-parser');
const authenticationRoute = require('./src/routes/authenticationRoute');
const documentRoute = require('./src/routes/documentRoute');
const imageRoute = require('./src/routes/imageRoute');

process.loadEnvFile('.env');

function createApp() {
    const app = express();

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

    return app;
}

//Start server and initialize connection to Atlas
async function start() {
    const { connectDB } = require('./src/db/connection');
    const port = process.env.PORT || 5000;

    try {
        await connectDB();

        createApp().listen(port, () => {
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

    const { closeDB } = require('./src/db/connection');
    await closeDB();
    process.exit(0);
});

if (require.main === module) {
    start();
}

module.exports = {
    app: createApp(),
    createApp,
    start
};