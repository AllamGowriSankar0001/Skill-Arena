const {
  Battle,
  Assessment,
  AssessmentAttempt,
  Question,
  QuestionSolution,
  User,
  Skill,
} = require('../models');
const { awardXp } = require('./xpService');
const { getUserStats } = require('./userStatsService');
const { runCodingTests } = require('./codingTestRunner');
const { startBattleIfReady, prepareBattleContent } = require('./matchmakingService');
const { BATTLE_XP } = require('../constants/battleConstants');

function getVisibleTests(question) {
  const details = question.codingDetails || {};
  return details.visibleTestCases?.length ? details.visibleTestCases : details.sampleTestCases || [];
}

function getCompletionTimeMs(participant, battleStartedAt) {
  if (!participant?.completedAt) return Number.POSITIVE_INFINITY;
  if (battleStartedAt) {
    return participant.completedAt.getTime() - battleStartedAt.getTime();
  }
  return participant.completedAt.getTime();
}

function pickWinnerByTime(playerA, playerB, battleStartedAt) {
  const timeA = getCompletionTimeMs(playerA, battleStartedAt);
  const timeB = getCompletionTimeMs(playerB, battleStartedAt);
  if (timeA < timeB) return playerA;
  if (timeB < timeA) return playerB;
  return null;
}

const QUIZ_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'];

function arraysEqual(left = [], right = []) {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function gradeQuizSelection(question, solution, selected) {
  const correctIds = solution?.correctOptionIds?.length
    ? solution.correctOptionIds
    : [];

  if (question.type === 'MULTIPLE_CHOICE') {
    const selectedIds = Array.isArray(selected) ? selected.filter(Boolean) : [];
    return arraysEqual(correctIds, selectedIds);
  }

  const selectedId = Array.isArray(selected) ? selected[0] : selected;
  return Boolean(selectedId && correctIds.includes(selectedId));
}

async function loadBattleAssessment(assessmentId) {
  return Assessment.findOne({ _id: assessmentId, type: 'BATTLE' });
}

async function loadQuestionsForAssessment(assessment) {
  const ordered = [...assessment.questions].sort((a, b) => a.order - b.order);
  const questionIds = ordered.map((entry) => entry.questionId);
  const [questions, solutions] = await Promise.all([
    Question.find({ _id: { $in: questionIds } }),
    QuestionSolution.find({ questionId: { $in: questionIds } }),
  ]);

  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));
  const solutionMap = new Map(solutions.map((s) => [s.questionId.toString(), s]));

  return ordered
    .map((entry) => {
      const question = questionMap.get(entry.questionId.toString());
      if (!question) return null;
      return {
        entry,
        question,
        solution: solutionMap.get(entry.questionId.toString()),
      };
    })
    .filter(Boolean);
}

function serializeTimer(timer) {
  return {
    ...timer,
    endsAt: timer.endsAt ? new Date(timer.endsAt).toISOString() : null,
  };
}

function getTimerInfo(battle, assessment) {
  if (!battle.startedAt || !assessment?.durationSeconds) {
    return { remainingSeconds: null, expired: false, endsAt: null };
  }

  const endsAt = new Date(battle.startedAt.getTime() + assessment.durationSeconds * 1000);
  const remainingMs = Math.max(0, endsAt.getTime() - Date.now());

  return {
    endsAt,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    expired: remainingMs <= 0,
    durationSeconds: assessment.durationSeconds,
  };
}

async function formatParticipants(participants, currentUserId, battleStartedAt) {
  const userIds = participants.map((participant) => participant.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('name').lean();
  const nameMap = new Map(users.map((user) => [user._id.toString(), user.name]));

  return participants.map((participant) => {
    const timeTakenSeconds =
      participant.completedAt && battleStartedAt
        ? Math.max(
            0,
            Math.round((participant.completedAt.getTime() - battleStartedAt.getTime()) / 1000),
          )
        : null;

    return {
      userId: participant.userId.toString(),
      name: nameMap.get(participant.userId.toString()) || 'Player',
      team: participant.team,
      status: participant.status,
      score: participant.score,
      correctAnswers: participant.correctAnswers,
      wrongAnswers: participant.wrongAnswers,
      isYou: participant.userId.toString() === currentUserId.toString(),
      submitted: Boolean(participant.completedAt),
      timeTakenSeconds,
    };
  });
}

async function getBattleForUser(battleId, userId) {
  let battle = await Battle.findById(battleId).populate('skillId', 'name slug');
  if (!battle) throw new Error('Battle not found.');

  const isParticipant = battle.participants.some(
    (participant) => participant.userId.toString() === userId.toString(),
  );
  if (!isParticipant) {
    throw new Error('You are not part of this battle.');
  }

  if (battle.status === 'MATCHED' && !battle.assessmentId) {
    await prepareBattleContent(battle._id);
    battle = await Battle.findById(battleId).populate('skillId', 'name slug');
  }

  if (['MATCHED', 'STARTING'].includes(battle.status)) {
    await startBattleIfReady(battle._id);
    battle = await Battle.findById(battleId).populate('skillId', 'name slug');
  }

  if (battle.status === 'IN_PROGRESS') {
    const assessmentForTimer = battle.assessmentId
      ? await loadBattleAssessment(battle.assessmentId)
      : null;
    const timer = getTimerInfo(battle, assessmentForTimer);
    if (timer.expired) {
      await finalizeBattleIfNeeded(battle._id);
      battle = await Battle.findById(battleId).populate('skillId', 'name slug');
    }
  }

  const assessment = battle.assessmentId ? await loadBattleAssessment(battle.assessmentId) : null;
  const timer = getTimerInfo(battle, assessment);
  const participants = await formatParticipants(battle.participants, userId, battle.startedAt);

  const countdownSeconds =
    battle.status === 'STARTING' && battle.scheduledAt
      ? Math.max(0, Math.ceil((battle.scheduledAt.getTime() - Date.now()) / 1000))
      : 0;

  return {
    id: battle._id.toString(),
    battleCode: battle.battleCode,
    format: battle.format,
    mode: battle.mode,
    matchType: battle.matchType,
    difficulty: battle.difficulty,
    status: battle.status,
    skill: battle.skillId
      ? { id: battle.skillId._id.toString(), name: battle.skillId.name }
      : null,
    maximumPlayers: battle.maximumPlayers,
    participantCount: battle.participants.length,
    participants,
    assessmentId: battle.assessmentId?.toString() || null,
    timer: serializeTimer(timer),
    countdownSeconds,
    startedAt: battle.startedAt,
    endedAt: battle.endedAt,
    winnerType: battle.winnerType,
    winnerTeam: battle.winnerTeam,
    winnerUserId: battle.winnerUserId?.toString() || null,
    isHost: battle.createdBy.toString() === userId.toString(),
  };
}

async function getBattleQuizPayload(battleId, userId) {
  const battle = await Battle.findById(battleId);
  if (!battle) throw new Error('Battle not found.');

  const isParticipant = battle.participants.some(
    (participant) => participant.userId.toString() === userId.toString(),
  );
  if (!isParticipant) throw new Error('You are not part of this battle.');
  if (battle.status !== 'IN_PROGRESS') {
    throw new Error('Battle has not started yet.');
  }

  const assessment = await loadBattleAssessment(battle.assessmentId);
  if (!assessment) throw new Error('Battle questions are not ready.');

  const timer = getTimerInfo(battle, assessment);
  const participant = battle.participants.find(
    (entry) => entry.userId.toString() === userId.toString(),
  );
  if (timer.expired && participant?.completedAt) {
    throw new Error('Time is up for this battle.');
  }

  if (assessment.mode === 'CODING') {
    const items = await loadQuestionsForAssessment(assessment);
    const coding = items[0];
    if (!coding) throw new Error('Coding challenge not found.');

    return {
      mode: 'CODING',
      assessmentId: assessment._id.toString(),
      durationSeconds: assessment.durationSeconds,
      timer: serializeTimer(timer),
      challenge: {
        id: coding.question._id.toString(),
        title: coding.question.title || assessment.title,
        prompt: coding.question.prompt,
        instructions: coding.question.codingDetails?.instructions || '',
        starterCode: (coding.question.codingDetails?.starterCode || []).reduce(
          (acc, entry) => {
            acc[entry.language.toLowerCase()] = entry.code;
            return acc;
          },
          { html: '', css: '', javascript: '' },
        ),
        visibleTestCases: coding.question.codingDetails?.visibleTestCases || [],
        hints: coding.question.codingDetails?.hints || [],
      },
    };
  }

  const items = await loadQuestionsForAssessment(assessment);
  const questions = items
    .filter(({ question }) => QUIZ_TYPES.includes(question.type))
    .map(({ question, entry }, index) => ({
      id: question._id.toString(),
      type: question.type,
      prompt: question.prompt,
      options: question.options,
      points: entry.points,
      order: index + 1,
    }));

  return {
    mode: 'QUIZ',
    assessmentId: assessment._id.toString(),
    durationSeconds: assessment.durationSeconds,
    timer: serializeTimer(timer),
    questions,
  };
}

async function finalizeBattleIfNeeded(battleId) {
  const battle = await Battle.findById(battleId);
  if (!battle || battle.status === 'COMPLETED') return battle;

  const allDone = battle.participants.every(
    (participant) => participant.status === 'COMPLETED' || participant.status === 'LEFT',
  );

  const assessment = battle.assessmentId ? await loadBattleAssessment(battle.assessmentId) : null;
  const timer = getTimerInfo(battle, assessment);
  const timeUp = timer.expired;

  if (!allDone && !timeUp) return battle;

  if (battle.format === 'ONE_V_ONE') {
    const [playerA, playerB] = battle.participants;
    if (playerA && playerB) {
      if (playerA.score > playerB.score) {
        battle.winnerType = 'USER';
        battle.winnerUserId = playerA.userId;
      } else if (playerB.score > playerA.score) {
        battle.winnerType = 'USER';
        battle.winnerUserId = playerB.userId;
      } else if (playerA.correctAnswers > playerB.correctAnswers) {
        battle.winnerType = 'USER';
        battle.winnerUserId = playerA.userId;
      } else if (playerB.correctAnswers > playerA.correctAnswers) {
        battle.winnerType = 'USER';
        battle.winnerUserId = playerB.userId;
      } else {
        const fasterPlayer = pickWinnerByTime(playerA, playerB, battle.startedAt);
        if (fasterPlayer) {
          battle.winnerType = 'USER';
          battle.winnerUserId = fasterPlayer.userId;
        } else {
          battle.winnerType = 'DRAW';
        }
      }
    }
  } else {
    const teamA = battle.participants.filter((participant) => participant.team === 'A');
    const teamB = battle.participants.filter((participant) => participant.team === 'B');
    const scoreA = teamA.reduce((sum, participant) => sum + participant.score, 0);
    const scoreB = teamB.reduce((sum, participant) => sum + participant.score, 0);

    if (scoreA > scoreB) {
      battle.winnerType = 'TEAM';
      battle.winnerTeam = 'A';
    } else if (scoreB > scoreA) {
      battle.winnerType = 'TEAM';
      battle.winnerTeam = 'B';
    } else {
      const teamATime = teamA.reduce(
        (sum, participant) => sum + getCompletionTimeMs(participant, battle.startedAt),
        0,
      );
      const teamBTime = teamB.reduce(
        (sum, participant) => sum + getCompletionTimeMs(participant, battle.startedAt),
        0,
      );
      if (teamATime < teamBTime) {
        battle.winnerType = 'TEAM';
        battle.winnerTeam = 'A';
      } else if (teamBTime < teamATime) {
        battle.winnerType = 'TEAM';
        battle.winnerTeam = 'B';
      } else {
        battle.winnerType = 'DRAW';
      }
    }
  }

  battle.status = 'COMPLETED';
  battle.endedAt = new Date();
  await battle.save();

  await awardBattleRewards(battle);
  return battle;
}

async function awardBattleRewards(battle) {
  for (const participant of battle.participants) {
    const userId = participant.userId;
    let amount = BATTLE_XP.PARTICIPATION;
    let description = 'Battle participation';

    if (battle.winnerType === 'DRAW') {
      amount = BATTLE_XP.DRAW;
      description = 'Battle draw';
    } else if (battle.winnerType === 'USER' && battle.winnerUserId?.toString() === userId.toString()) {
      amount = BATTLE_XP.WIN;
      description = 'Battle victory';
    } else if (
      battle.winnerType === 'TEAM'
      && participant.team === battle.winnerTeam
    ) {
      amount = BATTLE_XP.WIN;
      description = 'Team battle victory';
    }

    await awardXp({
      userId,
      sourceType: amount >= BATTLE_XP.WIN ? 'BATTLE_WIN' : 'BATTLE_PARTICIPATION',
      sourceId: battle._id,
      amount,
      description,
    });

    const stats = await getUserStats(userId);
    stats.battlesPlayed += 1;
    if (battle.winnerType === 'DRAW') {
      stats.battlesDrawn += 1;
    } else if (
      (battle.winnerType === 'USER' && battle.winnerUserId?.toString() === userId.toString())
      || (battle.winnerType === 'TEAM' && participant.team === battle.winnerTeam)
    ) {
      stats.battlesWon += 1;
    } else {
      stats.battlesLost += 1;
    }
    await stats.save();
  }
}

async function submitBattleQuiz(battleId, userId, answers = {}) {
  const battle = await Battle.findById(battleId);
  if (!battle) throw new Error('Battle not found.');
  if (battle.status !== 'IN_PROGRESS') throw new Error('Battle is not in progress.');

  const participantIndex = battle.participants.findIndex(
    (participant) => participant.userId.toString() === userId.toString(),
  );
  if (participantIndex < 0) throw new Error('You are not part of this battle.');
  if (battle.participants[participantIndex].completedAt) {
    throw new Error('You already submitted your answers.');
  }

  const assessment = await loadBattleAssessment(battle.assessmentId);
  const timer = getTimerInfo(battle, assessment);
  if (timer.expired && battle.participants[participantIndex].completedAt) {
    throw new Error('Time is up for this battle.');
  }

  const items = await loadQuestionsForAssessment(assessment);
  let correctCount = 0;
  let wrongCount = 0;
  let totalScore = 0;
  let maxScore = 0;
  const answerRecords = [];

  for (const { question, solution, entry } of items) {
    maxScore += entry.points;
    const selected = answers[question._id.toString()];
    const isCorrect = gradeQuizSelection(question, solution, selected);
    if (isCorrect) {
      correctCount += 1;
      totalScore += entry.points;
    } else {
      wrongCount += 1;
    }

    answerRecords.push({
      questionId: question._id,
      selectedOptionIds: Array.isArray(selected) ? selected : selected ? [selected] : [],
      isCorrect,
      score: isCorrect ? entry.points : 0,
      maxScore: entry.points,
      answeredAt: new Date(),
    });
  }

  const percentage = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;

  const attempt = await AssessmentAttempt.create({
    userId,
    assessmentId: assessment._id,
    contextType: 'BATTLE',
    contextId: battle._id,
    status: 'EVALUATED',
    answers: answerRecords,
    correctAnswerCount: correctCount,
    wrongAnswerCount: wrongCount,
    score: totalScore,
    maximumScore: maxScore,
    percentage,
    passed: true,
    submittedAt: new Date(),
    evaluatedAt: new Date(),
  });

  battle.participants[participantIndex].score = totalScore;
  battle.participants[participantIndex].correctAnswers = correctCount;
  battle.participants[participantIndex].wrongAnswers = wrongCount;
  battle.participants[participantIndex].status = 'COMPLETED';
  battle.participants[participantIndex].completedAt = new Date();
  battle.participants[participantIndex].assessmentAttemptId = attempt._id;
  await battle.save();

  await finalizeBattleIfNeeded(battleId);

  const updatedBattle = await getBattleForUser(battleId, userId);

  return {
    score: totalScore,
    maxScore,
    percentage,
    correctCount,
    wrongCount,
    battle: updatedBattle,
  };
}

async function leaveBattle(battleId, userId) {
  const battle = await Battle.findById(battleId);
  if (!battle) throw new Error('Battle not found.');

  const participantIndex = battle.participants.findIndex(
    (participant) => participant.userId.toString() === userId.toString(),
  );
  if (participantIndex < 0) throw new Error('You are not part of this battle.');

  const participant = battle.participants[participantIndex];

  if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(battle.status)) {
    return getBattleForUser(battleId, userId);
  }

  if (participant.status === 'COMPLETED') {
    return getBattleForUser(battleId, userId);
  }

  if (['PLAYING', 'JOINED', 'READY', 'INVITED'].includes(participant.status)) {
    battle.participants[participantIndex].status = 'LEFT';
    await battle.save();
    await finalizeBattleIfNeeded(battleId);
  }

  return getBattleForUser(battleId, userId);
}

async function runBattleCoding(battleId, userId, code = {}) {
  const battle = await Battle.findById(battleId);
  if (!battle) throw new Error('Battle not found.');
  if (battle.status !== 'IN_PROGRESS') throw new Error('Battle is not in progress.');

  const isParticipant = battle.participants.some(
    (participant) => participant.userId.toString() === userId.toString(),
  );
  if (!isParticipant) throw new Error('You are not part of this battle.');

  const assessment = await loadBattleAssessment(battle.assessmentId);
  if (!assessment || assessment.mode !== 'CODING') {
    throw new Error('This battle is not a coding challenge.');
  }

  const items = await loadQuestionsForAssessment(assessment);
  const coding = items[0];
  if (!coding) throw new Error('Coding challenge not found.');

  const visibleTests = getVisibleTests(coding.question);
  const result = runCodingTests(code, visibleTests);

  return {
    ...result,
    results: result.results.map((item) => ({
      ...item,
      expected: undefined,
    })),
  };
}

async function submitBattleCoding(battleId, userId, code = {}) {
  const battle = await Battle.findById(battleId);
  if (!battle) throw new Error('Battle not found.');
  if (battle.status !== 'IN_PROGRESS') throw new Error('Battle is not in progress.');

  const participantIndex = battle.participants.findIndex(
    (participant) => participant.userId.toString() === userId.toString(),
  );
  if (participantIndex < 0) throw new Error('You are not part of this battle.');
  if (battle.participants[participantIndex].completedAt) {
    throw new Error('You already submitted your solution.');
  }

  const assessment = await loadBattleAssessment(battle.assessmentId);
  if (!assessment || assessment.mode !== 'CODING') {
    throw new Error('This battle is not a coding challenge.');
  }

  const timer = getTimerInfo(battle, assessment);
  if (timer.expired && battle.participants[participantIndex].completedAt) {
    throw new Error('Time is up for this battle.');
  }

  const items = await loadQuestionsForAssessment(assessment);
  const coding = items[0];
  if (!coding) throw new Error('Coding challenge not found.');

  const { question, solution, entry } = coding;
  const visibleTests = getVisibleTests(question);
  const hiddenTests = solution?.codingSolution?.hiddenTestCases || [];
  const allTests = [
    ...visibleTests.map((test) => ({ ...test, hidden: false })),
    ...hiddenTests.map((test) => ({ ...test, hidden: true })),
  ];

  const evaluation = runCodingTests(code, allTests);
  const points = entry.points || 100;
  const totalScore = Math.round((evaluation.score / 100) * points);
  const passedCount = evaluation.passedCount;
  const failedCount = Math.max(0, evaluation.totalCount - passedCount);

  const attempt = await AssessmentAttempt.create({
    userId,
    assessmentId: assessment._id,
    contextType: 'BATTLE',
    contextId: battle._id,
    status: 'EVALUATED',
    answers: [
      {
        questionId: question._id,
        codeAnswer: {
          language: 'html-css-js',
          code: JSON.stringify(code),
        },
        isCorrect: evaluation.score >= 100,
        score: totalScore,
        maxScore: points,
        executionResult: {
          passedTestCases: passedCount,
          totalTestCases: evaluation.totalCount,
        },
        answeredAt: new Date(),
      },
    ],
    correctAnswerCount: passedCount,
    wrongAnswerCount: failedCount,
    score: totalScore,
    maximumScore: points,
    percentage: evaluation.score,
    passed: evaluation.score >= 100,
    submittedAt: new Date(),
    evaluatedAt: new Date(),
  });

  battle.participants[participantIndex].score = totalScore;
  battle.participants[participantIndex].correctAnswers = passedCount;
  battle.participants[participantIndex].wrongAnswers = failedCount;
  battle.participants[participantIndex].status = 'COMPLETED';
  battle.participants[participantIndex].completedAt = new Date();
  battle.participants[participantIndex].assessmentAttemptId = attempt._id;
  await battle.save();

  await finalizeBattleIfNeeded(battleId);

  const updatedBattle = await getBattleForUser(battleId, userId);

  return {
    score: totalScore,
    maxScore: points,
    percentage: evaluation.score,
    correctCount: passedCount,
    wrongCount: failedCount,
    passedCount,
    totalCount: evaluation.totalCount,
    battle: updatedBattle,
  };
}

async function getBattleMeta() {
  const skills = await Skill.find({ status: 'ACTIVE' })
    .populate('categoryId', 'name slug')
    .sort({ name: 1 })
    .lean();

  return {
    formats: [
      { id: 'ONE_V_ONE', label: '1v1 Duel', players: 2 },
      { id: 'THREE_V_THREE', label: '3v3 Squad', players: 6 },
    ],
    modes: [
      { id: 'QUIZ', label: 'Quiz', description: 'Industry MCQ questions — same set for every player' },
      { id: 'CODING', label: 'Coding', description: 'Live coding challenge with automated tests' },
    ],
    difficulties: [
      { id: 'EASY', label: 'Easy' },
      { id: 'MEDIUM', label: 'Medium' },
      { id: 'HARD', label: 'Hard' },
      { id: 'MIXED', label: 'Mixed' },
    ],
    skills: skills.map((skill) => ({
      id: skill._id.toString(),
      name: skill.name,
      slug: skill.slug,
      category: skill.categoryId?.name || 'General',
    })),
  };
}

async function listUserBattles(userId, limit = 20) {
  const battles = await Battle.find({ 'participants.userId': userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('skillId', 'name')
    .lean();

  return battles.map((battle) => ({
    id: battle._id.toString(),
    battleCode: battle.battleCode,
    format: battle.format,
    mode: battle.mode,
    difficulty: battle.difficulty,
    status: battle.status,
    skill: battle.skillId?.name || 'General',
    endedAt: battle.endedAt,
    winnerType: battle.winnerType,
    winnerUserId: battle.winnerUserId?.toString(),
    winnerTeam: battle.winnerTeam,
    createdAt: battle.createdAt,
  }));
}

module.exports = {
  getBattleMeta,
  getBattleForUser,
  getBattleQuizPayload,
  submitBattleQuiz,
  runBattleCoding,
  submitBattleCoding,
  leaveBattle,
  finalizeBattleIfNeeded,
  listUserBattles,
};
