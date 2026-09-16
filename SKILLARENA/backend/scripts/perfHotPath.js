/**
 * Direct service-level timing for home + leaderboard (no HTTP).
 * Prints span timings and explain("executionStats") for key queries.
 * Usage: node scripts/perfHotPath.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { User, Course, Enrollment, Category, UserStats } = require('../src/models');
const { getLeaderboard } = require('../src/services/leaderboardService');
const { getHomeData } = require('../src/services/homeService');
const {
  runWithPerfContext,
  getPerfContext,
  installMongooseQueryCounter,
} = require('../src/utils/perfContext');

installMongooseQueryCounter();

const summarizeExplain = (plan) => {
  const exec = plan?.executionStats;
  const stages = [];
  let indexName = null;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.stage) stages.push(node.stage);
    if (node.stage === 'IXSCAN' && node.indexName) indexName = indexName || node.indexName;
    if (node.indexName && !indexName) indexName = node.indexName;
    if (node.inputStage) walk(node.inputStage);
    if (Array.isArray(node.inputStages)) node.inputStages.forEach(walk);
    if (node.$cursor) walk(node.$cursor);
    if (node.queryPlanner) walk(node.queryPlanner.winningPlan);
  };
  walk(plan?.queryPlanner?.winningPlan);
  walk(exec?.executionStages);
  return {
    stages: [...new Set(stages)],
    indexName,
    nReturned: exec?.nReturned ?? null,
    totalDocsExamined: exec?.totalDocsExamined ?? null,
    totalKeysExamined: exec?.totalKeysExamined ?? null,
    executionTimeMillis: exec?.executionTimeMillis ?? null,
  };
};

async function time(label, fn) {
  const started = process.hrtime.bigint();
  const value = await fn();
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { label, ms: Math.round(ms * 100) / 100, value };
}

async function run() {
  await connectDB();

  const user = await User.findOne({
    status: { $nin: ['BLOCKED', 'DELETED'] },
    role: { $ne: 'ADMIN' },
  })
    .select('_id role status')
    .lean();
  if (!user) {
    throw new Error('No active non-admin user');
  }
  const course = await Course.findOne({ status: 'PUBLISHED' }).select('_id title').lean();
  if (!course) {
    throw new Error('No published course');
  }

  const ineligible = await User.find({
    $or: [{ role: 'ADMIN' }, { status: { $ne: 'ACTIVE' } }],
  })
    .select('_id')
    .lean();
  const ineligibleIds = ineligible.map((row) => row._id);

  console.log('\n=== DB counts (context) ===');
  console.log(
    JSON.stringify(
      {
        users: await User.countDocuments(),
        ineligibleUsers: ineligibleIds.length,
        publishedCourses: await Course.countDocuments({ status: 'PUBLISHED' }),
        enrollmentsForCourse: await Enrollment.countDocuments({ courseId: course._id }),
        userStats: await UserStats.countDocuments(),
        categories: await Category.countDocuments({ status: 'ACTIVE' }),
      },
      null,
      2,
    ),
  );

  // Explains for course leaderboard queries
  console.log('\n=== Explain: course top enrollments ===');
  {
    const plan = await Enrollment.find({
      courseId: course._id,
      userId: { $nin: ineligibleIds },
      status: { $in: ['ACTIVE', 'COMPLETED'] },
      $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
    })
      .sort({ progressPercentage: -1, completedLessonCount: -1, lastAccessedAt: -1 })
      .limit(25)
      .explain('executionStats');
    console.log(JSON.stringify(summarizeExplain(plan), null, 2));
  }

  console.log('\n=== Explain: course rank countDocuments ===');
  {
    const myEnrollment = await Enrollment.findOne({
      courseId: course._id,
      userId: user._id,
      status: { $in: ['ACTIVE', 'COMPLETED'] },
    })
      .select('progressPercentage completedLessonCount lastAccessedAt')
      .lean();

    if (myEnrollment) {
      const plan = await Enrollment.find({
        courseId: course._id,
        userId: { $nin: [...ineligibleIds, user._id] },
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
      }).explain('executionStats');
      console.log(JSON.stringify({ myEnrollmentExists: true, ...summarizeExplain(plan) }, null, 2));
    } else {
      console.log(JSON.stringify({ myEnrollmentExists: false }, null, 2));
    }
  }

  console.log('\n=== Explain: ineligible users ===');
  {
    const plan = await User.find({
      $or: [{ role: 'ADMIN' }, { status: { $ne: 'ACTIVE' } }],
    })
      .select('_id')
      .explain('executionStats');
    console.log(JSON.stringify(summarizeExplain(plan), null, 2));
  }

  console.log('\n=== Explain: filters courses ===');
  {
    const plan = await Course.find({ status: 'PUBLISHED' })
      .sort({ title: 1 })
      .select('title categoryId')
      .explain('executionStats');
    console.log(JSON.stringify(summarizeExplain(plan), null, 2));
  }

  console.log('\n=== Explain: global UserStats top ===');
  {
    const plan = await UserStats.find({
      userId: { $nin: ineligibleIds },
      totalXp: { $gt: 0 },
    })
      .sort({ totalXp: -1 })
      .limit(25)
      .explain('executionStats');
    console.log(JSON.stringify(summarizeExplain(plan), null, 2));
  }

  // Component timing via sequential probes (mirrors current service order)
  console.log('\n=== Component timing (course leaderboard path) ===');
  const courseComponents = [];
  courseComponents.push(
    await time('filters.categories', () =>
      Category.find({ status: 'ACTIVE' }).sort({ sortOrder: 1, name: 1 }).select('name slug').lean(),
    ),
  );
  courseComponents.push(
    await time('filters.courses+populate', () =>
      Course.find({ status: 'PUBLISHED' })
        .populate('categoryId', 'name')
        .sort({ title: 1 })
        .select('title categoryId')
        .lean(),
    ),
  );
  courseComponents.push(
    await time('course.lookup', () =>
      Course.findOne({ _id: course._id, status: 'PUBLISHED' })
        .populate('categoryId', 'name')
        .select('title categoryId'),
    ),
  );
  courseComponents.push(
    await time('ineligible.users', () =>
      User.find({ $or: [{ role: 'ADMIN' }, { status: { $ne: 'ACTIVE' } }] })
        .select('_id')
        .lean(),
    ),
  );
  courseComponents.push(
    await time('enrollments.top+populate', () =>
      Enrollment.find({
        courseId: course._id,
        userId: { $nin: ineligibleIds },
        status: { $in: ['ACTIVE', 'COMPLETED'] },
        $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
      })
        .sort({ progressPercentage: -1, completedLessonCount: -1, lastAccessedAt: -1 })
        .limit(25)
        .populate('userId', 'name role status'),
    ),
  );
  const myEnr = await time('enrollment.mine', () =>
    Enrollment.findOne({
      courseId: course._id,
      userId: user._id,
      status: { $in: ['ACTIVE', 'COMPLETED'] },
      $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
    })
      .select('progressPercentage completedLessonCount lastAccessedAt')
      .lean(),
  );
  courseComponents.push({ label: myEnr.label, ms: myEnr.ms });
  if (myEnr.value) {
    courseComponents.push(
      await time('enrollment.countAhead', () =>
        Enrollment.countDocuments({
          courseId: course._id,
          userId: { $nin: [...ineligibleIds, user._id] },
          status: { $in: ['ACTIVE', 'COMPLETED'] },
          $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
          $and: [
            {
              $or: [
                { progressPercentage: { $gt: myEnr.value.progressPercentage } },
                {
                  progressPercentage: myEnr.value.progressPercentage,
                  completedLessonCount: { $gt: myEnr.value.completedLessonCount },
                },
                {
                  progressPercentage: myEnr.value.progressPercentage,
                  completedLessonCount: myEnr.value.completedLessonCount,
                  lastAccessedAt: { $gt: myEnr.value.lastAccessedAt || new Date(0) },
                },
              ],
            },
          ],
        }),
      ),
    );
  }
  console.log(
    JSON.stringify(
      courseComponents.map(({ label, ms }) => ({ label, ms })),
      null,
      2,
    ),
  );
  console.log(
    'componentSumMs',
    Math.round(courseComponents.reduce((s, row) => s + row.ms, 0) * 100) / 100,
  );

  console.log('\n=== Full service calls (with ALS spans) ===');
  for (const [label, fn] of [
    [
      'leaderboard-course',
      () => getLeaderboard(user._id, { scope: 'course', courseId: String(course._id), limit: 25 }),
    ],
    ['leaderboard-global', () => getLeaderboard(user._id, { scope: 'global', limit: 25 })],
    ['home', () => getHomeData(user._id)],
  ]) {
    const started = process.hrtime.bigint();
    let spans = [];
    let queryCount = 0;
    let ops = [];
    await runWithPerfContext(async () => {
      await fn();
      const ctx = getPerfContext();
      spans = ctx?.spans || [];
      queryCount = ctx?.queryCount || 0;
      ops = ctx?.ops || [];
    });
    const totalMs = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(
      JSON.stringify(
        {
          label,
          totalMs: Math.round(totalMs * 100) / 100,
          queryCount,
          opsSample: ops.slice(0, 20),
          spans,
        },
        null,
        2,
      ),
    );
  }

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
