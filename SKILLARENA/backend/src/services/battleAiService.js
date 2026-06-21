const { generatePracticeQuizQuestions, generatePracticeCodingChallenge } = require('./practiceAiService');
const { BATTLE_QUESTION_COUNT } = require('../constants/battleConstants');

function resolveQuestionDifficulty(difficulty) {
  if (['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) return difficulty;
  return 'MEDIUM';
}

function buildBattleQuizPlan({ skillName, difficulty, questionCount }) {
  const resolvedDifficulty = difficulty === 'MIXED' ? 'MEDIUM' : difficulty;
  return {
    title: `${skillName} Arena Duel`,
    skillName,
    difficulty: resolvedDifficulty,
    mode: 'QUIZ',
    questionType: 'SINGLE_CHOICE',
    questionCount: questionCount || BATTLE_QUESTION_COUNT,
    questionFocus: `Create industry-style ${skillName} interview questions at ${resolvedDifficulty} difficulty.
Topics: core concepts, practical scenarios, best practices, debugging, and real-world application.
Questions must be clear, professional, and suitable for a timed competitive match between learners.`,
  };
}

function buildBattleCodingPlan({ skillName, difficulty }) {
  const resolvedDifficulty = difficulty === 'MIXED' ? 'MEDIUM' : difficulty;
  return {
    title: `${skillName} Coding Duel`,
    skillName,
    difficulty: resolvedDifficulty,
    mode: 'CODING',
    questionCount: 1,
    questionFocus: `Create one ${resolvedDifficulty}-level ${skillName} coding challenge suitable for a timed 1v1 or team battle.
Use HTML/CSS/JavaScript when web skills apply; otherwise focus on practical ${skillName} problem solving.
The challenge should be completable within a competitive time limit and test job-relevant skills.`,
  };
}

async function generateBattleQuizQuestions({ skillName, difficulty, userId, questionCount }) {
  const plan = buildBattleQuizPlan({ skillName, difficulty, questionCount });
  return generatePracticeQuizQuestions(plan, userId);
}

async function generateBattleCodingChallenge({ skillName, difficulty, userId }) {
  const plan = buildBattleCodingPlan({ skillName, difficulty });
  return generatePracticeCodingChallenge(plan, userId);
}

module.exports = {
  resolveQuestionDifficulty,
  generateBattleQuizQuestions,
  generateBattleCodingChallenge,
};
