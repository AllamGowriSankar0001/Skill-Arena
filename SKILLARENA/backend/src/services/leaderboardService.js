const {
  Category,
  Course,
  Enrollment,
  User,
  UserStats,
} = require('../models');

const DEFAULT_LIMIT = 25;

async function getIneligibleLeaderboardUserIds() {
  const excludedUsers = await User.find({
    $or: [{ role: 'ADMIN' }, { status: { $ne: 'ACTIVE' } }],
  })
    .select('_id')
    .lean();

  return excludedUsers.map((entry) => entry._id);
}

function isEligibleLeaderboardUser(user) {
  return Boolean(user && user.role !== 'ADMIN' && user.status === 'ACTIVE');
}

function buildRankedEntries(rows, userId, { scoreKey = 'score', subtitleKey = 'subtitle' } = {}) {
  const entries = rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    name: row.name,
    score: row[scoreKey],
    scoreLabel: row.scoreLabel,
    subtitle: row[subtitleKey] || row.subtitle || '',
    isYou: userId && String(row.userId) === String(userId),
  }));

  const yourEntry = entries.find((entry) => entry.isYou) || null;
  let yourRank = yourEntry?.rank ?? null;

  return { entries, yourRank, yourEntry };
}

async function getLeaderboardFilters() {
  const [categories, courses] = await Promise.all([
    Category.find({ status: 'ACTIVE' }).sort({ sortOrder: 1, name: 1 }).select('name slug').lean(),
    Course.find({ status: 'PUBLISHED' })
      .populate('categoryId', 'name')
      .sort({ title: 1 })
      .select('title categoryId')
      .lean(),
  ]);

  return {
    categories: categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
    })),
    courses: courses.map((course) => ({
      id: course._id.toString(),
      title: course.title,
      categoryId: course.categoryId?._id?.toString() || null,
      categoryName: course.categoryId?.name || null,
    })),
  };
}

async function getGlobalLeaderboard(userId, limit = DEFAULT_LIMIT) {
  const ineligibleUserIds = await getIneligibleLeaderboardUserIds();

  const topUsers = await UserStats.find({
    userId: { $nin: ineligibleUserIds },
    totalXp: { $gt: 0 },
  })
    .sort({ totalXp: -1 })
    .limit(limit)
    .populate('userId', 'name role status');

  const rows = topUsers
    .filter((entry) => isEligibleLeaderboardUser(entry.userId))
    .map((entry) => ({
      userId: entry.userId._id.toString(),
      name: entry.userId.name,
      score: entry.totalXp,
      scoreLabel: `${entry.totalXp.toLocaleString()} XP`,
      subtitle: `Level ${entry.level}`,
    }));

  let yourRank = null;
  if (userId) {
    const currentUser = await User.findById(userId).select('role status').lean();
    if (isEligibleLeaderboardUser(currentUser)) {
      const myStats = await UserStats.findOne({ userId });
      if (myStats && myStats.totalXp > 0) {
        yourRank =
          (await UserStats.countDocuments({
            userId: { $nin: ineligibleUserIds },
            totalXp: { $gt: myStats.totalXp },
          })) + 1;
      }
    }
  }

  const ranked = buildRankedEntries(rows, userId);
  return {
    title: 'Global arena',
    description: 'All-time XP earned across courses, practice, and learning activity.',
    metricLabel: 'Total XP',
    ...ranked,
    yourRank: ranked.yourRank ?? yourRank,
  };
}

async function getCourseLeaderboard(userId, courseId, limit = DEFAULT_LIMIT) {
  const course = await Course.findOne({ _id: courseId, status: 'PUBLISHED' })
    .populate('categoryId', 'name')
    .select('title categoryId');

  if (!course) {
    throw new Error('Course not found.');
  }

  const ineligibleUserIds = await getIneligibleLeaderboardUserIds();

  const enrollments = await Enrollment.find({
    courseId: course._id,
    userId: { $nin: ineligibleUserIds },
    status: { $in: ['ACTIVE', 'COMPLETED'] },
    $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
  })
    .sort({ progressPercentage: -1, completedLessonCount: -1, lastAccessedAt: -1 })
    .limit(limit)
    .populate('userId', 'name role status');

  const rows = enrollments
    .filter((entry) => isEligibleLeaderboardUser(entry.userId))
    .map((entry) => ({
      userId: entry.userId._id.toString(),
      name: entry.userId.name,
      score: entry.progressPercentage,
      scoreLabel: `${entry.progressPercentage}%`,
      subtitle: `${entry.completedLessonCount}/${entry.totalLessons || entry.completedLessonCount} lessons`,
    }));

  let yourRank = null;
  if (userId) {
    const allEnrollments = await Enrollment.find({
      courseId: course._id,
      userId: { $nin: ineligibleUserIds },
      status: { $in: ['ACTIVE', 'COMPLETED'] },
      $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
    })
      .sort({ progressPercentage: -1, completedLessonCount: -1, lastAccessedAt: -1 })
      .populate('userId', 'role status');

    const index = allEnrollments.findIndex(
      (entry) =>
        String(entry.userId?._id) === String(userId) && isEligibleLeaderboardUser(entry.userId),
    );
    yourRank = index >= 0 ? index + 1 : null;
  }

  const ranked = buildRankedEntries(rows, userId);
  return {
    title: course.title,
    description: course.categoryId?.name
      ? `${course.categoryId.name} course rankings by learning progress.`
      : 'Course rankings by learning progress.',
    metricLabel: 'Progress',
    courseId: course._id.toString(),
    categoryId: course.categoryId?._id?.toString() || null,
    categoryName: course.categoryId?.name || null,
    ...ranked,
    yourRank: ranked.yourRank ?? yourRank,
  };
}

async function getCategoryLeaderboard(userId, categoryId, limit = DEFAULT_LIMIT) {
  const category = await Category.findOne({ _id: categoryId, status: 'ACTIVE' }).select('name slug');
  if (!category) {
    throw new Error('Category not found.');
  }

  const ineligibleUserIds = await getIneligibleLeaderboardUserIds();
  const courseIds = await Course.find({ categoryId: category._id, status: 'PUBLISHED' }).distinct('_id');

  if (!courseIds.length) {
    return {
      title: category.name,
      description: 'No published courses in this category yet.',
      metricLabel: 'Lessons completed',
      categoryId: category._id.toString(),
      entries: [],
      yourRank: null,
      yourEntry: null,
    };
  }

  const aggregated = await Enrollment.aggregate([
    {
      $match: {
        courseId: { $in: courseIds },
        userId: { $nin: ineligibleUserIds },
        status: { $in: ['ACTIVE', 'COMPLETED'] },
        $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
      },
    },
    {
      $group: {
        _id: '$userId',
        completedLessons: { $sum: '$completedLessonCount' },
        avgProgress: { $avg: '$progressPercentage' },
        coursesActive: { $sum: 1 },
      },
    },
    { $sort: { completedLessons: -1, avgProgress: -1 } },
    { $limit: limit },
  ]);

  const userIds = aggregated.map((row) => row._id);
  const users = await User.find({
    _id: { $in: userIds },
    role: { $ne: 'ADMIN' },
    status: 'ACTIVE',
  }).select('name role status');
  const userMap = new Map(users.map((entry) => [entry._id.toString(), entry]));

  const rows = aggregated
    .map((row) => {
      const user = userMap.get(row._id.toString());
      if (!user) return null;
      const avgProgress = Math.round(row.avgProgress || 0);
      return {
        userId: row._id.toString(),
        name: user.name,
        score: row.completedLessons,
        scoreLabel: `${row.completedLessons} lessons`,
        subtitle: `${avgProgress}% avg · ${row.coursesActive} course${row.coursesActive === 1 ? '' : 's'}`,
      };
    })
    .filter(Boolean);

  let yourRank = null;
  if (userId) {
    const fullAggregate = await Enrollment.aggregate([
      {
        $match: {
          courseId: { $in: courseIds },
          userId: { $nin: ineligibleUserIds },
          status: { $in: ['ACTIVE', 'COMPLETED'] },
          $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
        },
      },
      {
        $group: {
          _id: '$userId',
          completedLessons: { $sum: '$completedLessonCount' },
          avgProgress: { $avg: '$progressPercentage' },
        },
      },
      { $sort: { completedLessons: -1, avgProgress: -1 } },
    ]);

    const index = fullAggregate.findIndex((row) => String(row._id) === String(userId));
    yourRank = index >= 0 ? index + 1 : null;
  }

  const ranked = buildRankedEntries(rows, userId);
  return {
    title: category.name,
    description: `Learners ranked by completed lessons across ${category.name} courses.`,
    metricLabel: 'Lessons completed',
    categoryId: category._id.toString(),
    ...ranked,
    yourRank: ranked.yourRank ?? yourRank,
  };
}

async function getLeaderboard(userId, { scope = 'global', categoryId, courseId, limit = DEFAULT_LIMIT } = {}) {
  const filters = await getLeaderboardFilters();

  if (scope === 'course') {
    if (!courseId) {
      const fallbackCourseId = filters.courses[0]?.id;
      if (!fallbackCourseId) {
        return {
          scope: 'course',
          filters,
          title: 'Course leaderboard',
          description: 'No published courses available for rankings yet.',
          metricLabel: 'Progress',
          entries: [],
          yourRank: null,
          yourEntry: null,
        };
      }
      const data = await getCourseLeaderboard(userId, fallbackCourseId, limit);
      return { scope: 'course', filters, selectedCourseId: fallbackCourseId, ...data };
    }
    const data = await getCourseLeaderboard(userId, courseId, limit);
    return { scope: 'course', filters, selectedCourseId: courseId, ...data };
  }

  if (scope === 'category') {
    if (!categoryId) {
      const fallbackCategoryId = filters.categories[0]?.id;
      if (!fallbackCategoryId) {
        return {
          scope: 'category',
          filters,
          title: 'Category leaderboard',
          description: 'No active categories available for rankings yet.',
          metricLabel: 'Lessons completed',
          entries: [],
          yourRank: null,
          yourEntry: null,
        };
      }
      const data = await getCategoryLeaderboard(userId, fallbackCategoryId, limit);
      return { scope: 'category', filters, selectedCategoryId: fallbackCategoryId, ...data };
    }
    const data = await getCategoryLeaderboard(userId, categoryId, limit);
    return { scope: 'category', filters, selectedCategoryId: categoryId, ...data };
  }

  const data = await getGlobalLeaderboard(userId, limit);
  return { scope: 'global', filters, ...data };
}

module.exports = {
  getLeaderboard,
  getLeaderboardFilters,
};
