const {
  Category,
  Course,
  Enrollment,
  User,
  UserStats,
} = require('../models');
const { withPerfSpan } = require('../utils/perfContext');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function clampLeaderboardLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

async function getIneligibleLeaderboardUserIds() {
  return withPerfSpan('leaderboard.ineligibleUsers', async () => {
    const excludedUsers = await User.find({
      $or: [{ role: 'ADMIN' }, { status: { $ne: 'ACTIVE' } }],
    })
      .select('_id')
      .lean();

    return excludedUsers.map((entry) => entry._id);
  });
}

function isEligibleLeaderboardUser(user) {
  return Boolean(user && user.role !== 'ADMIN' && user.status === 'ACTIVE');
}

/**
 * Ranking tie-break used by course leaderboard (must stay in sync with sort + countDocuments).
 * Higher progress wins; then more completed lessons; then more recent lastAccessedAt.
 */
function isEnrollmentAhead(candidate, me) {
  const candidateProgress = Number(candidate?.progressPercentage) || 0;
  const myProgress = Number(me?.progressPercentage) || 0;
  if (candidateProgress !== myProgress) {
    return candidateProgress > myProgress;
  }

  const candidateLessons = Number(candidate?.completedLessonCount) || 0;
  const myLessons = Number(me?.completedLessonCount) || 0;
  if (candidateLessons !== myLessons) {
    return candidateLessons > myLessons;
  }

  const candidateTime = candidate?.lastAccessedAt
    ? new Date(candidate.lastAccessedAt).getTime()
    : 0;
  const myTime = me?.lastAccessedAt ? new Date(me.lastAccessedAt).getTime() : 0;
  return candidateTime > myTime;
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
  return withPerfSpan('leaderboard.filters', async () => {
    const [categories, courses] = await Promise.all([
      Category.find({ status: 'ACTIVE' }).sort({ sortOrder: 1, name: 1 }).select('name slug').lean(),
      Course.find({ status: 'PUBLISHED' }).sort({ title: 1 }).select('title categoryId').lean(),
    ]);

    const categoryById = new Map(
      categories.map((category) => [category._id.toString(), category]),
    );

    return {
      categories: categories.map((category) => ({
        id: category._id.toString(),
        name: category.name,
        slug: category.slug,
      })),
      courses: courses.map((course) => {
        const category = course.categoryId
          ? categoryById.get(course.categoryId.toString())
          : null;
        return {
          id: course._id.toString(),
          title: course.title,
          categoryId: category?._id?.toString() || course.categoryId?.toString() || null,
          categoryName: category?.name || null,
        };
      }),
    };
  });
}

async function getGlobalLeaderboard(userId, limit = DEFAULT_LIMIT) {
  return withPerfSpan('leaderboard.global', async () => {
    const ineligibleUserIds = await getIneligibleLeaderboardUserIds();

    const [topUsers, myStats] = await Promise.all([
      withPerfSpan('leaderboard.global.topStats', () =>
        UserStats.find({
          userId: { $nin: ineligibleUserIds },
          totalXp: { $gt: 0 },
        })
          .sort({ totalXp: -1 })
          .limit(limit)
          .populate('userId', 'name role status'),
      ),
      withPerfSpan('leaderboard.global.myStats', async () => {
        if (!userId) return null;
        const currentUser = await User.findById(userId).select('role status').lean();
        if (!isEligibleLeaderboardUser(currentUser)) return null;
        return UserStats.findOne({ userId }).select('totalXp').lean();
      }),
    ]);

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
    if (myStats && myStats.totalXp > 0) {
      yourRank = await withPerfSpan('leaderboard.global.countAhead', async () =>
        (await UserStats.countDocuments({
          userId: { $nin: ineligibleUserIds },
          totalXp: { $gt: myStats.totalXp },
        })) + 1,
      );
    }

    const ranked = buildRankedEntries(rows, userId);
    return {
      title: 'Global arena',
      description: 'All-time XP earned across courses, practice, and learning activity.',
      metricLabel: 'Total XP',
      ...ranked,
      yourRank: ranked.yourRank ?? yourRank,
    };
  });
}

async function getCourseLeaderboard(userId, courseId, limit = DEFAULT_LIMIT) {
  return withPerfSpan('leaderboard.course', async () => {
    const [course, ineligibleUserIds] = await Promise.all([
      withPerfSpan('leaderboard.course.lookup', () =>
        Course.findOne({ _id: courseId, status: 'PUBLISHED' })
          .populate('categoryId', 'name')
          .select('title categoryId')
          .lean(),
      ),
      getIneligibleLeaderboardUserIds(),
    ]);

    if (!course) {
      throw new Error('Course not found.');
    }

    const enrollmentFilter = {
      courseId: course._id,
      userId: { $nin: ineligibleUserIds },
      status: { $in: ['ACTIVE', 'COMPLETED'] },
      $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
    };

    const [enrollments, myEnrollment] = await Promise.all([
      withPerfSpan('leaderboard.course.topEnrollments', () =>
        Enrollment.find(enrollmentFilter)
          .sort({ progressPercentage: -1, completedLessonCount: -1, lastAccessedAt: -1 })
          .limit(limit)
          .populate('userId', 'name role status')
          .select(
            'userId progressPercentage completedLessonCount totalLessons lastAccessedAt status',
          ),
      ),
      userId
        ? withPerfSpan('leaderboard.course.myEnrollment', () =>
            Enrollment.findOne({
              courseId: course._id,
              userId,
              status: { $in: ['ACTIVE', 'COMPLETED'] },
              $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
            })
              .select('progressPercentage completedLessonCount lastAccessedAt')
              .lean(),
          )
        : Promise.resolve(null),
    ]);

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
    if (myEnrollment) {
      yourRank = await withPerfSpan('leaderboard.course.countAhead', async () => {
        const ahead = await Enrollment.countDocuments({
          courseId: course._id,
          userId: { $nin: [...ineligibleUserIds, userId] },
          status: { $in: ['ACTIVE', 'COMPLETED'] },
          $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
          $and: [
            {
              $or: [
                { progressPercentage: { $gt: myEnrollment.progressPercentage } },
                {
                  progressPercentage: myEnrollment.progressPercentage,
                  completedLessonCount: { $gt: myEnrollment.completedLessonCount },
                },
                {
                  progressPercentage: myEnrollment.progressPercentage,
                  completedLessonCount: myEnrollment.completedLessonCount,
                  lastAccessedAt: { $gt: myEnrollment.lastAccessedAt || new Date(0) },
                },
              ],
            },
          ],
        });
        return ahead + 1;
      });
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
  });
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
  const safeLimit = clampLeaderboardLimit(limit);

  // Filters (all categories/courses for UI pickers) are independent of ranking rows
  // when scope ids are already provided. Run them in parallel with ranking work.
  if (scope === 'course' && courseId) {
    const [filters, data] = await Promise.all([
      getLeaderboardFilters(),
      getCourseLeaderboard(userId, courseId, safeLimit),
    ]);
    return { scope: 'course', filters, selectedCourseId: courseId, ...data };
  }

  if (scope === 'category' && categoryId) {
    const [filters, data] = await Promise.all([
      getLeaderboardFilters(),
      getCategoryLeaderboard(userId, categoryId, safeLimit),
    ]);
    return { scope: 'category', filters, selectedCategoryId: categoryId, ...data };
  }

  if (scope === 'global') {
    const [filters, data] = await Promise.all([
      getLeaderboardFilters(),
      getGlobalLeaderboard(userId, safeLimit),
    ]);
    return { scope: 'global', filters, ...data };
  }

  // Fallback scopes need filters first to pick a default id.
  const filters = await getLeaderboardFilters();

  if (scope === 'course') {
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
    const data = await getCourseLeaderboard(userId, fallbackCourseId, safeLimit);
    return { scope: 'course', filters, selectedCourseId: fallbackCourseId, ...data };
  }

  if (scope === 'category') {
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
    const data = await getCategoryLeaderboard(userId, fallbackCategoryId, safeLimit);
    return { scope: 'category', filters, selectedCategoryId: fallbackCategoryId, ...data };
  }

  const data = await getGlobalLeaderboard(userId, safeLimit);
  return { scope: 'global', filters, ...data };
}

module.exports = {
  getLeaderboard,
  getLeaderboardFilters,
  isEnrollmentAhead,
};
