const { getHomeData } = require('../services/homeService');
const { enrollUserInStarterCourse } = require('../services/enrollmentService');

const getHome = async (req, res, next) => {
  try {
    await enrollUserInStarterCourse(req.user._id);
    const home = await getHomeData(req.user._id);
    res.json(home);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHome,
};
