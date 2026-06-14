const resumeService = require('../services/resumeService');

const getMyResume = async (req, res, next) => {
  try {
    const resume = await resumeService.getOrCreateResume(req.user._id);
    res.json({ resume });
  } catch (error) {
    next(error);
  }
};

const listMyResumes = async (req, res, next) => {
  try {
    const resumes = await resumeService.listMyResumes(req.user._id);
    res.json({ resumes });
  } catch (error) {
    next(error);
  }
};

const createMyResume = async (req, res, next) => {
  try {
    const resume = await resumeService.createResume(req.user._id);
    res.status(201).json({ resume });
  } catch (error) {
    next(error);
  }
};

const getMyResumeById = async (req, res, next) => {
  try {
    const resume = await resumeService.getResumeById(req.user._id, req.params.id);
    res.json({ resume });
  } catch (error) {
    if (error.message === 'Resume not found.') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

const saveMyResume = async (req, res, next) => {
  try {
    const resume = await resumeService.saveResume(req.user._id, req.body);
    res.json({ resume });
  } catch (error) {
    next(error);
  }
};

const saveMyResumeById = async (req, res, next) => {
  try {
    const resume = await resumeService.saveResumeById(req.user._id, req.params.id, req.body);
    res.json({ resume });
  } catch (error) {
    if (error.message === 'Resume not found.') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

const generateAI = async (req, res, next) => {
  try {
    const { type, context, state } = req.body || {};
    if (!type) {
      return res.status(400).json({ message: 'AI type is required.' });
    }

    const result = await resumeService.runResumeAI(req.user._id, type, context, state);
    res.json(result);
  } catch (error) {
    if (error.code === 'AI_RATE_LIMIT') {
      return res.status(429).json({
        message: error.message || 'AI service is temporarily busy.',
        code: 'AI_RATE_LIMIT',
        retryAfterSeconds: error.retryAfterSeconds || 60,
      });
    }
    if (error.code === 'AI_KEY_REQUIRED') {
      return res.status(503).json({
        message: error.message || 'Add a Gemini or ChatGPT API key in your Profile settings.',
        code: 'AI_KEY_REQUIRED',
      });
    }

    const status = error.message?.includes('GEMINI_API_KEY') ? 503 : 400;
    res.status(status).json({
      message: error.message || 'AI request failed.',
      code: error.code,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
};

const exportPdf = async (req, res, next) => {
  try {
    const { ats } = req.body || {};
    if (!ats || typeof ats !== 'object') {
      return res.status(400).json({ message: 'ATS resume payload is required.' });
    }

    const { renderResumePdf } = require('../services/resumePdfService');
    const pdfBuffer = await renderResumePdf(ats);
    const safeName = String(ats.name || 'resume')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'resume';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-resume.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

const deleteMyResume = async (req, res, next) => {
  try {
    const resume = await resumeService.deleteResume(req.user._id);
    res.json({ resume, message: 'Resume deleted. You can start a new one.' });
  } catch (error) {
    next(error);
  }
};

const deleteMyResumeById = async (req, res, next) => {
  try {
    const result = await resumeService.deleteResumeByUserAndId(req.user._id, req.params.id);
    res.json({ ...result, message: 'Resume deleted.' });
  } catch (error) {
    if (error.message === 'Resume not found.') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

const listAllResumes = async (req, res, next) => {
  try {
    const resumes = await resumeService.listResumesForAdmin();
    res.json({ resumes });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyResume,
  listMyResumes,
  createMyResume,
  getMyResumeById,
  saveMyResume,
  saveMyResumeById,
  generateAI,
  deleteMyResume,
  deleteMyResumeById,
  listAllResumes,
  exportPdf,
};
