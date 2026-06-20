const {
  listCourses,
  getCourseDetail,
  getLessonDetail,
  listPracticeAssessments,
  listUserBattles,
  listPublishedBlogPosts,
  getBlogPostBySlug,
} = require('../services/homeService');

const getCourses = async (req, res, next) => {
  try {
    const courses = await listCourses();
    res.json({ courses });
  } catch (error) {
    next(error);
  }
};

const getCourse = async (req, res, next) => {
  try {
    const detail = await getCourseDetail(req.params.id);
    res.json(detail);
  } catch (error) {
    const status = error.message === 'Course not found.' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

const getLesson = async (req, res, next) => {
  try {
    const detail = await getLessonDetail(req.params.id);
    res.json(detail);
  } catch (error) {
    const status =
      error.message === 'Course not found.' || error.message === 'Lesson not found.' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

const getPractice = async (req, res, next) => {
  try {
    const assessments = await listPracticeAssessments();
    res.json({ assessments });
  } catch (error) {
    next(error);
  }
};

const getBattles = async (req, res, next) => {
  try {
    const battles = await listUserBattles(req.user._id);
    res.json({ battles });
  } catch (error) {
    next(error);
  }
};

const getBlogs = async (req, res, next) => {
  try {
    const posts = await listPublishedBlogPosts();
    res.json({ posts });
  } catch (error) {
    next(error);
  }
};

const getBlog = async (req, res, next) => {
  try {
    const detail = await getBlogPostBySlug(req.params.slug);
    res.json(detail);
  } catch (error) {
    const status = error.message === 'Blog post not found.' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

module.exports = {
  getCourses,
  getCourse,
  getLesson,
  getPractice,
  getBattles,
  getBlogs,
  getBlog,
};
