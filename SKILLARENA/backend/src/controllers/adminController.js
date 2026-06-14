const adminService = require('../services/adminService');

const sendError = (res, error, fallbackStatus = 400) => {
  const status = error.message?.includes('not found') ? 404 : fallbackStatus;
  return res.status(status).json({ message: error.message || 'Request failed.' });
};

const getOverview = async (req, res, next) => {
  try {
    const overview = await adminService.getOverview();
    res.json(overview);
  } catch (error) {
    next(error);
  }
};

const listCategories = async (req, res, next) => {
  try {
    const categories = await adminService.listCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await adminService.createCategory(req.body);
    res.status(201).json({ category });
  } catch (error) {
    sendError(res, error);
  }
};

const listSkills = async (req, res, next) => {
  try {
    const skills = await adminService.listSkills();
    res.json({ skills });
  } catch (error) {
    next(error);
  }
};

const createSkill = async (req, res, next) => {
  try {
    const skill = await adminService.createSkill(req.body);
    res.status(201).json({ skill });
  } catch (error) {
    sendError(res, error);
  }
};

const deleteSkill = async (req, res, next) => {
  try {
    const result = await adminService.deleteSkill(req.params.id);
    res.json({ ...result, message: 'Skill deleted.' });
  } catch (error) {
    sendError(res, error);
  }
};

const listCourses = async (req, res, next) => {
  try {
    const courses = await adminService.listCourses();
    res.json({ courses });
  } catch (error) {
    next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    const course = await adminService.createCourse(req.user._id, req.body);
    res.status(201).json({ course });
  } catch (error) {
    sendError(res, error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const course = await adminService.updateCourse(req.params.id, req.body);
    res.json({ course });
  } catch (error) {
    sendError(res, error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const result = await adminService.deleteCourse(req.params.id);
    res.json({ ...result, message: 'Course deleted.' });
  } catch (error) {
    sendError(res, error);
  }
};

const listCourseModules = async (req, res, next) => {
  try {
    const modules = await adminService.listCourseModules(req.params.courseId);
    res.json({ modules });
  } catch (error) {
    sendError(res, error);
  }
};

const createModule = async (req, res, next) => {
  try {
    const moduleDoc = await adminService.createModule(req.params.courseId, req.body);
    res.status(201).json({ module: moduleDoc });
  } catch (error) {
    sendError(res, error);
  }
};

const listModuleLessons = async (req, res, next) => {
  try {
    const lessons = await adminService.listModuleLessons(
      req.params.courseId,
      req.params.moduleId,
    );
    res.json({ lessons });
  } catch (error) {
    sendError(res, error);
  }
};

const createLesson = async (req, res, next) => {
  try {
    const lesson = await adminService.createLesson(
      req.params.courseId,
      req.params.moduleId,
      req.body,
    );
    res.status(201).json({ lesson });
  } catch (error) {
    sendError(res, error);
  }
};

const updateLesson = async (req, res, next) => {
  try {
    const lesson = await adminService.updateLesson(req.params.id, req.body);
    res.json({ lesson });
  } catch (error) {
    sendError(res, error);
  }
};

const createLessonQuiz = async (req, res, next) => {
  try {
    const result = await adminService.createLessonQuiz(req.user._id, req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
};

const listAssessments = async (req, res, next) => {
  try {
    const assessments = await adminService.listAssessments(req.query.type || 'PRACTICE');
    res.json({ assessments });
  } catch (error) {
    next(error);
  }
};

const createPracticeAssessment = async (req, res, next) => {
  try {
    const assessment = await adminService.createPracticeAssessment(req.user._id, req.body);
    res.status(201).json({ assessment });
  } catch (error) {
    sendError(res, error);
  }
};

const updateAssessment = async (req, res, next) => {
  try {
    const assessment = await adminService.updateAssessment(req.params.id, req.body);
    res.json({ assessment });
  } catch (error) {
    sendError(res, error);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const question = await adminService.createQuestion(req.user._id, req.body);
    res.status(201).json({ question });
  } catch (error) {
    sendError(res, error);
  }
};

const addQuestionToAssessment = async (req, res, next) => {
  try {
    const assessment = await adminService.addQuestionToAssessment(req.params.id, req.body);
    res.json({ assessment });
  } catch (error) {
    sendError(res, error);
  }
};

const listBlogPosts = async (req, res, next) => {
  try {
    const posts = await adminService.listBlogPosts();
    res.json({ posts });
  } catch (error) {
    next(error);
  }
};

const createBlogPost = async (req, res, next) => {
  try {
    const post = await adminService.createBlogPost(req.user._id, req.body);
    res.status(201).json({ post });
  } catch (error) {
    sendError(res, error);
  }
};

const updateBlogPost = async (req, res, next) => {
  try {
    const post = await adminService.updateBlogPost(req.params.id, req.body);
    res.json({ post });
  } catch (error) {
    sendError(res, error);
  }
};

const deleteBlogPost = async (req, res, next) => {
  try {
    const result = await adminService.deleteBlogPost(req.params.id);
    res.json({ ...result, message: 'Blog post deleted.' });
  } catch (error) {
    sendError(res, error);
  }
};

const listResumes = async (req, res, next) => {
  try {
    const resumeService = require('../services/resumeService');
    const resumes = await resumeService.listResumesForAdmin();
    res.json({ resumes });
  } catch (error) {
    next(error);
  }
};

const deleteResume = async (req, res, next) => {
  try {
    const resumeService = require('../services/resumeService');
    const result = await resumeService.deleteResumeById(req.params.id);
    res.json({ ...result, message: 'Resume deleted.' });
  } catch (error) {
    sendError(res, error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await adminService.listUsers(req.query);
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await adminService.getUser(req.params.id);
    res.json({ user });
  } catch (error) {
    sendError(res, error, 404);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.user._id, req.body);
    res.json({ user });
  } catch (error) {
    sendError(res, error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const result = await adminService.deleteUser(req.params.id, req.user._id);
    res.json({ ...result, message: 'User deleted.' });
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  getOverview,
  listCategories,
  createCategory,
  listSkills,
  createSkill,
  deleteSkill,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  listCourseModules,
  createModule,
  listModuleLessons,
  createLesson,
  updateLesson,
  createLessonQuiz,
  listAssessments,
  createPracticeAssessment,
  updateAssessment,
  createQuestion,
  addQuestionToAssessment,
  listBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listResumes,
  deleteResume,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
};
