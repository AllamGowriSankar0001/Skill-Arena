const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const learningController = require('../controllers/learningController');
const leaderboardController = require('../controllers/leaderboardController');
const communityController = require('../controllers/communityController');
const { createRateLimiter, getClientIp } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authMiddleware);

const codingLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many coding requests. Please slow down.',
  code: 'CODING_RATE_LIMIT',
  keyGenerator: (req) => `coding::${req.user?._id || getClientIp(req)}`,
});

const roomJoinLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many community join attempts. Please try again later.',
  code: 'ROOM_JOIN_RATE_LIMIT',
  keyGenerator: (req) => `room-join::${req.user?._id || getClientIp(req)}`,
});

router.get('/leaderboard', leaderboardController.getLeaderboard);

router.get('/community/meta', communityController.getMeta);
router.get('/community/feed', communityController.getFeed);
router.post('/community/rooms', communityController.createRoom);
router.post('/community/rooms/join', roomJoinLimiter, communityController.joinRoom);
router.patch('/community/rooms/:roomId', communityController.updateRoom);
router.post('/community/rooms/:roomId/leave', communityController.leaveRoom);
router.delete('/community/rooms/:roomId', communityController.deleteRoom);
router.post('/community/posts', communityController.createPost);
router.post('/community/posts/:postId/like', communityController.toggleLike);
router.get('/community/posts/:postId/comments', communityController.listComments);
router.post('/community/posts/:postId/comments', communityController.addComment);
router.delete('/community/posts/:postId', communityController.deletePost);

router.get('/practice', learningController.listPractice);
router.get('/practice/:assessmentId', learningController.getPracticeDetail);
router.get('/practice/:assessmentId/quiz', learningController.getPracticeQuiz);
router.post('/practice/:assessmentId/quiz/submit', learningController.submitPracticeQuiz);
router.get('/practice/:assessmentId/quiz/attempts', learningController.getPracticeQuizAttempts);
router.get('/practice/:assessmentId/coding', learningController.getPracticeCoding);
router.post('/practice/:assessmentId/coding/run', codingLimiter, learningController.runPracticeCoding);
router.post('/practice/:assessmentId/coding/submit', codingLimiter, learningController.submitPracticeCoding);
router.get('/practice/:assessmentId/coding/attempts', learningController.getPracticeCodingAttempts);

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
router.post('/lessons/:lessonId/coding/run', codingLimiter, learningController.runCoding);
router.post('/lessons/:lessonId/coding/submit', codingLimiter, learningController.submitCoding);
router.get('/lessons/:lessonId/coding/attempts', learningController.getCodingAttempts);

module.exports = router;
