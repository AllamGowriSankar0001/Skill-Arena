const {
  User,
  Course,
  CourseModule,
  Lesson,
  Enrollment,
  DailyChallenge,
  UserDailyChallenge,
  Battle,
  UserStats,
  Notification,
  UserAchievement,
  Assessment,
  BlogPost,
  Question,
} = require('../models');
const { getUserStats } = require('./userStatsService');
const { rankFromLevel } = require('../utils/level');

function formatCourse(course) {
  if (!course) return null;
  return {
    id: course._id,
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription,
    thumbnailUrl: course.thumbnailUrl,
    level: course.level,
    estimatedMinutes: course.estimatedMinutes,
    lessonCount: course.stats?.lessonCount ?? 0,
    ratingAverage: course.stats?.ratingAverage ?? 0,
    ratingCount: course.stats?.ratingCount ?? 0,
  };
}

async function getContinueLearning(userId) {
  const enrollment = await Enrollment.findOne({
    userId,
    status: 'ACTIVE',
  })
    .sort({ lastAccessedAt: -1, updatedAt: -1 })
    .populate('courseId')
    .populate('currentLessonId');

  if (!enrollment?.courseId) {
    return null;
  }

  return {
    enrollmentId: enrollment._id,
    course: formatCourse(enrollment.courseId),
    currentLesson: enrollment.currentLessonId
      ? {
          id: enrollment.currentLessonId._id,
          title: enrollment.currentLessonId.title,
        }
      : null,
    progressPercentage: enrollment.progressPercentage,
    lastAccessedAt: enrollment.lastAccessedAt,
  };
}

async function getDailyChallenge(userId) {
  const now = new Date();
  const challenge = await DailyChallenge.findOne({
    status: 'ACTIVE',
    startAt: { $lte: now },
    endAt: { $gte: now },
  });

  if (!challenge) {
    return null;
  }

  let userChallenge = await UserDailyChallenge.findOne({
    userId,
    dailyChallengeId: challenge._id,
  });

  if (!userChallenge) {
    userChallenge = await UserDailyChallenge.create({
      userId,
      dailyChallengeId: challenge._id,
      targetValue: challenge.targetValue,
    });
  }

  return {
    id: challenge._id,
    title: challenge.title,
    description: challenge.description,
    currentProgress: userChallenge.currentProgress,
    targetValue: userChallenge.targetValue,
    xpReward: challenge.xpReward,
    status: userChallenge.status,
  };
}

async function getActiveBattle(userId) {
  const battle = await Battle.findOne({
    participants: {
      $elemMatch: {
        userId,
        status: { $in: ['INVITED', 'JOINED', 'READY', 'PLAYING'] },
      },
    },
    status: { $in: ['WAITING', 'MATCHED', 'STARTING', 'IN_PROGRESS'] },
  })
    .populate('skillId', 'name')
    .sort({ scheduledAt: 1, createdAt: -1 });

  if (!battle) {
    return null;
  }

  const opponent = battle.participants.find(
    (p) => String(p.userId) !== String(userId),
  );
  let opponentUser = null;
  if (opponent) {
    opponentUser = await User.findById(opponent.userId).select('name');
  }

  return {
    id: battle._id,
    battleCode: battle.battleCode,
    format: battle.format,
    mode: battle.mode,
    status: battle.status,
    skillName: battle.skillId?.name,
    opponentName: opponentUser?.name,
    scheduledAt: battle.scheduledAt,
    startedAt: battle.startedAt,
  };
}

async function getRecommendedCourses(userId) {
  const user = await User.findById(userId).select('interestedSkillIds');
  const filter = { status: 'PUBLISHED' };

  if (user?.interestedSkillIds?.length) {
    filter.skillIds = { $in: user.interestedSkillIds };
  }

  let courses = await Course.find(filter)
    .sort({ isFeatured: -1, 'stats.enrollmentCount': -1 })
    .limit(4);

  if (courses.length < 4) {
    const existingIds = courses.map((c) => c._id);
    const more = await Course.find({
      status: 'PUBLISHED',
      _id: { $nin: existingIds },
    })
      .sort({ isFeatured: -1 })
      .limit(4 - courses.length);
    courses = [...courses, ...more];
  }

  return courses.map(formatCourse);
}

async function getWeeklyLeaderboard(userId) {
  const adminUsers = await User.find({ role: 'ADMIN' }).select('_id').lean();
  const adminIds = adminUsers.map((entry) => entry._id);

  const topUsers = await UserStats.find({ userId: { $nin: adminIds } })
    .sort({ totalXp: -1 })
    .limit(3)
    .populate('userId', 'name role');

  const entries = topUsers
    .filter((entry) => entry.userId && entry.userId.role !== 'ADMIN')
    .map((entry, index) => ({
      rank: index + 1,
      name: entry.userId.name,
      xp: entry.totalXp,
    }));

  const currentUser = await User.findById(userId).select('role').lean();
  if (!currentUser || currentUser.role === 'ADMIN') {
    return { entries, yourRank: null };
  }

  const myStats = await UserStats.findOne({ userId });
  let yourRank = null;
  if (myStats) {
    yourRank =
      (await UserStats.countDocuments({
        userId: { $nin: adminIds },
        totalXp: { $gt: myStats.totalXp },
      })) + 1;
  }

  return { entries, yourRank };
}

async function getHomeData(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const stats = user.role === 'ADMIN' ? null : await getUserStats(userId);

  const [
    continueLearning,
    dailyChallenge,
    activeBattle,
    recommendedCourses,
    weeklyLeaderboard,
    unreadNotificationCount,
    recentAchievements,
  ] = await Promise.all([
    getContinueLearning(userId),
    getDailyChallenge(userId),
    getActiveBattle(userId),
    getRecommendedCourses(userId),
    getWeeklyLeaderboard(userId),
    Notification.countDocuments({ userId, isRead: false }),
    UserAchievement.find({ userId, status: 'COMPLETED' })
      .sort({ unlockedAt: -1 })
      .limit(5)
      .populate('achievementId'),
  ]);

  return {
    user: {
      id: user._id,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    stats:
      user.role === 'ADMIN' || !stats
        ? null
        : {
            totalXp: stats.totalXp,
            level: stats.level,
            currentLevelXp: stats.currentLevelXp,
            nextLevelXp: stats.nextLevelXp,
            currentStreak: stats.currentStreak,
            rank: rankFromLevel(stats.level),
            coursesCompleted: stats.coursesCompleted,
            lessonsCompleted: stats.lessonsCompleted,
            questionsCorrect: stats.questionsCorrect,
            battlesWon: stats.battlesWon,
            practiceSessionsCompleted: stats.practiceSessionsCompleted,
          },
    continueLearning,
    dailyChallenge,
    activeBattle,
    recommendedCourses,
    weeklyLeaderboard,
    recentAchievements: recentAchievements.map((item) => ({
      id: item.achievementId?._id,
      name: item.achievementId?.name,
      iconUrl: item.achievementId?.iconUrl,
      unlockedAt: item.unlockedAt,
    })),
    unreadNotificationCount,
  };
}

async function listCourses() {
  const courses = await Course.find({ status: 'PUBLISHED' }).sort({
    isFeatured: -1,
    'stats.enrollmentCount': -1,
  });

  return courses.map(formatCourse);
}

async function getCourseDetail(courseId) {
  const course = await Course.findOne({ _id: courseId, status: 'PUBLISHED' }).populate(
    'categoryId',
    'name',
  );

  if (!course) {
    throw new Error('Course not found.');
  }

  const modules = await CourseModule.find({ courseId: course._id, status: 'ACTIVE' }).sort({
    order: 1,
  });

  const lessons = await Lesson.find({
    courseId: course._id,
    status: 'PUBLISHED',
  }).sort({ order: 1 });

  const lessonsByModule = lessons.reduce((acc, lesson) => {
    const key = lesson.moduleId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      id: lesson._id.toString(),
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      type: lesson.type,
      order: lesson.order,
      durationMinutes: lesson.durationMinutes,
    });
    return acc;
  }, {});

  return {
    course: {
      ...formatCourse(course),
      description: course.description,
      categoryName: course.categoryId?.name || null,
    },
    modules: modules.map((moduleDoc) => ({
      id: moduleDoc._id.toString(),
      title: moduleDoc.title,
      description: moduleDoc.description || '',
      order: moduleDoc.order,
      lessons: lessonsByModule[moduleDoc._id.toString()] || [],
    })),
  };
}

async function getLessonQuizPublic(assessmentId) {
  const assessment = await Assessment.findOne({ _id: assessmentId, status: 'PUBLISHED' });
  if (!assessment) return null;

  const orderedEntries = [...assessment.questions].sort((a, b) => a.order - b.order);
  const questionIds = orderedEntries.map((entry) => entry.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } });

  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));

  const formattedQuestions = orderedEntries
    .map((entry) => {
      const question = questionMap.get(entry.questionId.toString());
      if (!question) return null;
      return {
        id: question._id.toString(),
        prompt: question.prompt,
        options: question.options,
        points: entry.points,
        order: entry.order,
      };
    })
    .filter(Boolean);

  if (!formattedQuestions.length) return null;

  return {
    id: assessment._id.toString(),
    title: assessment.title,
    description: assessment.description || '',
    passingPercentage: assessment.passingPercentage ?? 70,
    xpReward: assessment.xpReward,
    questions: formattedQuestions,
  };
}

async function getLessonDetail(lessonId) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED' });
  if (!lesson) {
    throw new Error('Lesson not found.');
  }

  const course = await Course.findOne({ _id: lesson.courseId, status: 'PUBLISHED' }).select(
    'title slug thumbnailUrl',
  );
  if (!course) {
    throw new Error('Course not found.');
  }

  const moduleDoc = await CourseModule.findById(lesson.moduleId).select('title');

  const payload = {
    id: lesson._id.toString(),
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description,
    type: lesson.type,
    durationMinutes: lesson.durationMinutes,
    content: lesson.content,
    courseId: lesson.courseId.toString(),
    moduleId: lesson.moduleId.toString(),
    courseTitle: course.title,
    courseThumbnailUrl: course.thumbnailUrl || null,
    moduleTitle: moduleDoc?.title || '',
  };

  if (lesson.type === 'QUIZ' && lesson.assessmentId) {
    payload.quiz = await getLessonQuizPublic(lesson.assessmentId);
  }

  if (lesson.type === 'CODING' && lesson.assessmentId) {
    payload.requiresCodingApi = true;
  }

  return { lesson: payload };
}

async function listPracticeAssessments() {
  const assessments = await Assessment.find({
    type: 'PRACTICE',
    status: 'PUBLISHED',
  }).select('title description difficulty mode xpReward skillId');

  return assessments;
}

async function listUserBattles(userId) {
  const battles = await Battle.find({
    'participants.userId': userId,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('skillId', 'name');

  return battles.map((battle) => ({
    id: battle._id,
    battleCode: battle.battleCode,
    format: battle.format,
    mode: battle.mode,
    status: battle.status,
    skillName: battle.skillId?.name,
    scheduledAt: battle.scheduledAt,
    endedAt: battle.endedAt,
  }));
}

async function listPublishedBlogPosts() {
  const posts = await BlogPost.find({ status: 'PUBLISHED' })
    .populate('authorId', 'name')
    .sort({ publishedAt: -1, createdAt: -1 })
    .select('-content');

  return posts.map((post) => ({
    id: post._id.toString(),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl || null,
    authorName: post.authorId?.name || 'Skill Arena',
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    tags: post.tags || [],
  }));
}

async function getBlogPostBySlug(slug) {
  const post = await BlogPost.findOne({ slug, status: 'PUBLISHED' }).populate('authorId', 'name');
  if (!post) {
    throw new Error('Blog post not found.');
  }

  return {
    post: {
      id: post._id.toString(),
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl || null,
      authorName: post.authorId?.name || 'Skill Arena',
      publishedAt: post.publishedAt,
      tags: post.tags || [],
    },
  };
}

module.exports = {
  getHomeData,
  listCourses,
  getCourseDetail,
  getLessonDetail,
  listPracticeAssessments,
  listUserBattles,
  listPublishedBlogPosts,
  getBlogPostBySlug,
  formatCourse,
};
