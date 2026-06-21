const leaderboardService = require('../services/leaderboardService');

const getLeaderboard = async (req, res, next) => {
  try {
    const { scope, categoryId, courseId, limit } = req.query;
    const data = await leaderboardService.getLeaderboard(req.user._id, {
      scope: scope || 'global',
      categoryId,
      courseId,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(data);
  } catch (error) {
    if (error.message === 'Course not found.' || error.message === 'Category not found.') {
      return res.status(404).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = {
  getLeaderboard,
};
