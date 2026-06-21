const {
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
} = require('../models');
const { awardXp, emptyXpDelta, mergeXpDelta, revokeXpBySource } = require('./xpService');
const {
  getPublishedLessonsForCourse,
  getNextLesson,
  getPreviousLesson,
} = require('../utils/courseLessonOrder');

const VIDEO_AUTO_COMPLETE_PERCENT = 90;

async function getOrCreateEnrollment(userId, courseId) {
  let enrollment = await Enrollment.findOne({ userId, courseId });
  if (enrollment) return enrollment;

  const course = await Course.findOne({ _id: courseId, status: 'PUBLISHED' });
  if (!course) {
    throw new Error('Course not found.');
  }

  const orderedLessons = await getPublishedLessonsForCourse(courseId);
  const firstLesson = orderedLessons[0] || null;

  enrollment = await Enrollment.create({
    userId,
    courseId,
    status: 'ACTIVE',
    currentLessonId: firstLesson?._id,
    totalLessons: orderedLessons.length,
    completedLessonCount: 0,
    progressPercentage: 0,
    enrolledAt: new Date(),
    lastAccessedAt: new Date(),
  });

  await Course.updateOne({ _id: courseId }, { $inc: { 'stats.enrollmentCount': 1 } });

  return enrollment;
}

async function enrollUser(userId, courseId) {
  const existing = await Enrollment.findOne({ userId, courseId, status: { $in: ['ACTIVE', 'COMPLETED'] } });
  if (existing) {
    return existing;
  }
  return getOrCreateEnrollment(userId, courseId);
}

async function getProgressMap(userId, courseId) {
  const rows = await LessonProgress.find({ userId, courseId }).lean();
  return new Map(rows.map((row) => [row.lessonId.toString(), row]));
}

async function recalculateEnrollment(userId, courseId) {
  const enrollment = await Enrollment.findOne({ userId, courseId });
  if (!enrollment) return { enrollment: null, xp: emptyXpDelta() };

  const xp = emptyXpDelta();
  const orderedLessons = await getPublishedLessonsForCourse(courseId);
  const progressMap = await getProgressMap(userId, courseId);

  const completedCount = orderedLessons.filter((lesson) => {
    const progress = progressMap.get(lesson._id.toString());
    return progress?.status === 'COMPLETED';
  }).length;

  const total = orderedLessons.length;
  const progressPercentage =
    total === 0 ? 0 : Math.round((completedCount / total) * 100);

  enrollment.totalLessons = total;
  enrollment.completedLessonCount = completedCount;
  enrollment.progressPercentage = progressPercentage;
  enrollment.lastAccessedAt = new Date();

  const nextIncomplete = orderedLessons.find((lesson) => {
    const progress = progressMap.get(lesson._id.toString());
    return progress?.status !== 'COMPLETED';
  });

  enrollment.currentLessonId = nextIncomplete?._id || orderedLessons[orderedLessons.length - 1]?._id;

  if (total > 0 && completedCount >= total && enrollment.status !== 'COMPLETED') {
    enrollment.status = 'COMPLETED';
    enrollment.completedAt = new Date();
    enrollment.progressPercentage = 100;

    const course = await Course.findById(courseId);
    if (course?.completionXpReward) {
      const awardResult = await awardXp({
        userId,
        sourceType: 'COURSE_COMPLETION',
        sourceId: courseId,
        amount: course.completionXpReward,
        description: `Completed course: ${course.title}`,
      });
      mergeXpDelta(xp, awardResult.delta);
    }

    await Course.updateOne({ _id: courseId }, { $inc: { 'stats.completionCount': 1 } });
  } else if (enrollment.status === 'COMPLETED' && completedCount < total) {
    const revokeResult = await revokeXpBySource({
      userId,
      sourceType: 'COURSE_COMPLETION',
      sourceId: courseId,
      description: 'Course marked incomplete after lesson update',
    });
    mergeXpDelta(xp, revokeResult.delta);
    enrollment.status = 'ACTIVE';
    enrollment.completedAt = undefined;
  }

  await enrollment.save();
  return { enrollment, xp };
}

async function canAccessLesson(userId, lesson, { isAdmin = false } = {}) {
  if (isAdmin) return { allowed: true };
  if (lesson.isPreview) return { allowed: true };

  await getOrCreateEnrollment(userId, lesson.courseId);

  const orderedLessons = await getPublishedLessonsForCourse(lesson.courseId);
  const progressMap = await getProgressMap(userId, lesson.courseId);
  const lessonIndex = orderedLessons.findIndex(
    (item) => item._id.toString() === lesson._id.toString(),
  );

  if (lessonIndex < 0) {
    return { allowed: false, reason: 'Lesson not found in course.' };
  }

  const currentProgress = progressMap.get(lesson._id.toString());
  if (currentProgress?.status === 'COMPLETED') {
    return { allowed: true };
  }

  if (lessonIndex === 0) {
    return { allowed: true };
  }

  const previousLesson = orderedLessons[lessonIndex - 1];
  const previousProgress = progressMap.get(previousLesson._id.toString());

  if (previousProgress?.status === 'COMPLETED') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Complete the previous lesson to unlock this lesson.',
    previousLessonId: previousLesson._id.toString(),
  };
}

async function getLessonProgressRecord(userId, lesson) {
  let progress = await LessonProgress.findOne({ userId, lessonId: lesson._id });
  if (progress) return progress;

  const enrollment = await getOrCreateEnrollment(userId, lesson.courseId);

  progress = await LessonProgress.create({
    userId,
    enrollmentId: enrollment._id,
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    lessonId: lesson._id,
    status: 'NOT_STARTED',
    progressPercentage: 0,
    attemptsCount: 0,
  });

  return progress;
}

async function startLesson(userId, lessonId, { isAdmin = false } = {}) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED' });
  if (!lesson) throw new Error('Lesson not found.');

  const access = await canAccessLesson(userId, lesson, { isAdmin });
  if (!access.allowed) {
    const error = new Error(access.reason || 'Lesson is locked.');
    error.statusCode = 403;
    error.code = 'LESSON_LOCKED';
    error.previousLessonId = access.previousLessonId;
    throw error;
  }

  const progress = await getLessonProgressRecord(userId, lesson);
  const now = new Date();

  if (progress.status === 'NOT_STARTED') {
    progress.status = 'IN_PROGRESS';
    progress.firstStartedAt = now;
  }

  progress.lastAccessedAt = now;
  await progress.save();

  const enrollment = await Enrollment.findOne({ userId, courseId: lesson.courseId });
  if (enrollment) {
    enrollment.currentLessonId = lesson._id;
    enrollment.lastAccessedAt = now;
    await enrollment.save();
  }

  return progress;
}

async function completeLesson(userId, lesson, { skipXp = false } = {}) {
  const progress = await getLessonProgressRecord(userId, lesson);
  const wasCompleted = progress.status === 'COMPLETED';
  const now = new Date();
  const xp = emptyXpDelta();

  progress.status = 'COMPLETED';
  progress.progressPercentage = 100;
  progress.completedAt = now;
  progress.lastAccessedAt = now;
  await progress.save();

  if (!wasCompleted && !skipXp && lesson.completionXpReward) {
    const awardResult = await awardXp({
      userId,
      sourceType: 'LESSON_COMPLETION',
      sourceId: lesson._id,
      amount: lesson.completionXpReward,
      description: `Completed lesson: ${lesson.title}`,
    });
    mergeXpDelta(xp, awardResult.delta);
  }

  const enrollmentResult = await recalculateEnrollment(userId, lesson.courseId);
  mergeXpDelta(xp, enrollmentResult?.xp);

  return { progress, xp };
}

async function markArticleComplete(userId, lessonId, { isAdmin = false } = {}) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED' });
  if (!lesson) throw new Error('Lesson not found.');
  if (lesson.type !== 'ARTICLE') throw new Error('This lesson type cannot be manually completed.');

  const access = await canAccessLesson(userId, lesson, { isAdmin });
  if (!access.allowed) {
    const error = new Error(access.reason || 'Lesson is locked.');
    error.statusCode = 403;
    throw error;
  }

  await startLesson(userId, lessonId, { isAdmin });
  return completeLesson(userId, lesson);
}

async function markArticleIncomplete(userId, lessonId) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED' });
  if (!lesson) throw new Error('Lesson not found.');
  if (lesson.type !== 'ARTICLE') throw new Error('Only article lessons can be marked incomplete.');

  const progress = await getLessonProgressRecord(userId, lesson);
  const wasCompleted = progress.status === 'COMPLETED';
  const xp = emptyXpDelta();

  progress.status = 'IN_PROGRESS';
  progress.progressPercentage = 0;
  progress.completedAt = undefined;
  progress.lastAccessedAt = new Date();
  await progress.save();

  if (wasCompleted) {
    const revokeResult = await revokeXpBySource({
      userId,
      sourceType: 'LESSON_COMPLETION',
      sourceId: lesson._id,
      description: `Marked incomplete: ${lesson.title}`,
    });
    mergeXpDelta(xp, revokeResult.delta);
  }

  const enrollmentResult = await recalculateEnrollment(userId, lesson.courseId);
  mergeXpDelta(xp, enrollmentResult?.xp);

  return { progress, xp };
}

async function updateVideoProgress(userId, lessonId, { positionSeconds = 0, durationSeconds = 0, manualComplete = false, isAdmin = false } = {}) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED' });
  if (!lesson) throw new Error('Lesson not found.');
  if (lesson.type !== 'VIDEO') throw new Error('Not a video lesson.');

  const access = await canAccessLesson(userId, lesson, { isAdmin });
  if (!access.allowed) {
    const error = new Error(access.reason || 'Lesson is locked.');
    error.statusCode = 403;
    throw error;
  }

  const progress = await getLessonProgressRecord(userId, lesson);
  const now = new Date();

  if (progress.status === 'NOT_STARTED') {
    progress.status = 'IN_PROGRESS';
    progress.firstStartedAt = now;
  }

  progress.lastVideoPositionSeconds = Math.max(0, positionSeconds);
  progress.lastAccessedAt = now;

  let percent = 0;
  if (durationSeconds > 0) {
    percent = Math.min(100, Math.round((positionSeconds / durationSeconds) * 100));
    progress.progressPercentage = percent;
  }

  await progress.save();

  const shouldAutoComplete = manualComplete || percent >= VIDEO_AUTO_COMPLETE_PERCENT;
  if (shouldAutoComplete && progress.status !== 'COMPLETED') {
    return completeLesson(userId, lesson);
  }

  return { progress, xp: emptyXpDelta() };
}

async function getCourseProgress(userId, courseId) {
  const enrollment = await Enrollment.findOne({ userId, courseId });
  const orderedLessons = await getPublishedLessonsForCourse(courseId);
  const progressMap = await getProgressMap(userId, courseId);

  const lessons = orderedLessons.map((lesson, index) => {
    const progress = progressMap.get(lesson._id.toString());
    const status = progress?.status || 'NOT_STARTED';
    let lockState = 'UNLOCKED';

    if (index === 0 || lesson.isPreview || status === 'COMPLETED') {
      lockState = 'UNLOCKED';
    } else {
      const prev = orderedLessons[index - 1];
      const prevProgress = progressMap.get(prev._id.toString());
      lockState = prevProgress?.status === 'COMPLETED' ? 'UNLOCKED' : 'LOCKED';
    }

    return {
      id: lesson._id.toString(),
      moduleId: lesson.moduleId.toString(),
      title: lesson.title,
      type: lesson.type,
      order: lesson.order,
      isPreview: Boolean(lesson.isPreview),
      status,
      progressPercentage: progress?.progressPercentage ?? 0,
      lockState,
    };
  });

  return {
    enrollment: enrollment
      ? {
          id: enrollment._id.toString(),
          status: enrollment.status,
          completedLessonCount: enrollment.completedLessonCount,
          totalLessons: enrollment.totalLessons,
          progressPercentage: enrollment.progressPercentage,
          currentLessonId: enrollment.currentLessonId?.toString() || null,
          completedAt: enrollment.completedAt,
        }
      : null,
    lessons,
  };
}

async function getLessonProgressDetail(userId, lessonId) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED' });
  if (!lesson) throw new Error('Lesson not found.');

  const progress = await LessonProgress.findOne({ userId, lessonId });
  const orderedLessons = await getPublishedLessonsForCourse(lesson.courseId);
  const access = await canAccessLesson(userId, lesson);

  return {
    lessonId: lesson._id.toString(),
    courseId: lesson.courseId.toString(),
    status: progress?.status || 'NOT_STARTED',
    progressPercentage: progress?.progressPercentage ?? 0,
    lastVideoPositionSeconds: progress?.lastVideoPositionSeconds ?? 0,
    attemptsCount: progress?.attemptsCount ?? 0,
    completedAt: progress?.completedAt || null,
    codingDraft: progress?.codingDraft || null,
    access,
    previousLessonId: getPreviousLesson(orderedLessons, lesson._id)?._id?.toString() || null,
    nextLessonId: getNextLesson(orderedLessons, lesson._id)?._id?.toString() || null,
  };
}

async function incrementAttemptCount(userId, lessonId) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return;
  const progress = await getLessonProgressRecord(userId, lesson);
  progress.attemptsCount = (progress.attemptsCount || 0) + 1;
  progress.lastAccessedAt = new Date();
  if (progress.status === 'NOT_STARTED') {
    progress.status = 'IN_PROGRESS';
    progress.firstStartedAt = new Date();
  }
  await progress.save();
}

async function saveCodingDraft(userId, lessonId, draft) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED', type: 'CODING' });
  if (!lesson) throw new Error('Coding lesson not found.');

  const progress = await getLessonProgressRecord(userId, lesson);
  progress.codingDraft = {
    html: draft.html || '',
    css: draft.css || '',
    javascript: draft.javascript || '',
    updatedAt: new Date(),
  };
  progress.lastAccessedAt = new Date();
  if (progress.status === 'NOT_STARTED') {
    progress.status = 'IN_PROGRESS';
    progress.firstStartedAt = new Date();
  }
  await progress.save();
  return progress.codingDraft;
}

async function listEnrollmentSummaries(userId) {
  const enrollments = await Enrollment.find({ userId }).lean();
  if (!enrollments.length) return [];

  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  const startedCounts = await LessonProgress.aggregate([
    {
      $match: {
        userId,
        courseId: { $in: courseIds },
        status: { $in: ['IN_PROGRESS', 'COMPLETED'] },
      },
    },
    { $group: { _id: '$courseId', startedCount: { $sum: 1 } } },
  ]);

  const startedMap = new Map(
    startedCounts.map((entry) => [entry._id.toString(), entry.startedCount]),
  );

  return enrollments.map((enrollment) => {
    const courseId = enrollment.courseId.toString();
    const startedCount = startedMap.get(courseId) || 0;
    const hasStarted =
      startedCount > 0 || enrollment.completedLessonCount > 0 || enrollment.progressPercentage > 0;

    return {
      courseId,
      status: enrollment.status,
      completedLessonCount: enrollment.completedLessonCount,
      totalLessons: enrollment.totalLessons,
      progressPercentage: enrollment.progressPercentage,
      currentLessonId: enrollment.currentLessonId?.toString() || null,
      hasStarted,
    };
  });
}

module.exports = {
  VIDEO_AUTO_COMPLETE_PERCENT,
  enrollUser,
  getOrCreateEnrollment,
  recalculateEnrollment,
  canAccessLesson,
  startLesson,
  completeLesson,
  markArticleComplete,
  markArticleIncomplete,
  updateVideoProgress,
  getCourseProgress,
  getLessonProgressDetail,
  listEnrollmentSummaries,
  incrementAttemptCount,
  saveCodingDraft,
  getPublishedLessonsForCourse,
};
