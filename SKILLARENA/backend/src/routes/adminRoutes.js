const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get('/overview', adminController.getOverview);
router.get('/categories', adminController.listCategories);
router.post('/categories', adminController.createCategory);
router.get('/skills', adminController.listSkills);
router.post('/skills', adminController.createSkill);
router.delete('/skills/:id', adminController.deleteSkill);

router.get('/courses', adminController.listCourses);
router.post('/courses', adminController.createCourse);
router.patch('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);
router.get('/courses/:courseId/modules', adminController.listCourseModules);
router.post('/courses/:courseId/modules', adminController.createModule);
router.get('/courses/:courseId/modules/:moduleId/lessons', adminController.listModuleLessons);
router.post('/courses/:courseId/modules/:moduleId/lessons', adminController.createLesson);

router.patch('/lessons/:id', adminController.updateLesson);
router.post('/lessons/:id/quiz', adminController.createLessonQuiz);

router.get('/assessments', adminController.listAssessments);
router.post('/assessments', adminController.createPracticeAssessment);
router.patch('/assessments/:id', adminController.updateAssessment);
router.post('/assessments/:id/questions', adminController.addQuestionToAssessment);

router.post('/questions', adminController.createQuestion);

router.get('/blogs', adminController.listBlogPosts);
router.post('/blogs', adminController.createBlogPost);
router.patch('/blogs/:id', adminController.updateBlogPost);
router.delete('/blogs/:id', adminController.deleteBlogPost);

router.get('/resumes', adminController.listResumes);
router.delete('/resumes/:id', adminController.deleteResume);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
