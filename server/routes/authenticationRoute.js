const express = require('express');
const authController = require('../controllers/authenticationController');

//Variables:
const userRouter = express.Router();
// route for registering new accounts
userRouter.post('/register', authController.register);
// route for login, returns a Jsonwebtoken
userRouter.post('/login', authController.login);
// route for, refreshing the authToken if expired
userRouter.post('/refresh', authController.refresh);

module.exports = userRouter;