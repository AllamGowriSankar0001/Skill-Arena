const battleService = require('../services/battleService');
const matchmakingService = require('../services/matchmakingService');

const getMeta = async (req, res, next) => {
  try {
    const meta = await battleService.getBattleMeta();
    res.json(meta);
  } catch (error) {
    next(error);
  }
};

const joinQueue = async (req, res, next) => {
  try {
    const status = await matchmakingService.joinQueue(req.user._id, req.body);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

const leaveQueue = async (req, res, next) => {
  try {
    const status = await matchmakingService.leaveQueue(req.user._id);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

const getQueueStatus = async (req, res, next) => {
  try {
    await matchmakingService.tryMatchWaitingTickets();
    await matchmakingService.expireStaleTickets();
    const status = await matchmakingService.getQueueStatus(req.user._id);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

const createFriendBattle = async (req, res, next) => {
  try {
    const battle = await matchmakingService.createFriendBattle(req.user._id, req.body);
    res.status(201).json({
      battleId: battle._id.toString(),
      battleCode: battle.battleCode,
      status: battle.status,
    });
  } catch (error) {
    next(error);
  }
};

const joinFriendBattle = async (req, res, next) => {
  try {
    const battle = await matchmakingService.joinFriendBattle(req.user._id, req.body.battleCode);
    res.json({
      battleId: battle._id.toString(),
      battleCode: battle.battleCode,
      status: battle.status,
      participantCount: battle.participants.length,
      maximumPlayers: battle.maximumPlayers,
    });
  } catch (error) {
    next(error);
  }
};

const startFriendBattle = async (req, res, next) => {
  try {
    const battle = await matchmakingService.startFriendBattle(req.user._id, req.params.battleId);
    res.json({
      battleId: battle._id.toString(),
      status: battle.status,
    });
  } catch (error) {
    next(error);
  }
};

const getBattle = async (req, res, next) => {
  try {
    const battle = await battleService.getBattleForUser(req.params.battleId, req.user._id);
    res.json({ battle });
  } catch (error) {
    next(error);
  }
};

const getBattleQuiz = async (req, res, next) => {
  try {
    const payload = await battleService.getBattleQuizPayload(req.params.battleId, req.user._id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

const submitBattleQuiz = async (req, res, next) => {
  try {
    const result = await battleService.submitBattleQuiz(
      req.params.battleId,
      req.user._id,
      req.body.answers || {},
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const runBattleCoding = async (req, res, next) => {
  try {
    const result = await battleService.runBattleCoding(
      req.params.battleId,
      req.user._id,
      req.body.code || {},
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const submitBattleCoding = async (req, res, next) => {
  try {
    const result = await battleService.submitBattleCoding(
      req.params.battleId,
      req.user._id,
      req.body.code || {},
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const leaveBattle = async (req, res, next) => {
  try {
    const battle = await battleService.leaveBattle(req.params.battleId, req.user._id);
    res.json({ battle });
  } catch (error) {
    next(error);
  }
};

const listBattles = async (req, res, next) => {
  try {
    const battles = await battleService.listUserBattles(req.user._id);
    res.json({ battles });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMeta,
  joinQueue,
  leaveQueue,
  getQueueStatus,
  createFriendBattle,
  joinFriendBattle,
  startFriendBattle,
  getBattle,
  getBattleQuiz,
  submitBattleQuiz,
  runBattleCoding,
  submitBattleCoding,
  leaveBattle,
  listBattles,
};
