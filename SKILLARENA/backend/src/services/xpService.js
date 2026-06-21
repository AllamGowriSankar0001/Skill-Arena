const { XPTransaction, UserStats } = require('../models');
const { getUserStats } = require('./userStatsService');

const emptyXpDelta = () => ({ earned: 0, reversed: 0 });

function mergeXpDelta(target, source = emptyXpDelta()) {
  target.earned += source.earned || 0;
  target.reversed += source.reversed || 0;
  return target;
}

async function awardXp({ userId, sourceType, sourceId, amount, description }) {
  if (!amount || amount <= 0) {
    return { awarded: false, amount: 0, delta: emptyXpDelta() };
  }

  const idempotencyKey = `${sourceType}:${userId}:${sourceId}`;

  const existing = await XPTransaction.findOne({ idempotencyKey });
  if (existing) {
    return { awarded: false, amount: 0, transaction: existing, delta: emptyXpDelta() };
  }

  const stats = await getUserStats(userId);
  const newTotal = stats.totalXp + amount;
  stats.totalXp = newTotal;
  stats.syncLevelFields();

  if (sourceType === 'LESSON_COMPLETION') {
    stats.lessonsCompleted += 1;
  }
  if (sourceType === 'COURSE_COMPLETION') {
    stats.coursesCompleted += 1;
  }

  await stats.save();

  const transaction = await XPTransaction.create({
    userId,
    transactionType: 'EARN',
    sourceType,
    sourceId,
    amount,
    balanceAfter: newTotal,
    description: description || '',
    idempotencyKey,
  });

  return {
    awarded: true,
    amount,
    transaction,
    stats,
    delta: { earned: amount, reversed: 0 },
  };
}

async function revokeXpBySource({ userId, sourceType, sourceId, description }) {
  const earnKey = `${sourceType}:${userId}:${sourceId}`;
  const earnTx = await XPTransaction.findOne({
    idempotencyKey: earnKey,
    transactionType: 'EARN',
  });

  if (!earnTx) {
    return { revoked: false, amount: 0, delta: emptyXpDelta() };
  }

  const reversalKey = `REVERSAL:${earnKey}`;
  const existingReversal = await XPTransaction.findOne({ idempotencyKey: reversalKey });
  if (existingReversal) {
    return { revoked: false, amount: 0, transaction: existingReversal, delta: emptyXpDelta() };
  }

  const stats = await getUserStats(userId);
  const amount = earnTx.amount;
  stats.totalXp = Math.max(0, stats.totalXp - amount);
  stats.syncLevelFields();

  if (sourceType === 'LESSON_COMPLETION') {
    stats.lessonsCompleted = Math.max(0, stats.lessonsCompleted - 1);
  }
  if (sourceType === 'COURSE_COMPLETION') {
    stats.coursesCompleted = Math.max(0, stats.coursesCompleted - 1);
  }

  await stats.save();

  const transaction = await XPTransaction.create({
    userId,
    transactionType: 'REVERSAL',
    sourceType,
    sourceId,
    amount: -amount,
    balanceAfter: stats.totalXp,
    description: description || `Reversed: ${earnTx.description || sourceType}`,
    idempotencyKey: reversalKey,
  });

  return {
    revoked: true,
    amount,
    transaction,
    stats,
    delta: { earned: 0, reversed: amount },
  };
}

module.exports = {
  emptyXpDelta,
  mergeXpDelta,
  awardXp,
  revokeXpBySource,
};
