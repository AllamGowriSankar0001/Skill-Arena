const Lesson = require('../models/Lesson');
const lessonProgressService = require('../services/lessonProgressService');
const quizGradingService = require('../services/quizGradingService');
const codingLessonService = require('../services/codingLessonService');
const practiceService = require('../services/practiceService');
const { withUserXp } = require('../utils/learningResponse');

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

const listEnrollments = async (req, res, next) => {
  try {
    const enrollments = await lessonProgressService.listEnrollmentSummaries(req.user._id);
    res.json({ enrollments });
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
    const result = await lessonProgressService.markArticleComplete(
      req.user._id,
      req.params.lessonId,
      { isAdmin: isAdminUser(req.user) },
    );
    res.json(
      await withUserXp(req, {
        progress: result.progress,
        lessonCompleted: true,
        xp: result.xp,
      }),
    );
  } catch (error) {
    handleError(error, res, next);
  }
};

const markIncomplete = async (req, res, next) => {
  try {
    const result = await lessonProgressService.markArticleIncomplete(
      req.user._id,
      req.params.lessonId,
    );
    res.json(
      await withUserXp(req, {
        progress: result.progress,
        xp: result.xp,
      }),
    );
  } catch (error) {
    handleError(error, res, next);
  }
};

const updateVideoProgress = async (req, res, next) => {
  try {
    const { positionSeconds, durationSeconds, manualComplete } = req.body;
    const result = await lessonProgressService.updateVideoProgress(
      req.user._id,
      req.params.lessonId,
      {
        positionSeconds,
        durationSeconds,
        manualComplete: Boolean(manualComplete),
        isAdmin: isAdminUser(req.user),
      },
    );
    res.json(
      await withUserXp(req, {
        progress: result.progress,
        lessonCompleted: result.progress.status === 'COMPLETED',
        xp: result.xp,
      }),
    );
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
    res.json(await withUserXp(req, result));
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
    res.json(await withUserXp(req, result));
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

const listPractice = async (req, res, next) => {
  try {
    const assessments = await practiceService.listPracticeForUser(req.user._id);
    res.json({ assessments });
  } catch (error) {
    handleError(error, res, next);
  }
};

const getPracticeDetail = async (req, res, next) => {
  try {
    const practice = await practiceService.getPracticeDetail(req.user._id, req.params.assessmentId);
    res.json({ practice });
  } catch (error) {
    const status = error.message === 'Practice set not found.' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

const getPracticeQuiz = async (req, res, next) => {
  try {
    const quiz = await practiceService.getPracticeQuizPayload(req.user._id, req.params.assessmentId);
    res.json({ quiz });
  } catch (error) {
    const status = error.message === 'Practice set not found.' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

const submitPracticeQuiz = async (req, res, next) => {
  try {
    const result = await practiceService.submitPracticeQuiz(
      req.user._id,
      req.params.assessmentId,
      req.body.answers,
    );
    res.json(await withUserXp(req, result));
  } catch (error) {
    handleError(error, res, next);
  }
};

const getPracticeQuizAttempts = async (req, res, next) => {
  try {
    const attempts = await practiceService.listPracticeQuizAttempts(
      req.user._id,
      req.params.assessmentId,
    );
    res.json(attempts);
  } catch (error) {
    const status = error.message === 'Practice set not found.' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

const getPracticeCoding = async (req, res, next) => {
  try {
    const payload = await practiceService.getPracticeCodingPayload(
      req.user._id,
      req.params.assessmentId,
    );
    res.json(payload);
  } catch (error) {
    const status = error.message === 'Practice set not found.' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

const runPracticeCoding = async (req, res, next) => {
  try {
    const result = await practiceService.runPracticeCodingTests(
      req.user._id,
      req.params.assessmentId,
      req.body,
    );
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

const submitPracticeCoding = async (req, res, next) => {
  try {
    const result = await practiceService.submitPracticeCoding(
      req.user._id,
      req.params.assessmentId,
      req.body,
    );
    res.json(await withUserXp(req, result));
  } catch (error) {
    handleError(error, res, next);
  }
};

const getPracticeCodingAttempts = async (req, res, next) => {
  try {
    const attempts = await practiceService.listPracticeCodingAttempts(
      req.user._id,
      req.params.assessmentId,
    );
    res.json({ attempts });
  } catch (error) {
    const status = error.message === 'Practice set not found.' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

module.exports = {
  enrollCourse,
  getCourseProgress,
  listEnrollments,
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
  listPractice,
  getPracticeDetail,
  getPracticeQuiz,
  submitPracticeQuiz,
  getPracticeQuizAttempts,
  getPracticeCoding,
  runPracticeCoding,
  submitPracticeCoding,
  getPracticeCodingAttempts,
};
