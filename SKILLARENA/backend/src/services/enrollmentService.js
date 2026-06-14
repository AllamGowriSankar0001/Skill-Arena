const { Enrollment, Course, Lesson } = require('../models');

async function enrollUserInStarterCourse(userId) {
  const existing = await Enrollment.findOne({ userId, status: 'ACTIVE' });
  if (existing) {
    return existing;
  }

  const course = await Course.findOne({
    slug: 'javascript-fundamentals',
    status: 'PUBLISHED',
  });

  if (!course) {
    return null;
  }

  const firstLesson = await Lesson.findOne({
    courseId: course._id,
    status: 'PUBLISHED',
  }).sort({ order: 1 });

  const totalLessons = await Lesson.countDocuments({
    courseId: course._id,
    status: 'PUBLISHED',
  });

  const enrollment = await Enrollment.create({
    userId,
    courseId: course._id,
    status: 'ACTIVE',
    currentLessonId: firstLesson?._id,
    totalLessons,
    progressPercentage: 0,
    enrolledAt: new Date(),
    lastAccessedAt: new Date(),
  });

  await Course.updateOne(
    { _id: course._id },
    { $inc: { 'stats.enrollmentCount': 1 } },
  );

  return enrollment;
}

module.exports = {
  enrollUserInStarterCourse,
};
