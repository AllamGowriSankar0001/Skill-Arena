const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const battleController = require('../controllers/battleController');
const { createRateLimiter, getClientIp } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authMiddleware);

const battleJoinLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Too many battle join attempts. Please try again later.',
  code: 'BATTLE_JOIN_RATE_LIMIT',
  keyGenerator: (req) => `battle-join::${req.user?._id || getClientIp(req)}`,
});

const battleCodingLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many coding requests. Please slow down.',
  code: 'CODING_RATE_LIMIT',
  keyGenerator: (req) => `battle-coding::${req.user?._id || getClientIp(req)}`,
});

router.get('/meta', battleController.getMeta);
router.get('/history', battleController.listBattles);

router.post('/queue', battleController.joinQueue);
router.get('/queue/status', battleController.getQueueStatus);
router.delete('/queue', battleController.leaveQueue);

router.post('/friends/create', battleController.createFriendBattle);
router.post('/friends/join', battleJoinLimiter, battleController.joinFriendBattle);
router.post('/:battleId/start', battleController.startFriendBattle);

router.get('/:battleId', battleController.getBattle);
router.post('/:battleId/leave', battleController.leaveBattle);
router.get('/:battleId/quiz', battleController.getBattleQuiz);
router.post('/:battleId/coding/run', battleCodingLimiter, battleController.runBattleCoding);
router.post('/:battleId/coding/submit', battleCodingLimiter, battleController.submitBattleCoding);
router.post('/:battleId/submit', battleController.submitBattleQuiz);

module.exports = router;
