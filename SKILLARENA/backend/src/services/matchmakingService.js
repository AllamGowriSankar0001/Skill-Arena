const { MatchmakingTicket, Battle, Skill, User } = require('../models');
const { QUEUE_TIMEOUT_MS, PLAYERS_FOR_FORMAT, COUNTDOWN_SECONDS } = require('../constants/battleConstants');
const { generateBattleCode, generateBattleAssessment } = require('./battleContentService');

const VALID_FORMATS = ['ONE_V_ONE', 'THREE_V_THREE'];
const VALID_MODES = ['QUIZ', 'CODING'];
const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'MIXED'];

async function cancelUserTickets(userId) {
  await MatchmakingTicket.updateMany(
    { userId, status: 'SEARCHING' },
    { $set: { status: 'CANCELLED' } },
  );
}

async function getActiveTicket(userId) {
  return MatchmakingTicket.findOne({
    userId,
    status: { $in: ['SEARCHING', 'MATCHED'] },
  }).sort({ createdAt: -1 });
}

function getRequiredPlayers(format) {
  return PLAYERS_FOR_FORMAT[format] || 2;
}

function assignTeam(index, format) {
  if (format === 'ONE_V_ONE') {
    return index === 0 ? 'A' : 'B';
  }
  return index < 3 ? 'A' : 'B';
}

async function createBattleFromTickets(tickets, matchType = 'RANDOM') {
  const [first] = tickets;
  const format = first.format;
  const mode = first.mode;
  const skillId = first.skillId;
  const difficulty = first.difficulty;
  const requiredPlayers = getRequiredPlayers(format);

  if (tickets.length < requiredPlayers) {
    return null;
  }

  const selected = tickets.slice(0, requiredPlayers);
  const creatorId = selected[0].userId;

  const battle = await Battle.create({
    battleCode: generateBattleCode(),
    format,
    mode,
    matchType,
    skillId,
    difficulty,
    createdBy: creatorId,
    maximumPlayers: requiredPlayers,
    status: 'MATCHED',
    participants: selected.map((ticket, index) => ({
      userId: ticket.userId,
      team: assignTeam(index, format),
      status: 'JOINED',
      joinedAt: new Date(),
    })),
    rewards: {
      winnerXp: 40,
      participantXp: 15,
      drawXp: 20,
    },
    scheduledAt: new Date(Date.now() + COUNTDOWN_SECONDS * 1000),
  });

  await MatchmakingTicket.updateMany(
    { _id: { $in: selected.map((ticket) => ticket._id) } },
    { $set: { status: 'MATCHED', matchedBattleId: battle._id } },
  );

  return battle;
}

async function prepareBattleContent(battleId) {
  const battle = await Battle.findById(battleId);
  if (!battle || battle.assessmentId || battle.status === 'CANCELLED') {
    return battle;
  }

  try {
    const assessment = await generateBattleAssessment({
      skillId: battle.skillId,
      mode: battle.mode,
      difficulty: battle.difficulty,
      creatorId: battle.createdBy,
      userId: battle.createdBy,
    });

    battle.assessmentId = assessment._id;
    battle.status = 'STARTING';
    battle.scheduledAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000);
    await battle.save();
    return battle;
  } catch (error) {
    battle.status = 'CANCELLED';
    await battle.save();
    throw error;
  }
}

async function startBattleIfReady(battleId) {
  const battle = await Battle.findById(battleId);
  if (!battle || !battle.assessmentId) return battle;

  if (battle.status === 'STARTING' && battle.scheduledAt && Date.now() >= battle.scheduledAt.getTime()) {
    battle.status = 'IN_PROGRESS';
    battle.startedAt = new Date();
    battle.participants.forEach((participant) => {
      if (participant.status !== 'LEFT') {
        participant.status = 'PLAYING';
      }
    });
    await battle.save();
  }

  return battle;
}

async function tryMatchWaitingTickets() {
  const tickets = await MatchmakingTicket.find({
    status: 'SEARCHING',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: 1 });

  const groups = new Map();

  for (const ticket of tickets) {
    const key = `${ticket.format}::${ticket.mode}::${ticket.skillId}::${ticket.difficulty}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ticket);
  }

  const createdBattles = [];

  for (const [, groupTickets] of groups) {
    const format = groupTickets[0]?.format;
    const required = getRequiredPlayers(format);

    while (groupTickets.filter((ticket) => ticket.status === 'SEARCHING').length >= required) {
      const searching = groupTickets.filter((ticket) => ticket.status === 'SEARCHING');
      const batch = searching.slice(0, required);
      const battle = await createBattleFromTickets(batch, 'RANDOM');
      if (!battle) break;

      createdBattles.push(battle);
      batch.forEach((ticket) => {
        ticket.status = 'MATCHED';
      });
    }
  }

  for (const battle of createdBattles) {
    prepareBattleContent(battle._id).catch((error) => {
      console.error('Battle content generation failed:', error.message);
    });
  }

  return createdBattles;
}

async function expireStaleTickets() {
  const expired = await MatchmakingTicket.find({
    status: 'SEARCHING',
    expiresAt: { $lte: new Date() },
  });

  for (const ticket of expired) {
    ticket.status = 'EXPIRED';
    await ticket.save();
  }

  return expired.length;
}

async function joinQueue(userId, payload) {
  const { format, mode, skillId, difficulty = 'MIXED' } = payload;

  if (!VALID_FORMATS.includes(format)) {
    throw new Error('Select a valid battle format (1v1 or 3v3).');
  }
  if (!VALID_MODES.includes(mode)) {
    throw new Error('Select quiz or coding mode.');
  }
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new Error('Select a valid difficulty level.');
  }

  const skill = await Skill.findById(skillId);
  if (!skill || skill.status !== 'ACTIVE') {
    throw new Error('Select a valid skill.');
  }

  const activeBattle = await Battle.findOne({
    'participants.userId': userId,
    status: { $in: ['MATCHED', 'STARTING', 'IN_PROGRESS'] },
  });
  if (activeBattle) {
    throw new Error('You are already in an active battle.');
  }

  await cancelUserTickets(userId);

  const ticket = await MatchmakingTicket.create({
    userId,
    format,
    mode,
    skillId,
    difficulty,
    status: 'SEARCHING',
    expiresAt: new Date(Date.now() + QUEUE_TIMEOUT_MS),
  });

  await tryMatchWaitingTickets();

  return getQueueStatus(userId);
}

async function leaveQueue(userId) {
  await cancelUserTickets(userId);
  return { status: 'IDLE' };
}

async function getQueueStatus(userId) {
  const ticket = await getActiveTicket(userId);

  if (!ticket) {
    return { status: 'IDLE' };
  }

  if (ticket.status === 'MATCHED' && ticket.matchedBattleId) {
    const battle = await Battle.findById(ticket.matchedBattleId);
    return {
      status: 'MATCHED',
      battleId: battle?._id?.toString(),
      battleStatus: battle?.status,
      expiresAt: ticket.expiresAt,
    };
  }

  if (ticket.status === 'SEARCHING') {
    if (ticket.expiresAt <= new Date()) {
      ticket.status = 'EXPIRED';
      await ticket.save();
      return {
        status: 'NO_MATCH',
        message: 'No other players were available for this match. Try again or change your skill or difficulty.',
      };
    }

    return {
      status: 'SEARCHING',
      ticketId: ticket._id.toString(),
      expiresAt: ticket.expiresAt,
      format: ticket.format,
      mode: ticket.mode,
      skillId: ticket.skillId.toString(),
      difficulty: ticket.difficulty,
    };
  }

  return { status: 'IDLE' };
}

async function createFriendBattle(userId, payload) {
  const { format, mode, skillId, difficulty = 'MIXED' } = payload;

  if (!VALID_FORMATS.includes(format) || !VALID_MODES.includes(mode)) {
    throw new Error('Invalid battle settings.');
  }

  const skill = await Skill.findById(skillId);
  if (!skill) throw new Error('Skill not found.');

  const requiredPlayers = getRequiredPlayers(format);

  const battle = await Battle.create({
    battleCode: generateBattleCode(),
    format,
    mode,
    matchType: 'PRIVATE',
    skillId,
    difficulty,
    createdBy: userId,
    maximumPlayers: requiredPlayers,
    status: 'WAITING',
    participants: [
      {
        userId,
        team: 'A',
        status: 'JOINED',
        joinedAt: new Date(),
      },
    ],
    rewards: { winnerXp: 40, participantXp: 15, drawXp: 20 },
  });

  return battle;
}

async function joinFriendBattle(userId, battleCode) {
  const code = String(battleCode || '').trim().toUpperCase();
  if (!code) throw new Error('Enter a battle room code.');

  const battle = await Battle.findOne({
    battleCode: code,
    status: 'WAITING',
    matchType: 'PRIVATE',
  });

  if (!battle) {
    throw new Error('Battle room not found or already started.');
  }

  if (battle.participants.some((participant) => participant.userId.toString() === userId.toString())) {
    return battle;
  }

  if (battle.participants.length >= battle.maximumPlayers) {
    throw new Error('This battle room is full.');
  }

  const teamACount = battle.participants.filter((participant) => participant.team === 'A').length;
  const teamBCount = battle.participants.filter((participant) => participant.team === 'B').length;
  const team = teamACount <= teamBCount ? 'A' : 'B';

  battle.participants.push({
    userId,
    team,
    status: 'JOINED',
    joinedAt: new Date(),
  });

  await battle.save();
  return battle;
}

async function startFriendBattle(userId, battleId) {
  const battle = await Battle.findById(battleId);
  if (!battle) throw new Error('Battle not found.');
  if (battle.createdBy.toString() !== userId.toString()) {
    throw new Error('Only the host can start this battle.');
  }
  if (battle.status !== 'WAITING') {
    throw new Error('This battle has already started.');
  }
  if (battle.participants.length < 2) {
    throw new Error('Need at least 2 players to start.');
  }

  battle.status = 'MATCHED';
  battle.scheduledAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000);
  await battle.save();

  await prepareBattleContent(battle._id);
  return battle;
}

module.exports = {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  tryMatchWaitingTickets,
  expireStaleTickets,
  startBattleIfReady,
  prepareBattleContent,
  createFriendBattle,
  joinFriendBattle,
  startFriendBattle,
  getRequiredPlayers,
};
