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

async function getQuizQuestionsForLesson(lesson, { includeAnswers = false } = {}) {
  if (!lesson.assessmentId) return null;

  const assessment = await Assessment.findOne({
    _id: lesson.assessmentId,
    status: 'PUBLISHED',
  });
  if (!assessment) return null;

  const orderedEntries = [...assessment.questions].sort((a, b) => a.order - b.order);
  const questionIds = orderedEntries.map((entry) => entry.questionId);
  const [questions, solutions] = await Promise.all([
    Question.find({ _id: { $in: questionIds } }),
    QuestionSolution.find({ questionId: { $in: questionIds } }),
  ]);

  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));
  const solutionMap = new Map(solutions.map((s) => [s.questionId.toString(), s]));

  const formattedQuestions = orderedEntries
    .map((entry) => {
      const question = questionMap.get(entry.questionId.toString());
      if (!question) return null;
      const solution = solutionMap.get(entry.questionId.toString());
      const payload = {
        id: question._id.toString(),
        prompt: question.prompt,
        options: question.options,
        points: entry.points,
        order: entry.order,
      };
      if (includeAnswers) {
        payload.correctOptionId = solution?.correctOptionIds?.[0] || null;
        payload.explanation = solution?.explanation || '';
      }
      return payload;
    })
    .filter(Boolean);

  return {
    assessment,
    questions: formattedQuestions,
  };
}

async function getPublicQuizPayload(lesson) {
  const bundle = await getQuizQuestionsForLesson(lesson, { includeAnswers: false });
  if (!bundle) return null;

  return {
    id: bundle.assessment._id.toString(),
    title: bundle.assessment.title,
    description: bundle.assessment.description || '',
    passingPercentage: bundle.assessment.passingPercentage ?? 70,
    xpReward: bundle.assessment.xpReward,
    questions: bundle.questions,
  };
}

async function submitQuiz(userId, lessonId, answers, { isAdmin = false } = {}) {
  const lesson = await Lesson.findOne({ _id: lessonId, status: 'PUBLISHED', type: 'QUIZ' });
  if (!lesson) throw new Error('Quiz lesson not found.');

  const access = await canAccessLesson(userId, lesson, { isAdmin });
  if (!access.allowed) {
    const error = new Error(access.reason || 'Lesson is locked.');
    error.statusCode = 403;
    throw error;
  }

  await startLesson(userId, lessonId);
  await incrementAttemptCount(userId, lessonId);

  const bundle = await getQuizQuestionsForLesson(lesson, { includeAnswers: true });
  if (!bundle) throw new Error('Quiz not configured for this lesson.');

  const { assessment, questions } = bundle;
  const answerMap = answers || {};

  let correctCount = 0;
  let maxScore = 0;
  let earnedScore = 0;

  const gradedAnswers = questions.map((question) => {
    const selected = answerMap[question.id] || null;
    const isCorrect = selected && selected === question.correctOptionId;
    if (isCorrect) correctCount += 1;
    maxScore += question.points;
    earnedScore += isCorrect ? question.points : 0;

    return {
      questionId: question.id,
      selectedOptionIds: selected ? [selected] : [],
      isCorrect,
      score: isCorrect ? question.points : 0,
      maxScore: question.points,
      answeredAt: new Date(),
    };
  });

  const percentage = questions.length
    ? Math.round((correctCount / questions.length) * 100)
    : 0;
  const passingPercentage = assessment.passingPercentage ?? 70;
  const passed = percentage >= passingPercentage;

  const attempt = await AssessmentAttempt.create({
    userId,
    assessmentId: assessment._id,
    contextType: 'LESSON',
    contextId: lesson._id,
    status: 'EVALUATED',
    answers: gradedAnswers,
    correctAnswerCount: correctCount,
    wrongAnswerCount: questions.length - correctCount,
    score: earnedScore,
    maximumScore: maxScore,
    percentage,
    passed,
    submittedAt: new Date(),
    evaluatedAt: new Date(),
  });

  let xp = emptyXpDelta();
  if (passed) {
    const completion = await completeLesson(userId, lesson);
    xp = completion.xp || xp;
  }

  const explanations = passed
    ? gradedAnswers.map((answer) => {
        const question = questions.find((q) => q.id === String(answer.questionId));
        return {
          questionId: answer.questionId,
          explanation: question?.explanation || '',
          isCorrect: answer.isCorrect,
        };
      })
    : [];

  return {
    attemptId: attempt._id.toString(),
    passed,
    score: percentage,
    passingPercentage,
    correctCount,
    totalQuestions: questions.length,
    earnedScore,
    maxScore,
    explanations,
    lessonCompleted: passed,
    xp,
  };
}

async function listQuizAttempts(userId, lessonId) {
  const lesson = await Lesson.findOne({ _id: lessonId, type: 'QUIZ' });
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

module.exports = {
  getPublicQuizPayload,
  getQuizQuestionsForLesson,
  submitQuiz,
  listQuizAttempts,
};
