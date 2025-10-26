const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users/register - Register a new organizer
router.post('/register', userController.register.bind(userController));

// POST /api/users/login - Login (for future use)
router.post('/login', userController.login.bind(userController));

module.exports = router;