const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const battleController = require('../controllers/battleController');

const router = express.Router();

router.use(authMiddleware);

router.get('/meta', battleController.getMeta);
router.get('/history', battleController.listBattles);

router.post('/queue', battleController.joinQueue);
router.get('/queue/status', battleController.getQueueStatus);
router.delete('/queue', battleController.leaveQueue);

router.post('/friends/create', battleController.createFriendBattle);
router.post('/friends/join', battleController.joinFriendBattle);
router.post('/:battleId/start', battleController.startFriendBattle);

router.get('/:battleId', battleController.getBattle);
router.get('/:battleId/quiz', battleController.getBattleQuiz);
router.post('/:battleId/submit', battleController.submitBattleQuiz);

module.exports = router;
