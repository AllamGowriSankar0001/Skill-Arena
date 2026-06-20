const { XPTransaction, UserStats } = require('../models');
const { getUserStats } = require('./userStatsService');

async function awardXp({ userId, sourceType, sourceId, amount, description }) {
  if (!amount || amount <= 0) {
    return { awarded: false, amount: 0 };
  }

  const idempotencyKey = `${sourceType}:${userId}:${sourceId}`;

  const existing = await XPTransaction.findOne({ idempotencyKey });
  if (existing) {
    return { awarded: false, amount: 0, transaction: existing };
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

  return { awarded: true, amount, transaction, stats };
}

module.exports = {
  awardXp,
};
