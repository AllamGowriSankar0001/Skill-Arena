const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const learningController = require('../controllers/learningController');
const leaderboardController = require('../controllers/leaderboardController');

const router = express.Router();

router.use(authMiddleware);

router.get('/leaderboard', leaderboardController.getLeaderboard);

router.post('/courses/:courseId/enroll', learningController.enrollCourse);
router.get('/courses/enrollments', learningController.listEnrollments);
router.get('/courses/:courseId/progress', learningController.getCourseProgress);

router.post('/lessons/:lessonId/start', learningController.startLesson);
router.get('/lessons/:lessonId/progress', learningController.getLessonProgress);
router.get('/lessons/:lessonId/access', learningController.getLessonAccess);
router.post('/lessons/:lessonId/complete', learningController.completeLesson);
router.post('/lessons/:lessonId/mark-incomplete', learningController.markIncomplete);
router.patch('/lessons/:lessonId/video-progress', learningController.updateVideoProgress);

router.post('/lessons/:lessonId/quiz/submit', learningController.submitQuiz);
router.get('/lessons/:lessonId/quiz/attempts', learningController.getQuizAttempts);

router.get('/lessons/:lessonId/coding', learningController.getCodingLesson);
router.patch('/lessons/:lessonId/coding/draft', learningController.saveCodingDraft);
router.post('/lessons/:lessonId/coding/run', learningController.runCoding);
router.post('/lessons/:lessonId/coding/submit', learningController.submitCoding);
router.get('/lessons/:lessonId/coding/attempts', learningController.getCodingAttempts);

module.exports = router;
