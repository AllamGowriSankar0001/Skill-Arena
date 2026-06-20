const express = require('express');
const { signup, login, forgotPassword, getMe, updateMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);

module.exports = router;
