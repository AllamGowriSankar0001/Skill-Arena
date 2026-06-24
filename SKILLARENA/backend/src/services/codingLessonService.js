const {
  Assessment,
  AssessmentAttempt,
  Lesson,
  Question,
  QuestionSolution,
} = require('../models');
const {
  canAccessLesson,
  completeLesson,
  incrementAttemptCount,
  startLesson,
} = require('./lessonProgressService');
const { emptyXpDelta } = require('./xpService');
const { runCodingTests } = require('./codingTestRunner');

function getStarterCodeMap(question) {
  const starter = question.codingDetails?.starterCode || [];
  return starter.reduce((acc, entry) => {
    acc[entry.language.toLowerCase()] = entry.code;
    return acc;
  }, { html: '', css: '', javascript: '' });
}

function getVisibleTests(question) {
  const details = question.codingDetails || {};
  return details.visibleTestCases?.length
    ? details.visibleTestCases
    : details.sampleTestCases || [];
}

async function getCodingQuestionForLesson(lesson, { isAdmin = false } = {}) {
  if (!lesson?.assessmentId) return null;

  const assessment = await Assessment.findById(lesson.assessmentId);
  if (!assessment?.questions?.length) return null;

  if (!isAdmin) {
    if (lesson.status !== 'PUBLISHED') return null;
    if (assessment.status === 'ARCHIVED') return null;
  }

  const entry = [...assessment.questions].sort((a, b) => a.order - b.order)[0];
  const question = await Question.findById(entry.questionId);
  if (!question || question.type !== 'CODING') return null;
  if (!isAdmin && question.status === 'ARCHIVED') return null;

  const solution = await QuestionSolution.findOne({ questionId: question._id });
  return { assessment, question, solution, points: entry.points };
}

function codingNotConfiguredError() {
  const error = new Error('Coding question not configured for this lesson.');
  error.statusCode = 404;
  error.code = 'CODING_NOT_CONFIGURED';
  return error;
}

async function getCodingLessonPayload(userId, lessonId, { isAdmin = false } = {}) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED', type: 'CODING' });
  if (!lesson) throw new Error('Coding lesson not found.');

  const access = await canAccessLesson(userId, lesson, { isAdmin });
  if (!access.allowed) {
    const error = new Error(access.reason || 'Lesson is locked.');
    error.statusCode = 403;
    throw error;
  }

  const bundle = await getCodingQuestionForLesson(lesson, { isAdmin });
  if (!bundle) throw codingNotConfiguredError();

  const { assessment, question } = bundle;
  const starter = getStarterCodeMap(question);
  const visibleTests = getVisibleTests(question).map((test) => ({
    type: test.type,
    selector: test.selector,
    attribute: test.attribute,
    property: test.property,
    variable: test.variable,
    expected: test.expected,
    label: test.label,
  }));

  return {
    lessonId: lesson._id.toString(),
    assessmentId: assessment._id.toString(),
    questionId: question._id.toString(),
    title: question.title || question.prompt,
    prompt: question.prompt,
    instructions: question.codingDetails?.instructions || '',
    expectedOutputDescription: question.codingDetails?.expectedOutputDescription || '',
    hints: question.codingDetails?.hints || [],
    passingPercentage: assessment.passingPercentage ?? 100,
    starterCode: starter,
    visibleTestCases: visibleTests,
    hintCount: (question.codingDetails?.hints || []).length,
  };
}

async function runVisibleCodingTests(userId, lessonId, code) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED', type: 'CODING' });
  if (!lesson) throw new Error('Coding lesson not found.');

  await startLesson(userId, lessonId);

  const bundle = await getCodingQuestionForLesson(lesson);
  if (!bundle) throw codingNotConfiguredError();

  const visibleTests = getVisibleTests(bundle.question);
  const result = runCodingTests(code, visibleTests);

  return {
    ...result,
    results: result.results.map((item) => ({
      ...item,
      expected: undefined,
    })),
  };
}

async function submitCodingAnswer(userId, lessonId, code, { isAdmin = false } = {}) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED', type: 'CODING' });
  if (!lesson) throw new Error('Coding lesson not found.');

  const access = await canAccessLesson(userId, lesson, { isAdmin });
  if (!access.allowed) {
    const error = new Error(access.reason || 'Lesson is locked.');
    error.statusCode = 403;
    throw error;
  }

  await startLesson(userId, lessonId);
  await incrementAttemptCount(userId, lessonId);

  const bundle = await getCodingQuestionForLesson(lesson);
  if (!bundle) throw codingNotConfiguredError();

  const { assessment, question, solution, points } = bundle;
  const visibleTests = getVisibleTests(question);
  const hiddenTests = solution?.codingSolution?.hiddenTestCases || [];
  const allTests = [
    ...visibleTests.map((test) => ({ ...test, hidden: false })),
    ...hiddenTests.map((test) => ({ ...test, hidden: true })),
  ];

  const evaluation = runCodingTests(code, allTests);
  const passingPercentage = assessment.passingPercentage ?? 100;
  const passed = evaluation.score >= passingPercentage;

  const attempt = await AssessmentAttempt.create({
    userId,
    assessmentId: assessment._id,
    contextType: 'LESSON',
    contextId: lesson._id,
    status: 'EVALUATED',
    answers: [
      {
        questionId: question._id,
        codeAnswer: {
          language: 'html-css-js',
          code: JSON.stringify(code),
        },
        isCorrect: passed,
        score: passed ? points : Math.round((evaluation.score / 100) * points),
        maxScore: points,
        executionResult: {
          passedTestCases: evaluation.passedCount,
          totalTestCases: evaluation.totalCount,
        },
        answeredAt: new Date(),
      },
    ],
    score: evaluation.score,
    maximumScore: 100,
    percentage: evaluation.score,
    passed,
    submittedAt: new Date(),
    evaluatedAt: new Date(),
  });

  let xp = emptyXpDelta();
  if (passed) {
    const completion = await completeLesson(userId, lesson);
    xp = completion.xp || xp;
  }

  return {
    attemptId: attempt._id.toString(),
    passed,
    score: evaluation.score,
    passingPercentage,
    passedCount: evaluation.passedCount,
    totalCount: evaluation.totalCount,
    hiddenTestsPassed: evaluation.results.filter((item) => item.hidden && item.passed).length,
    hiddenTestsTotal: evaluation.results.filter((item) => item.hidden).length,
    visibleResults: evaluation.results.filter((item) => !item.hidden),
    jsError: evaluation.jsError,
    lessonCompleted: passed,
    xp,
  };
}

async function listCodingAttempts(userId, lessonId) {
  const lesson = await Lesson.findOne({ _id: lessonId, type: 'CODING' });
  if (!lesson?.assessmentId) return [];

  const attempts = await AssessmentAttempt.find({
    userId,
    assessmentId: lesson.assessmentId,
    contextType: 'LESSON',
    status: { $in: ['SUBMITTED', 'EVALUATED'] },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return attempts.map((attempt) => ({
    id: attempt._id.toString(),
    score: attempt.percentage,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
  }));
}

async function repairPublishedCodingLessons() {
  const lessons = await Lesson.find({
    type: 'CODING',
    status: 'PUBLISHED',
    assessmentId: { $ne: null },
  }).select('assessmentId title');

  let repaired = 0;

  for (const lesson of lessons) {
    const assessment = await Assessment.findById(lesson.assessmentId);
    if (!assessment) continue;

    let changed = false;
    if (assessment.status !== 'PUBLISHED') {
      assessment.status = 'PUBLISHED';
      await assessment.save();
      changed = true;
    }

    const entry = [...(assessment.questions || [])].sort((a, b) => a.order - b.order)[0];
    if (entry?.questionId) {
      const question = await Question.findById(entry.questionId);
      if (question && question.status !== 'PUBLISHED') {
        question.status = 'PUBLISHED';
        await question.save();
        changed = true;
      }
    }

    if (changed) repaired += 1;
  }

  const unconfigured = await Lesson.countDocuments({
    type: 'CODING',
    status: 'PUBLISHED',
    $or: [{ assessmentId: null }, { assessmentId: { $exists: false } }],
  });

  if (repaired) {
    console.log(`Repaired publish state for ${repaired} coding lesson(s).`);
  }

  if (unconfigured) {
    console.warn(
      `Warning: ${unconfigured} published coding lesson(s) have no linked assessment. Run scripts/migrateCodingLessons.js to fix.`,
    );
  }
}

module.exports = {
  getCodingLessonPayload,
  runVisibleCodingTests,
  submitCodingAnswer,
  listCodingAttempts,
  getCodingQuestionForLesson,
  repairPublishedCodingLessons,
};
