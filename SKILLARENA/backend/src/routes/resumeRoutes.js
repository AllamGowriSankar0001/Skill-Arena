const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const resumeController = require('../controllers/resumeController');
const { createRateLimiter, getClientIp } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authMiddleware);

const pdfExportLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many PDF export requests. Please try again later.',
  code: 'PDF_RATE_LIMIT',
  keyGenerator: (req) => `resume-pdf::${req.user?._id || getClientIp(req)}`,
});

router.get('/me', resumeController.getMyResume);
router.put('/me', resumeController.saveMyResume);
router.delete('/me', resumeController.deleteMyResume);

router.get('/mine', resumeController.listMyResumes);
router.post('/mine', resumeController.createMyResume);
router.get('/mine/:id', resumeController.getMyResumeById);
router.put('/mine/:id', resumeController.saveMyResumeById);
router.delete('/mine/:id', resumeController.deleteMyResumeById);

router.post('/ai', resumeController.generateAI);
router.post('/pdf', pdfExportLimiter, resumeController.exportPdf);

module.exports = router;
