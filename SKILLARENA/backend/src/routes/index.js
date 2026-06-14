const express = require('express');
const authRoutes = require('./authRoutes');
const homeRoutes = require('./homeRoutes');
const platformRoutes = require('./platformRoutes');
const adminRoutes = require('./adminRoutes');
const resumeRoutes = require('./resumeRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/home', homeRoutes);
router.use('/platform', platformRoutes);
router.use('/resume', resumeRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Skill Arena API' });
});

module.exports = router;
