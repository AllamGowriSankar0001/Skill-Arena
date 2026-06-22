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
router.delete('/categories/:id', adminController.deleteCategory);
router.get('/skills', adminController.listSkills);
router.post('/skills', adminController.createSkill);
router.delete('/skills/:id', adminController.deleteSkill);

router.get('/courses', adminController.listCourses);
router.post('/courses/generate-ai/stream', adminController.generateCourseWithAIStream);
router.post('/courses/generate-ai', adminController.generateCourseWithAI);
router.post('/courses', adminController.createCourse);
router.patch('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);
router.get('/courses/:courseId/modules', adminController.listCourseModules);
router.post('/courses/:courseId/modules', adminController.createModule);
router.delete('/courses/:courseId/modules/:moduleId', adminController.deleteModule);
router.get('/courses/:courseId/modules/:moduleId/lessons', adminController.listModuleLessons);
router.post('/courses/:courseId/modules/:moduleId/lessons', adminController.createLesson);

router.patch('/lessons/:id', adminController.updateLesson);
router.delete('/lessons/:id', adminController.deleteLesson);
router.post('/lessons/:id/quiz', adminController.createLessonQuiz);
router.post('/lessons/:id/coding', adminController.createLessonCoding);
router.get('/lessons/:id/coding', adminController.getLessonCoding);
router.patch('/lessons/:id/coding', adminController.updateLessonCoding);

router.post('/practice/generate-ai', adminController.generatePracticeWithAI);
router.get('/assessments', adminController.listAssessments);
router.get('/assessments/:id', adminController.getAssessment);
router.post('/assessments', adminController.createPracticeAssessment);
router.patch('/assessments/:id', adminController.updateAssessment);
router.delete('/assessments/:id', adminController.deleteAssessment);
router.post('/assessments/:id/questions', adminController.addQuestionToAssessment);
router.delete('/assessments/:id/questions/:questionId', adminController.removeQuestionFromAssessment);

router.post('/questions', adminController.createQuestion);
router.patch('/questions/:id', adminController.updateQuestion);

router.get('/blogs', adminController.listBlogPosts);
router.post('/blogs', adminController.createBlogPost);
router.patch('/blogs/:id', adminController.updateBlogPost);
router.delete('/blogs/:id', adminController.deleteBlogPost);

router.get('/resumes', adminController.listResumes);
router.delete('/resumes/:id', adminController.deleteResume);

router.get('/users', adminController.listUsers);
router.get('/users/:id/xp-history', adminController.getUserXpHistory);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
