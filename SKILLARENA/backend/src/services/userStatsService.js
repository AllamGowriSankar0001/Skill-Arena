const UserStats = require('../models/UserStats');

async function getUserStats(userId) {
  let stats = await UserStats.findOne({ userId });

  if (!stats) {
    stats = await UserStats.createForUser(userId);
  }

  return stats;
}

module.exports = {
  getUserStats,
};
