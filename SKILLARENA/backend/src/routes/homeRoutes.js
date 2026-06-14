const express = require('express');
const { getHome } = require('../controllers/homeController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getHome);

module.exports = router;
