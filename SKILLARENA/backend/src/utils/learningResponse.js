const User = require('../models/User');
const { getUserStats } = require('../services/userStatsService');

async function withUserXp(req, payload) {
  if (!req.user || req.user.role === 'ADMIN') {
    return payload;
  }

  const user = await User.findById(req.user._id);
  const stats = await getUserStats(req.user._id);

  return {
    ...payload,
    user: user.toPublicJSON(stats),
  };
}

module.exports = {
  withUserXp,
};
