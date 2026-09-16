const leaderboardService = require('../services/leaderboardService');
const { parsePositiveInt, asPlainString } = require('../utils/safeInput');

const MAX_LEADERBOARD_LIMIT = 100;
const DEFAULT_LEADERBOARD_LIMIT = 25;

const getLeaderboard = async (req, res, next) => {
  try {
    const scope = asPlainString(req.query.scope, { maxLength: 32 }) || 'global';
    const categoryId = asPlainString(req.query.categoryId, { maxLength: 64 });
    const courseId = asPlainString(req.query.courseId, { maxLength: 64 });
    const limit = parsePositiveInt(req.query.limit, {
      defaultValue: DEFAULT_LEADERBOARD_LIMIT,
      min: 1,
      max: MAX_LEADERBOARD_LIMIT,
    });

    const data = await leaderboardService.getLeaderboard(req.user._id, {
      scope,
      categoryId: categoryId || undefined,
      courseId: courseId || undefined,
      limit,
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
