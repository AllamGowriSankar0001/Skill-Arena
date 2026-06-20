const Lesson = require('../models/Lesson');
const lessonProgressService = require('../services/lessonProgressService');
const quizGradingService = require('../services/quizGradingService');
const codingLessonService = require('../services/codingLessonService');

const isAdminUser = (user) => user?.role === 'ADMIN';

const handleError = (error, res, next) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      previousLessonId: error.previousLessonId,
    });
  }
  return next(error);
};

const enrollCourse = async (req, res, next) => {
  try {
    const enrollment = await lessonProgressService.enrollUser(req.user._id, req.params.courseId);
    res.status(201).json({ enrollment });
  } catch (error) {
    handleError(error, res, next);
  }
};

const getCourseProgress = async (req, res, next) => {
  try {
    const progress = await lessonProgressService.getCourseProgress(req.user._id, req.params.courseId);
    res.json(progress);
  } catch (error) {
    handleError(error, res, next);
  }
};

const startLesson = async (req, res, next) => {
  try {
    const progress = await lessonProgressService.startLesson(req.user._id, req.params.lessonId, {
      isAdmin: isAdminUser(req.user),
    });
    res.json({ progress });
  } catch (error) {
    handleError(error, res, next);
  }
};

const getLessonProgress = async (req, res, next) => {
  try {
    const progress = await lessonProgressService.getLessonProgressDetail(
      req.user._id,
      req.params.lessonId,
    );
    res.json(progress);
  } catch (error) {
    handleError(error, res, next);
  }
};

const completeLesson = async (req, res, next) => {
  try {
    const progress = await lessonProgressService.markArticleComplete(
      req.user._id,
      req.params.lessonId,
      { isAdmin: isAdminUser(req.user) },
    );
    res.json({ progress, lessonCompleted: true });
  } catch (error) {
    handleError(error, res, next);
  }
};

const markIncomplete = async (req, res, next) => {
  try {
    const progress = await lessonProgressService.markArticleIncomplete(
      req.user._id,
      req.params.lessonId,
    );
    res.json({ progress });
  } catch (error) {
    handleError(error, res, next);
  }
};

const updateVideoProgress = async (req, res, next) => {
  try {
    const { positionSeconds, durationSeconds, manualComplete } = req.body;
    const progress = await lessonProgressService.updateVideoProgress(
      req.user._id,
      req.params.lessonId,
      {
        positionSeconds,
        durationSeconds,
        manualComplete: Boolean(manualComplete),
        isAdmin: isAdminUser(req.user),
      },
    );
    res.json({
      progress,
      lessonCompleted: progress.status === 'COMPLETED',
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

const submitQuiz = async (req, res, next) => {
  try {
    const result = await quizGradingService.submitQuiz(
      req.user._id,
      req.params.lessonId,
      req.body.answers,
      { isAdmin: isAdminUser(req.user) },
    );
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

const getQuizAttempts = async (req, res, next) => {
  try {
    const attempts = await quizGradingService.listQuizAttempts(req.user._id, req.params.lessonId);
    res.json(attempts);
  } catch (error) {
    handleError(error, res, next);
  }
};

const getCodingLesson = async (req, res, next) => {
  try {
    const payload = await codingLessonService.getCodingLessonPayload(
      req.user._id,
      req.params.lessonId,
      { isAdmin: isAdminUser(req.user) },
    );
    res.json(payload);
  } catch (error) {
    handleError(error, res, next);
  }
};

const saveCodingDraft = async (req, res, next) => {
  try {
    const draft = await lessonProgressService.saveCodingDraft(
      req.user._id,
      req.params.lessonId,
      req.body,
    );
    res.json({ draft });
  } catch (error) {
    handleError(error, res, next);
  }
};

const runCoding = async (req, res, next) => {
  try {
    const result = await codingLessonService.runVisibleCodingTests(
      req.user._id,
      req.params.lessonId,
      req.body,
    );
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

const submitCoding = async (req, res, next) => {
  try {
    const result = await codingLessonService.submitCodingAnswer(
      req.user._id,
      req.params.lessonId,
      req.body,
      { isAdmin: isAdminUser(req.user) },
    );
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

const getCodingAttempts = async (req, res, next) => {
  try {
    const attempts = await codingLessonService.listCodingAttempts(
      req.user._id,
      req.params.lessonId,
    );
    res.json({ attempts });
  } catch (error) {
    handleError(error, res, next);
  }
};

const getLessonAccess = async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.lessonId, status: 'PUBLISHED' });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });

    const access = await lessonProgressService.canAccessLesson(req.user._id, lesson, {
      isAdmin: isAdminUser(req.user),
    });
    res.json(access);
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  enrollCourse,
  getCourseProgress,
  startLesson,
  getLessonProgress,
  completeLesson,
  markIncomplete,
  updateVideoProgress,
  submitQuiz,
  getQuizAttempts,
  getCodingLesson,
  saveCodingDraft,
  runCoding,
  submitCoding,
  getCodingAttempts,
  getLessonAccess,
};
