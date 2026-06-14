const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const resumeController = require('../controllers/resumeController');

const router = express.Router();

router.use(authMiddleware);

router.get('/me', resumeController.getMyResume);
router.put('/me', resumeController.saveMyResume);
router.delete('/me', resumeController.deleteMyResume);

router.get('/mine', resumeController.listMyResumes);
router.post('/mine', resumeController.createMyResume);
router.get('/mine/:id', resumeController.getMyResumeById);
router.put('/mine/:id', resumeController.saveMyResumeById);
router.delete('/mine/:id', resumeController.deleteMyResumeById);

router.post('/ai', resumeController.generateAI);
router.post('/pdf', resumeController.exportPdf);

module.exports = router;
