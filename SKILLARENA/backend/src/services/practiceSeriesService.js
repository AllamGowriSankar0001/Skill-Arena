const Assessment = require('../models/Assessment');
const Question = require('../models/Question');
const {
  parsePracticeSeriesTitle,
  normalizeSeriesBaseTitle,
  getAssessmentSeriesPart,
  getAssessmentSeriesBaseTitle,
} = require('../utils/practiceSeries');

async function findPracticeSeriesMembers(baseTitle, { excludeId } = {}) {
  const normalized = normalizeSeriesBaseTitle(baseTitle);
  const query = { type: 'PRACTICE' };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const assessments = await Assessment.find(query).lean();

  return assessments
    .filter((assessment) => {
      const memberBase = normalizeSeriesBaseTitle(getAssessmentSeriesBaseTitle(assessment));
      return memberBase === normalized;
    })
    .sort((left, right) => getAssessmentSeriesPart(left) - getAssessmentSeriesPart(right));
}

async function collectQuestionPromptsFromAssessments(assessments) {
  const questionIds = assessments.flatMap((assessment) =>
    (assessment.questions || []).map((entry) => entry.questionId),
  );

  if (!questionIds.length) return [];

  const questions = await Question.find({ _id: { $in: questionIds } })
    .select('prompt title type')
    .lean();

  return questions
    .map((question) => String(question.prompt || question.title || '').trim())
    .filter(Boolean);
}

async function resolvePracticeSeriesForCreate(title, { excludeAssessmentId } = {}) {
  const parsed = parsePracticeSeriesTitle(title);
  const members = await findPracticeSeriesMembers(parsed.baseTitle, {
    excludeId: excludeAssessmentId,
  });

  if (!members.length) {
    return {
      baseTitle: parsed.baseTitle,
      seriesPart: parsed.seriesPart,
      seriesRootId: null,
      isContinuation: parsed.isContinuation,
      priorQuestionPrompts: [],
      rootAssessment: null,
      seriesParts: [],
    };
  }

  const root =
    members.find((member) => getAssessmentSeriesPart(member) === 1) || members[0];
  const rootId = root.seriesRootId?.toString() || root._id.toString();

  const priorParts = members.filter(
    (member) => getAssessmentSeriesPart(member) < parsed.seriesPart,
  );
  const priorQuestionPrompts = await collectQuestionPromptsFromAssessments(priorParts);

  return {
    baseTitle: parsed.baseTitle,
    seriesPart: parsed.seriesPart,
    seriesRootId: rootId,
    isContinuation: true,
    priorQuestionPrompts,
    rootAssessment: root,
    seriesParts: members,
  };
}

async function applyPracticeSeriesToAssessment(assessment, seriesContext) {
  assessment.seriesBaseTitle = seriesContext.baseTitle;
  assessment.seriesPart = seriesContext.seriesPart;

  if (seriesContext.seriesRootId) {
    assessment.seriesRootId = seriesContext.seriesRootId;
  } else {
    assessment.seriesRootId = assessment._id;
  }

  if (seriesContext.rootAssessment) {
    if (!assessment.skillId && seriesContext.rootAssessment.skillId) {
      assessment.skillId = seriesContext.rootAssessment.skillId;
    }
    if (seriesContext.isContinuation) {
      assessment.mode = seriesContext.rootAssessment.mode || assessment.mode;
      if (!assessment.difficulty || assessment.difficulty === 'MIXED') {
        assessment.difficulty = seriesContext.rootAssessment.difficulty || assessment.difficulty;
      }
    }

    const rootId = seriesContext.rootAssessment._id;
    if (!seriesContext.rootAssessment.seriesRootId) {
      await Assessment.findByIdAndUpdate(rootId, {
        seriesRootId: rootId,
        seriesBaseTitle: seriesContext.baseTitle,
        seriesPart: getAssessmentSeriesPart(seriesContext.rootAssessment) || 1,
      });
    }
  }

  await assessment.save();
}

async function getPracticeSeriesParts(assessment, { publishedOnly = false } = {}) {
  const rootId = assessment.seriesRootId || assessment._id;
  const query = {
    type: 'PRACTICE',
    $or: [{ seriesRootId: rootId }, { _id: rootId }],
  };
  if (publishedOnly) {
    query.status = 'PUBLISHED';
  }

  const parts = await Assessment.find(query)
    .sort({ seriesPart: 1, createdAt: 1 })
    .select('title seriesPart status _id')
    .lean();

  return parts.map((part) => ({
    id: part._id.toString(),
    title: part.title,
    seriesPart: part.seriesPart || getAssessmentSeriesPart(part),
    status: part.status,
  }));
}

module.exports = {
  resolvePracticeSeriesForCreate,
  applyPracticeSeriesToAssessment,
  getPracticeSeriesParts,
  collectQuestionPromptsFromAssessments,
  findPracticeSeriesMembers,
};
