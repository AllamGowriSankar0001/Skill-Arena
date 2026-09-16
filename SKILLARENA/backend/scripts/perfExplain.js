/**
 * Development script: explain() for Phase 2 hot queries.
 * Usage: node scripts/perfExplain.js
 * Never prints document contents or secrets.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const {
  Assessment,
  AssessmentAttempt,
  Enrollment,
  Battle,
  CommunityPost,
  Lesson,
  Course,
} = require('../src/models');

const summarizeExplain = (plan) => {
  const root = plan?.queryPlanner?.winningPlan || plan?.stages || plan;
  const exec = plan?.executionStats;

  const stages = [];
  let indexName = null;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.stage) {
      stages.push(node.stage);
      if (node.stage === 'IXSCAN' && node.indexName) {
        indexName = indexName || node.indexName;
      }
    }
    if (node.indexName && !indexName) indexName = node.indexName;
    if (node.inputStage) walk(node.inputStage);
    if (Array.isArray(node.inputStages)) node.inputStages.forEach(walk);
    if (Array.isArray(node)) node.forEach(walk);
    if (node.$cursor) walk(node.$cursor);
    if (node.queryPlanner) walk(node.queryPlanner.winningPlan);
    if (node.shards) node.shards.forEach((shard) => walk(shard.winningPlan || shard));
  };
  walk(root);
  walk(exec?.executionStages);

  return {
    stages: [...new Set(stages)],
    indexName,
    nReturned: exec?.nReturned ?? null,
    totalDocsExamined: exec?.totalDocsExamined ?? null,
    totalKeysExamined: exec?.totalKeysExamined ?? null,
    executionTimeMillis: exec?.executionTimeMillis ?? null,
    ok: plan?.ok,
  };
};

const printResult = (label, summary) => {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(summary, null, 2));
};

async function run() {
  await connectDB();

  const sampleUser = await AssessmentAttempt.findOne().select('userId').lean();
  const sampleCourse = await Course.findOne({ status: 'PUBLISHED' }).select('_id').lean();
  const userId = sampleUser?.userId;
  const courseId = sampleCourse?._id;

  // Practice assessment list
  {
    const cursor = Assessment.find({ type: 'PRACTICE', status: 'PUBLISHED' })
      .sort({ updatedAt: -1 })
      .limit(100)
      .select('title')
      .lean();
    const plan = await Assessment.find({ type: 'PRACTICE', status: 'PUBLISHED' })
      .sort({ updatedAt: -1 })
      .limit(100)
      .explain('executionStats');
    printResult('Assessment PRACTICE list', summarizeExplain(plan));
    await cursor; // keep lint quiet if unused
  }

  // Practice attempt aggregation
  if (userId) {
    const assessmentIds = await Assessment.find({ type: 'PRACTICE', status: 'PUBLISHED' })
      .select('_id')
      .limit(100)
      .lean();
    const pipeline = [
      {
        $match: {
          userId,
          assessmentId: { $in: assessmentIds.map((row) => row._id) },
          contextType: 'PRACTICE',
          status: { $in: ['SUBMITTED', 'EVALUATED'] },
        },
      },
      {
        $project: {
          assessmentId: 1,
          percentage: 1,
          passed: 1,
          submittedAt: 1,
        },
      },
      {
        $group: {
          _id: '$assessmentId',
          attemptCount: { $sum: 1 },
          bestScore: { $max: '$percentage' },
          passed: { $max: { $cond: [{ $eq: ['$passed', true] }, 1, 0] } },
          lastAttemptAt: { $max: '$submittedAt' },
        },
      },
    ];
    const plan = await AssessmentAttempt.collection
      .aggregate(pipeline)
      .explain('executionStats');
    printResult('AssessmentAttempt practice summary aggregation', summarizeExplain(plan));
  } else {
    printResult('AssessmentAttempt practice summary aggregation', {
      note: 'No AssessmentAttempt sample user found — skipped',
    });
  }

  // Community meta-style aggregation
  {
    const plan = await CommunityPost.collection
      .aggregate([
        { $match: { status: 'ACTIVE' } },
        {
          $group: {
            _id: {
              roomId: '$roomId',
              platformCategoryId: '$platformCategoryId',
              courseId: '$courseId',
            },
            count: { $sum: 1 },
          },
        },
        { $limit: 200 },
      ])
      .explain('executionStats');
    printResult('CommunityPost channel count aggregation', summarizeExplain(plan));
  }

  // Enrollment course leaderboard
  if (courseId) {
    const plan = await Enrollment.find({
      courseId,
      status: { $in: ['ACTIVE', 'COMPLETED'] },
      $or: [{ progressPercentage: { $gt: 0 } }, { completedLessonCount: { $gt: 0 } }],
    })
      .sort({ progressPercentage: -1, completedLessonCount: -1, lastAccessedAt: -1 })
      .limit(25)
      .explain('executionStats');
    printResult('Enrollment course leaderboard', summarizeExplain(plan));
  }

  // Battle scheduler STARTING due
  {
    const now = new Date();
    const plan = await Battle.find({
      status: 'STARTING',
      scheduledAt: { $lte: now },
    })
      .select('_id')
      .limit(50)
      .explain('executionStats');
    printResult('Battle STARTING due', summarizeExplain(plan));
  }

  // Battle IN_PROGRESS
  {
    const plan = await Battle.find({ status: 'IN_PROGRESS' })
      .select('_id')
      .sort({ startedAt: 1 })
      .limit(100)
      .explain('executionStats');
    printResult('Battle IN_PROGRESS', summarizeExplain(plan));
  }

  // Lesson outline projection
  if (courseId) {
    const plan = await Lesson.find({ courseId, status: 'PUBLISHED' })
      .select('title slug description type order durationMinutes moduleId')
      .sort({ order: 1 })
      .explain('executionStats');
    printResult('Lesson outline projection', summarizeExplain(plan));
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('perfExplain failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
