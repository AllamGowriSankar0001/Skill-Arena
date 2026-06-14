const express = require('express');
const {
  getCourses,
  getCourse,
  getLesson,
  getPractice,
  getBattles,
  getBlogs,
  getBlog,
} = require('../controllers/platformController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/courses', getCourses);
router.get('/courses/:id', getCourse);
router.get('/lessons/:id', getLesson);
router.get('/practice', getPractice);
router.get('/blogs', getBlogs);
router.get('/blogs/:slug', getBlog);
router.get('/battles', authMiddleware, getBattles);

module.exports = router;
