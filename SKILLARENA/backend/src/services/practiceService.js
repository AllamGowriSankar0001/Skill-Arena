const {
  Assessment,
  AssessmentAttempt,
  Question,
  QuestionSolution,
  UserStats,
} = require('../models');
const {
  getPracticeSeriesParts,
} = require('./practiceSeriesService');
const { runCodingTests } = require('./codingTestRunner');

const QUIZ_QUESTION_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'];

function arraysEqual(left = [], right = []) {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function gradeQuizSelection(question, selected) {
  const correctIds = question.correctOptionIds?.length
    ? question.correctOptionIds
    : question.correctOptionId
      ? [question.correctOptionId]
      : [];

  if (question.type === 'MULTIPLE_CHOICE') {
    const selectedIds = Array.isArray(selected) ? selected.filter(Boolean) : [];
    return arraysEqual(correctIds, selectedIds);
  }

  const selectedId = Array.isArray(selected) ? selected[0] : selected;
  return Boolean(selectedId && correctIds.includes(selectedId));
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getStarterCodeMap(question) {
  const starter = question.codingDetails?.starterCode || [];
  return starter.reduce(
    (acc, entry) => {
      acc[entry.language.toLowerCase()] = entry.code;
      return acc;
    },
    { html: '', css: '', javascript: '' },
  );
}

function getVisibleTests(question) {
  const details = question.codingDetails || {};
  return details.visibleTestCases?.length ? details.visibleTestCases : details.sampleTestCases || [];
}

async function getPublishedPracticeAssessment(assessmentId) {
  return Assessment.findOne({
    _id: assessmentId,
    type: 'PRACTICE',
    status: 'PUBLISHED',
  });
}

async function loadAssessmentQuestions(assessment, { includeAnswers = false } = {}) {
  const orderedEntries = [...assessment.questions].sort((a, b) => a.order - b.order);
  const questionIds = orderedEntries.map((entry) => entry.questionId);
  const [questions, solutions] = await Promise.all([
    Question.find({ _id: { $in: questionIds } }),
    QuestionSolution.find({ questionId: { $in: questionIds } }),
  ]);

  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));
  const solutionMap = new Map(solutions.map((solution) => [solution.questionId.toString(), solution]));

  return orderedEntries
    .map((entry) => {
      const question = questionMap.get(entry.questionId.toString());
      if (!question) return null;
      const solution = solutionMap.get(entry.questionId.toString());
      const payload = {
        id: question._id.toString(),
        type: question.type,
        prompt: question.prompt,
        title: question.title || '',
        options: question.options,
        points: entry.points,
        order: entry.order,
        codingDetails: question.codingDetails || null,
      };
      if (includeAnswers) {
        payload.correctOptionIds = solution?.correctOptionIds || [];
        payload.correctOptionId = solution?.correctOptionIds?.[0] || null;
        payload.explanation = solution?.explanation || '';
        payload.solution = solution;
      }
      return payload;
    })
    .filter(Boolean);
}

function formatQuizQuestions(questions, assessment) {
  let formatted = questions.filter((question) => QUIZ_QUESTION_TYPES.includes(question.type));

  if (assessment.shuffleQuestions) {
    formatted = shuffleArray(formatted);
  }

  return formatted.map((question, index) => {
    let options = question.options || [];
    if (assessment.shuffleOptions) {
      options = shuffleArray(options);
    }
    return {
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options,
      points: question.points,
      order: index + 1,
    };
  });
}

async function getUserAttemptSummary(userId, assessmentId) {
  const attempts = await AssessmentAttempt.find({
    userId,
    assessmentId,
    contextType: 'PRACTICE',
    status: { $in: ['SUBMITTED', 'EVALUATED'] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const best = attempts.reduce(
    (top, attempt) => (attempt.percentage > (top?.percentage || 0) ? attempt : top),
    null,
  );

  return {
    attemptCount: attempts.length,
    bestScore: best?.percentage ?? null,
    passed: Boolean(best?.passed),
    lastAttemptAt: attempts[0]?.submittedAt || null,
  };
}

async function listPracticeForUser(userId) {
  const assessments = await Assessment.find({
    type: 'PRACTICE',
    status: 'PUBLISHED',
  })
    .populate('skillId', 'name slug')
    .sort({ updatedAt: -1 })
    .lean();

  const summaries = userId
    ? await Promise.all(
        assessments.map((assessment) => getUserAttemptSummary(userId, assessment._id)),
      )
    : [];

  return assessments.map((assessment, index) => ({
    id: assessment._id.toString(),
    title: assessment.title,
    description: assessment.description || '',
    difficulty: assessment.difficulty,
    mode: assessment.mode,
    xpReward: assessment.xpReward,
    passingPercentage: assessment.passingPercentage ?? 70,
    durationSeconds: assessment.durationSeconds || null,
    questionCount: assessment.questions?.length || 0,
    skillId: assessment.skillId?._id?.toString() || null,
    skillName: assessment.skillId?.name || null,
    skillSlug: assessment.skillId?.slug || null,
    seriesPart: assessment.seriesPart || 1,
    seriesBaseTitle: assessment.seriesBaseTitle || null,
    seriesRootId: assessment.seriesRootId?.toString() || null,
    ...(summaries[index] || {}),
  }));
}

async function getPracticeDetail(userId, assessmentId) {
  const assessment = await getPublishedPracticeAssessment(assessmentId);
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  await assessment.populate('skillId', 'name slug');
  const questions = await loadAssessmentQuestions(assessment);
  const mcqCount = questions.filter((question) => QUIZ_QUESTION_TYPES.includes(question.type)).length;
  const codingCount = questions.filter((question) => question.type === 'CODING').length;
  const summary = userId ? await getUserAttemptSummary(userId, assessment._id) : null;

  const sessionType =
    assessment.mode === 'CODING' || (assessment.mode === 'MIXED' && codingCount && !mcqCount)
      ? 'CODING'
      : 'QUIZ';

  const seriesParts = await getPracticeSeriesParts(assessment, { publishedOnly: true });

  return {
    id: assessment._id.toString(),
    title: assessment.title,
    description: assessment.description || '',
    difficulty: assessment.difficulty,
    mode: assessment.mode,
    sessionType,
    xpReward: assessment.xpReward,
    passingPercentage: assessment.passingPercentage ?? (sessionType === 'CODING' ? 100 : 70),
    durationSeconds: assessment.durationSeconds || null,
    attemptsAllowed: assessment.attemptsAllowed || null,
    questionCount: questions.length,
    mcqCount,
    codingCount,
    skillId: assessment.skillId?._id?.toString() || null,
    skillName: assessment.skillId?.name || null,
    skillSlug: assessment.skillId?.slug || null,
    seriesPart: assessment.seriesPart || 1,
    seriesBaseTitle: assessment.seriesBaseTitle || null,
    seriesRootId: assessment.seriesRootId?.toString() || null,
    seriesParts: seriesParts.length > 1 ? seriesParts : [],
    ...(summary || { attemptCount: 0, bestScore: null, passed: false, lastAttemptAt: null }),
  };
}

async function getPracticeQuizPayload(userId, assessmentId) {
  const assessment = await getPublishedPracticeAssessment(assessmentId);
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  const questions = await loadAssessmentQuestions(assessment, { includeAnswers: false });
  const quizQuestions = formatQuizQuestions(questions, assessment);
  if (!quizQuestions.length) {
    throw new Error('This practice set has no quiz questions yet.');
  }

  return {
    id: assessment._id.toString(),
    title: assessment.title,
    description: assessment.description || '',
    passingPercentage: assessment.passingPercentage ?? 70,
    xpReward: assessment.xpReward,
    durationSeconds: assessment.durationSeconds || null,
    attemptsAllowed: assessment.attemptsAllowed || null,
    questions: quizQuestions,
  };
}

async function assertAttemptsAllowed(userId, assessment) {
  if (!assessment.attemptsAllowed) return;

  const attemptCount = await AssessmentAttempt.countDocuments({
    userId,
    assessmentId: assessment._id,
    contextType: 'PRACTICE',
    status: { $in: ['SUBMITTED', 'EVALUATED'] },
  });

  if (attemptCount >= assessment.attemptsAllowed) {
    const error = new Error('You have reached the maximum number of attempts for this practice set.');
    error.statusCode = 403;
    throw error;
  }
}

async function submitPracticeQuiz(userId, assessmentId, answers) {
  const assessment = await getPublishedPracticeAssessment(assessmentId);
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  await assertAttemptsAllowed(userId, assessment);

  const questions = await loadAssessmentQuestions(assessment, { includeAnswers: true });
  const quizQuestions = questions.filter((question) => QUIZ_QUESTION_TYPES.includes(question.type));
  const answerMap = answers || {};

  let correctCount = 0;
  let maxScore = 0;
  let earnedScore = 0;

  const gradedAnswers = quizQuestions.map((question) => {
    const selected = answerMap[question.id] ?? null;
    const isCorrect = gradeQuizSelection(question, selected);
    if (isCorrect) correctCount += 1;
    maxScore += question.points;
    earnedScore += isCorrect ? question.points : 0;

    const selectedOptionIds = Array.isArray(selected)
      ? selected.filter(Boolean)
      : selected
        ? [selected]
        : [];

    return {
      questionId: question.id,
      selectedOptionIds,
      isCorrect,
      score: isCorrect ? question.points : 0,
      maxScore: question.points,
      answeredAt: new Date(),
    };
  });

  const percentage = quizQuestions.length
    ? Math.round((correctCount / quizQuestions.length) * 100)
    : 0;
  const passingPercentage = assessment.passingPercentage ?? 70;
  const passed = percentage >= passingPercentage;

  const attempt = await AssessmentAttempt.create({
    userId,
    assessmentId: assessment._id,
    contextType: 'PRACTICE',
    contextId: assessment._id,
    status: 'EVALUATED',
    answers: gradedAnswers,
    correctAnswerCount: correctCount,
    wrongAnswerCount: quizQuestions.length - correctCount,
    score: earnedScore,
    maximumScore: maxScore,
    percentage,
    passed,
    submittedAt: new Date(),
    evaluatedAt: new Date(),
  });

  let xp = emptyXpDelta();
  if (passed) {
    const stats = await UserStats.findOne({ userId });
    if (stats) {
      stats.practiceSessionsCompleted += 1;
      await stats.save();
    }

    if (assessment.xpReward > 0) {
      const award = await awardXp({
        userId,
        sourceType: 'PRACTICE',
        sourceId: assessment._id.toString(),
        amount: assessment.xpReward,
        description: `Completed practice: ${assessment.title}`,
      });
      xp = award.delta;
    }
  }

  const explanations = gradedAnswers.map((answer) => {
    const question = quizQuestions.find((item) => item.id === String(answer.questionId));
    return {
      questionId: answer.questionId,
      explanation: passed ? question?.explanation || '' : '',
      isCorrect: answer.isCorrect,
    };
  });

  return {
    attemptId: attempt._id.toString(),
    passed,
    score: percentage,
    passingPercentage,
    correctCount,
    totalQuestions: quizQuestions.length,
    earnedScore,
    maxScore,
    explanations,
    xp,
  };
}

async function listPracticeQuizAttempts(userId, assessmentId) {
  const assessment = await getPublishedPracticeAssessment(assessmentId);
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  const attempts = await AssessmentAttempt.find({
    userId,
    assessmentId: assessment._id,
    contextType: 'PRACTICE',
    status: { $in: ['SUBMITTED', 'EVALUATED'] },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const best = attempts.reduce(
    (top, attempt) => (attempt.percentage > (top?.percentage || 0) ? attempt : top),
    null,
  );

  return {
    attempts: attempts.map((attempt) => ({
      id: attempt._id.toString(),
      score: attempt.percentage,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
    })),
    bestScore: best?.percentage ?? 0,
    passed: Boolean(best?.passed),
  };
}

async function getCodingQuestionForAssessment(assessment) {
  const orderedEntries = [...assessment.questions].sort((a, b) => a.order - b.order);
  const questionIds = orderedEntries.map((entry) => entry.questionId);
  const questions = await Question.find({ _id: { $in: questionIds }, type: 'CODING' });
  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));

  const entry = orderedEntries.find((item) => questionMap.has(item.questionId.toString()));
  if (!entry) return null;

  const question = questionMap.get(entry.questionId.toString());
  const solution = await QuestionSolution.findOne({ questionId: question._id });
  return { question, solution, points: entry.points };
}

async function getPracticeCodingPayload(userId, assessmentId) {
  const assessment = await getPublishedPracticeAssessment(assessmentId);
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  const bundle = await getCodingQuestionForAssessment(assessment);
  if (!bundle) {
    throw new Error('This practice set has no coding challenge yet.');
  }

  const { question } = bundle;
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
    assessmentId: assessment._id.toString(),
    questionId: question._id.toString(),
    title: question.title || question.prompt,
    prompt: question.prompt,
    instructions: question.codingDetails?.instructions || '',
    expectedOutputDescription: question.codingDetails?.expectedOutputDescription || '',
    hints: question.codingDetails?.hints || [],
    passingPercentage: assessment.passingPercentage ?? 100,
    xpReward: assessment.xpReward,
    attemptsAllowed: assessment.attemptsAllowed || null,
    starterCode: starter,
    visibleTestCases: visibleTests,
    hintCount: (question.codingDetails?.hints || []).length,
  };
}

async function runPracticeCodingTests(userId, assessmentId, code) {
  const assessment = await getPublishedPracticeAssessment(assessmentId);
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  const bundle = await getCodingQuestionForAssessment(assessment);
  if (!bundle) {
    throw new Error('Coding challenge not configured.');
  }

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

async function submitPracticeCoding(userId, assessmentId, code) {
  const assessment = await getPublishedPracticeAssessment(assessmentId);
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  await assertAttemptsAllowed(userId, assessment);

  const bundle = await getCodingQuestionForAssessment(assessment);
  if (!bundle) {
    throw new Error('Coding challenge not configured.');
  }

  const { question, solution, points } = bundle;
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
    contextType: 'PRACTICE',
    contextId: assessment._id,
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
    const stats = await UserStats.findOne({ userId });
    if (stats) {
      stats.practiceSessionsCompleted += 1;
      await stats.save();
    }

    if (assessment.xpReward > 0) {
      const award = await awardXp({
        userId,
        sourceType: 'PRACTICE',
        sourceId: assessment._id.toString(),
        amount: assessment.xpReward,
        description: `Completed practice: ${assessment.title}`,
      });
      xp = award.delta;
    }
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
    xp,
  };
}

async function listPracticeCodingAttempts(userId, assessmentId) {
  const assessment = await getPublishedPracticeAssessment(assessmentId);
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  const attempts = await AssessmentAttempt.find({
    userId,
    assessmentId: assessment._id,
    contextType: 'PRACTICE',
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

module.exports = {
  listPracticeForUser,
  getPracticeDetail,
  getPracticeQuizPayload,
  submitPracticeQuiz,
  listPracticeQuizAttempts,
  getPracticeCodingPayload,
  runPracticeCodingTests,
  submitPracticeCoding,
  listPracticeCodingAttempts,
};
