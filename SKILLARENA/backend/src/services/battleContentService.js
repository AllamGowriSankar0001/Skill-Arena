const crypto = require('crypto');
const {
  Assessment,
  Question,
  QuestionSolution,
  Skill,
} = require('../models');
const {
  generateBattleQuizQuestions,
  generateBattleCodingChallenge,
  resolveQuestionDifficulty,
} = require('./battleAiService');
const {
  BATTLE_QUESTION_COUNT,
  BATTLE_DURATION_SECONDS,
  CODING_DURATION_SECONDS,
} = require('../constants/battleConstants');

const CODING_LANGUAGES = ['html', 'css', 'javascript'];

function generateBattleCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function buildStarterCode(payload) {
  const entries = [
    { language: 'html', code: payload.htmlStarter || '' },
    { language: 'css', code: payload.cssStarter || '' },
    { language: 'javascript', code: payload.javascriptStarter || '' },
  ];
  return entries.filter((entry) => entry.code.trim());
}

function buildReferenceSolutions(payload) {
  return CODING_LANGUAGES.map((language) => ({
    language,
    code: payload[`reference${language.charAt(0).toUpperCase()}${language.slice(1)}`] || '',
  })).filter((entry) => entry.code.trim());
}

async function persistQuizBattleContent({ skill, difficulty, creatorId, userId }) {
  const questionDefs = await generateBattleQuizQuestions({
    skillName: skill.name,
    difficulty,
    userId,
    questionCount: BATTLE_QUESTION_COUNT,
  });

  const questionDifficulty = resolveQuestionDifficulty(difficulty);
  const assessmentQuestions = [];

  for (let index = 0; index < questionDefs.length; index += 1) {
    const def = questionDefs[index];
    const options = def.options.map((text, optIndex) => ({
      optionId: `opt-${optIndex + 1}`,
      text,
    }));
    const correctIndex = def.correctIndex >= 0 ? def.correctIndex : 0;

    const question = await Question.create({
      type: 'SINGLE_CHOICE',
      skillId: skill._id,
      difficulty: questionDifficulty,
      prompt: def.prompt,
      options,
      status: 'PUBLISHED',
      createdBy: creatorId,
      tags: ['battle', 'ai-generated'],
    });

    await QuestionSolution.create({
      questionId: question._id,
      correctOptionIds: [options[correctIndex].optionId],
      explanation: def.explanation || '',
    });

    assessmentQuestions.push({
      questionId: question._id,
      order: index,
      points: 10,
    });
  }

  const durationSeconds = BATTLE_DURATION_SECONDS[difficulty] || BATTLE_DURATION_SECONDS.MIXED;

  const assessment = await Assessment.create({
    title: `${skill.name} Battle Quiz`,
    description: `Timed ${difficulty.toLowerCase()} duel — ${questionDefs.length} industry questions`,
    type: 'BATTLE',
    mode: 'QUIZ',
    skillId: skill._id,
    difficulty,
    questions: assessmentQuestions,
    durationSeconds,
    passingPercentage: 0,
    shuffleQuestions: false,
    shuffleOptions: false,
    xpReward: 0,
    status: 'PUBLISHED',
    createdBy: creatorId,
  });

  return assessment;
}

async function persistCodingBattleContent({ skill, difficulty, creatorId, userId }) {
  const challenge = await generateBattleCodingChallenge({
    skillName: skill.name,
    difficulty,
    userId,
  });

  const questionDifficulty = resolveQuestionDifficulty(difficulty);
  const visibleTestCases = challenge.visibleTestCases || [];
  const hiddenTestCases = challenge.hiddenTestCases || [];
  const starterCode = buildStarterCode(challenge);

  const question = await Question.create({
    type: 'CODING',
    skillId: skill._id,
    difficulty: questionDifficulty,
    title: challenge.problemTitle || `${skill.name} Challenge`,
    prompt: challenge.problemStatement,
    codingDetails: {
      supportedLanguages: CODING_LANGUAGES,
      starterCode,
      instructions: challenge.instructions || '',
      expectedOutputDescription: challenge.expectedOutputDescription || '',
      hints: challenge.hints || [],
      visibleTestCases,
      sampleTestCases: visibleTestCases,
    },
    status: 'PUBLISHED',
    createdBy: creatorId,
    tags: ['battle', 'ai-generated'],
  });

  await QuestionSolution.create({
    questionId: question._id,
    explanation: challenge.solutionExplanation || '',
    codingSolution: {
      referenceSolutions: buildReferenceSolutions(challenge),
      hiddenTestCases,
    },
  });

  const durationSeconds = CODING_DURATION_SECONDS[difficulty] || CODING_DURATION_SECONDS.MIXED;

  const assessment = await Assessment.create({
    title: `${skill.name} Coding Battle`,
    description: `Timed ${difficulty.toLowerCase()} coding duel`,
    type: 'BATTLE',
    mode: 'CODING',
    skillId: skill._id,
    difficulty,
    questions: [{ questionId: question._id, order: 0, points: 100 }],
    durationSeconds,
    passingPercentage: 100,
    shuffleQuestions: false,
    shuffleOptions: false,
    xpReward: 0,
    status: 'PUBLISHED',
    createdBy: creatorId,
  });

  return assessment;
}

async function generateBattleAssessment({ skillId, mode, difficulty, creatorId, userId }) {
  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Skill not found.');
  }

  if (mode === 'CODING') {
    return persistCodingBattleContent({ skill, difficulty, creatorId, userId });
  }

  return persistQuizBattleContent({ skill, difficulty, creatorId, userId });
}

module.exports = {
  generateBattleCode,
  generateBattleAssessment,
};
