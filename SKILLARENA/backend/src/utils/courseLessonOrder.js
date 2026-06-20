const { CourseModule, Lesson } = require('../models');

async function getPublishedLessonsForCourse(courseId) {
  const modules = await CourseModule.find({ courseId, status: 'ACTIVE' }).sort({ order: 1 }).lean();
  const lessons = await Lesson.find({ courseId, status: 'PUBLISHED' }).sort({ order: 1 }).lean();

  const lessonsByModule = lessons.reduce((acc, lesson) => {
    const key = lesson.moduleId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(lesson);
    return acc;
  }, {});

  const ordered = [];
  modules.forEach((moduleDoc) => {
    const moduleLessons = lessonsByModule[moduleDoc._id.toString()] || [];
    moduleLessons.forEach((lesson) => {
      ordered.push({
        ...lesson,
        moduleOrder: moduleDoc.order,
      });
    });
  });

  return ordered;
}

function getPreviousLesson(orderedLessons, lessonId) {
  const index = orderedLessons.findIndex((lesson) => lesson._id.toString() === lessonId.toString());
  if (index <= 0) return null;
  return orderedLessons[index - 1];
}

function getNextLesson(orderedLessons, lessonId) {
  const index = orderedLessons.findIndex((lesson) => lesson._id.toString() === lessonId.toString());
  if (index < 0 || index >= orderedLessons.length - 1) return null;
  return orderedLessons[index + 1];
}

module.exports = {
  getPublishedLessonsForCourse,
  getPreviousLesson,
  getNextLesson,
};
