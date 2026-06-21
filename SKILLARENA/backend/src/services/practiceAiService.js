const {
  extractJsonObject,
  normalizeQuizQuestion,
  normalizeTestCases,
  asArray,
} = require('./courseAiService');

const QUIZ_QUESTION_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'];

function normalizeOptionText(option) {
  if (typeof option === 'string') return option.trim();
  if (option && typeof option === 'object') {
    return String(option.text || option.label || option.value || option.option || '').trim();
  }
  return String(option || '').trim();
}

function normalizePracticeQuizQuestion(question = {}, questionType = 'SINGLE_CHOICE') {
  const base = normalizeQuizQuestion(question);
  let options = (Array.isArray(question.options)
    ? question.options
    : Array.isArray(question.choices)
      ? question.choices
      : base.options
  )
    .map(normalizeOptionText)
    .filter(Boolean);

  if (questionType === 'TRUE_FALSE') {
    options = ['True', 'False'];
  } else if (!options.length) {
    options = base.options.map(normalizeOptionText).filter(Boolean);
  }

  let correctIndices = asArray(question.correctIndices)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!correctIndices.length && Array.isArray(question.correctAnswers)) {
    correctIndices = question.correctAnswers
      .map((answer) => options.findIndex((option) => option.toLowerCase() === String(answer).trim().toLowerCase()))
      .filter((index) => index >= 0);
  }

  let correctIndex =
    typeof question.correctIndex === 'number' ? question.correctIndex : base.correctIndex;

  if (questionType === 'MULTIPLE_CHOICE' && !correctIndices.length && correctIndex >= 0) {
    correctIndices = [correctIndex];
  }

  if (questionType !== 'MULTIPLE_CHOICE' && correctIndices.length) {
    correctIndex = correctIndices[0];
  }

  return {
    prompt: String(base.prompt || question.prompt || '').trim(),
    options,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    correctIndices,
    explanation: base.explanation || question.explanation || question.rationale || '',
  };
}

function validatePracticePlan(raw = {}, context = {}) {
  const addingToExisting = Boolean(context.addingToExisting);
  const existingMode = context.existingMode || 'QUIZ';
  const adminMode = String(context.adminMode || existingMode || 'QUIZ').toUpperCase();
  const mode = addingToExisting ? existingMode : adminMode === 'CODING' ? 'CODING' : 'QUIZ';

  let questionCount = Number(raw.questionCount);
  if (!Number.isFinite(questionCount) || questionCount < 1) {
    questionCount = mode === 'CODING' ? 1 : 6;
  }
  if (mode === 'CODING') {
    questionCount = 1;
  } else {
    questionCount = Math.min(Math.max(Math.round(questionCount), 4), 15);
  }

  const difficulty = ['EASY', 'MEDIUM', 'HARD', 'MIXED'].includes(String(raw.difficulty || '').toUpperCase())
    ? String(raw.difficulty).toUpperCase()
    : 'MIXED';

  const adminQuestionType = String(context.questionType || 'SINGLE_CHOICE').toUpperCase();
  const questionType = QUIZ_QUESTION_TYPES.includes(adminQuestionType)
    ? adminQuestionType
    : 'SINGLE_CHOICE';

  return {
    title: String(raw.title || context.title || 'Practice Set').trim(),
    description: String(raw.description || context.content || '').trim(),
    skillName: String(raw.skillName || 'General').trim() || 'General',
    difficulty,
    mode,
    questionType: mode === 'CODING' ? null : questionType,
    questionCount,
    xpReward: Math.min(Math.max(Number(raw.xpReward) || 25, 5), 100),
    passingPercentage:
      mode === 'CODING'
        ? 100
        : Math.min(Math.max(Number(raw.passingPercentage) || 70, 50), 90),
    questionFocus: String(
      raw.questionFocus || raw.topics || raw.description || context.content || '',
    ).trim(),
  };
}

function buildSeriesAvoidRepeatBlock(plan = {}) {
  const prompts = asArray(plan.existingQuestionPrompts).filter(Boolean);
  if (!prompts.length) return '';

  const seriesIntro = plan.isSeriesContinuation
    ? `This is part ${plan.seriesPart || 2} of the "${plan.seriesBaseTitle || plan.title}" practice series. `
    : '';

  const listed = prompts
    .slice(0, 40)
    .map((prompt, index) => `${index + 1}. ${prompt}`)
    .join('\n');
  const overflow = prompts.length > 40 ? `\n... and ${prompts.length - 40} more.` : '';

  return `${seriesIntro}Do NOT repeat or closely paraphrase any of these existing questions:
${listed}${overflow}

Generate only fresh questions on the same topics at a similar difficulty.`;
}

function buildPracticePlanPrompt({
  content,
  title,
  skills = [],
  addingToExisting,
  existingMode,
  existingQuestionCount,
  adminMode,
  questionType,
  isSeriesContinuation,
  seriesPart,
  seriesBaseTitle,
  existingQuestionPrompts = [],
}) {
  const skillList = skills.length
    ? skills.map((skill) => skill.name).join(', ')
    : 'JavaScript, HTML, CSS, React, Python, SQL, General';
  const avoidRepeat = buildSeriesAvoidRepeatBlock({
    isSeriesContinuation,
    seriesPart,
    seriesBaseTitle,
    title,
    existingQuestionPrompts,
  });

  return `You are planning a practice assessment for Skill Arena LMS.

Admin content (use this as the source of truth for topics and scope):
"""
${content}
"""

${title ? `Optional title hint: ${title}` : 'No title hint — choose a clear title from the content.'}
${
  addingToExisting
    ? `Context: add more questions to an existing ${existingMode} practice set that already has ${existingQuestionCount} question(s).`
    : isSeriesContinuation
      ? `Context: create part ${seriesPart || 2} of the "${seriesBaseTitle || title}" practice series as a new ${adminMode} set. Question format: ${questionType || 'SINGLE_CHOICE'}.`
      : `Context: create a brand-new ${adminMode} practice set. Question format chosen by admin: ${questionType || 'SINGLE_CHOICE'}.`
}
${avoidRepeat ? `\n${avoidRepeat}\n` : ''}
Available skills (pick the closest match or propose a concise skill name): ${skillList}

Return JSON only:
{
  "title": "Student-facing practice set title",
  "description": "1-2 sentence description for learners",
  "skillName": "Closest skill name",
  "difficulty": "EASY|MEDIUM|HARD|MIXED",
  "questionCount": 8,
  "xpReward": 25,
  "passingPercentage": 70,
  "questionFocus": "Detailed list of every topic, concept, and scenario from the admin content that questions must cover"
}

Rules:
- Read the admin content carefully. Every important topic in the content must appear in questionFocus.
- YOU decide title, difficulty, questionCount, xpReward, and passingPercentage based on content scope and depth.
- Do NOT choose quiz vs coding or question format — the admin already selected those.
- For QUIZ sets: choose questionCount between 4 and 15 (more content = more questions).
- For adding to an existing QUIZ set: questionCount is how many NEW questions to add (typically 4-8).
- passingPercentage: 70 for quiz unless content suggests otherwise; 100 for coding.
- Do not invent unrelated topics outside the admin content.`;
}

function buildPracticeQuizPrompt(plan) {
  const questionType = plan.questionType || 'SINGLE_CHOICE';
  const avoidRepeat = buildSeriesAvoidRepeatBlock(plan);
  const avoidSection = avoidRepeat ? `\n\n${avoidRepeat}` : '';

  if (questionType === 'TRUE_FALSE') {
    return `Create ${plan.questionCount} true/false practice questions for Skill Arena.

Practice set: ${plan.title}
Skill: ${plan.skillName}
Difficulty: ${plan.difficulty}

Source material — every question must be grounded in this content:
"""
${plan.questionFocus}
"""${avoidSection}

Return JSON only:
{
  "questions": [
    {
      "prompt": "Statement to evaluate as true or false?",
      "options": ["True", "False"],
      "correctIndex": 0,
      "explanation": "Why True or False is correct"
    }
  ]
}

Rules:
- Return exactly ${plan.questionCount} questions
- Each question MUST include options exactly as ["True", "False"]
- correctIndex must be 0 for True or 1 for False
- Write clear statements, not questions with yes/no wording when possible
- Cover ALL topics in the source material`;
  }

  if (questionType === 'MULTIPLE_CHOICE') {
    return `Create ${plan.questionCount} multiple-select practice questions for Skill Arena (student picks ALL correct answers).

Practice set: ${plan.title}
Skill: ${plan.skillName}
Difficulty: ${plan.difficulty}
${plan.isSeriesContinuation ? `Series: Part ${plan.seriesPart} of "${plan.seriesBaseTitle}"` : ''}

Source material — every question must be grounded in this content:
"""
${plan.questionFocus}
"""${avoidSection}

Return JSON only:
{
  "questions": [
    {
      "prompt": "Which statements are correct?",
      "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
      "correctIndices": [0, 2],
      "explanation": "Why those answers are correct"
    }
  ]
}

Rules:
- Return exactly ${plan.questionCount} questions
- Each question must have exactly 5 distinct non-empty string options
- correctIndices must list 2 or 3 correct option indexes (0-4)
- Cover ALL topics listed in the source material
- Match the stated difficulty`;
  }

  return `Create ${plan.questionCount} single-answer multiple-choice practice questions for Skill Arena.

Practice set: ${plan.title}
Skill: ${plan.skillName}
Difficulty: ${plan.difficulty}
${plan.isSeriesContinuation ? `Series: Part ${plan.seriesPart} of "${plan.seriesBaseTitle}"` : ''}

Source material — every question must be grounded in this content:
"""
${plan.questionFocus}
"""${avoidSection}

Return JSON only:
{
  "questions": [
    {
      "prompt": "Clear question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Rules:
- Return exactly ${plan.questionCount} questions
- Each question MUST have exactly 4 distinct non-empty string options (plain strings, not objects)
- correctIndex is 0-3 (one correct answer only)
- Cover ALL topics listed in the source material; distribute questions across topics
- Match the stated difficulty
- Use practical, interview-style wording where appropriate
- Do not repeat the same question with different wording`;
}

function buildPracticeCodingPrompt(plan) {
  const avoidSection = buildSeriesAvoidRepeatBlock(plan);
  return `Create one HTML/CSS/JavaScript coding practice challenge for Skill Arena.

Practice set: ${plan.title}
Skill: ${plan.skillName}
Difficulty: ${plan.difficulty}
${plan.isSeriesContinuation ? `Series: Part ${plan.seriesPart} of "${plan.seriesBaseTitle}"` : ''}

Source material — the challenge must test skills from this content:
"""
${plan.questionFocus}
"""
${avoidSection ? `\n${avoidSection}\n` : ''}
Return JSON only:
{
  "problemStatement": "...",
  "instructions": "...",
  "htmlStarter": "...",
  "cssStarter": "...",
  "javascriptStarter": "...",
  "referenceHtml": "<complete working HTML for the expected result>",
  "referenceCss": "complete CSS for the expected result",
  "referenceJavascript": "complete JS for the expected result",
  "hints": ["hint1", "hint2"],
  "expectedOutputDescription": "One-line summary only",
  "visibleTestCases": [
    { "type": "ELEMENT_EXISTS", "selector": "h1", "label": "Has heading" }
  ],
  "hiddenTestCases": [
    { "type": "DOM_TEXT_EQUALS", "selector": "#result", "expected": "Exact text students must produce" }
  ]
}

Rules:
- referenceHtml, referenceCss, and referenceJavascript MUST be a complete working solution that renders the exact expected output
- hiddenTestCases should include at least one check with an exact "expected" string or value where applicable
- Keep starter code minimal; reference code shows the full correct result
- Escape quotes inside JSON strings. Base the task on the admin source material.`;
}

async function generatePracticePlanFromAi(payload, userId) {
  const { generateAiText } = require('./aiService');
  const output = await generateAiText(buildPracticePlanPrompt(payload), {
    userId,
    type: 'practice_plan',
    maxOutputTokens: 2048,
  });

  const parsed = extractJsonObject(output);
  const validated = validatePracticePlan(parsed, payload);
  return {
    ...validated,
    seriesPart: payload.seriesPart,
    seriesBaseTitle: payload.seriesBaseTitle,
    isSeriesContinuation: payload.isSeriesContinuation,
    existingQuestionPrompts: payload.existingQuestionPrompts || [],
  };
}

function isValidGeneratedQuestion(question, questionType) {
  if (!question.prompt) return false;

  if (questionType === 'TRUE_FALSE') {
    return question.options.length === 2
      && question.options[0].toLowerCase() === 'true'
      && question.options[1].toLowerCase() === 'false';
  }

  if (questionType === 'MULTIPLE_CHOICE') {
    return question.options.length >= 4
      && question.correctIndices.length >= 2;
  }

  return question.options.filter(Boolean).length >= 4;
}

function finalizeQuizQuestionOptions(question, questionType) {
  let options = [...question.options];

  if (questionType === 'TRUE_FALSE') {
    options = ['True', 'False'];
  } else if (questionType === 'MULTIPLE_CHOICE') {
    while (options.length < 5) {
      options.push(`Option ${options.length + 1}`);
    }
    options = options.slice(0, 5);
  } else {
    while (options.length < 4) {
      options.push(`Option ${options.length + 1}`);
    }
    options = options.slice(0, 4);
  }

  return { ...question, options };
}

async function generatePracticeQuizQuestions(plan, userId) {
  const { generateAiText } = require('./aiService');
  const targetCount = plan.questionCount;
  const questionType = plan.questionType || 'SINGLE_CHOICE';
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const output = await generateAiText(buildPracticeQuizPrompt(plan), {
        userId,
        type: 'practice_questions',
        maxOutputTokens: 8192,
      });

      const parsed = extractJsonObject(output);
      const questions = asArray(parsed.questions)
        .map((question) => normalizePracticeQuizQuestion(question, questionType))
        .filter((question) => isValidGeneratedQuestion(question, questionType))
        .map((question) => finalizeQuizQuestionOptions(question, questionType));

      if (questions.length >= Math.min(3, targetCount)) {
        return questions.slice(0, targetCount);
      }

      lastError = new Error(
        `AI returned ${questions.length} valid ${questionType} question(s), expected at least ${Math.min(3, targetCount)}.`,
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('AI did not return enough valid quiz questions.');
}

async function generatePracticeCodingChallenge(plan, userId) {
  const { generateAiText } = require('./aiService');

  const output = await generateAiText(buildPracticeCodingPrompt(plan), {
    userId,
    type: 'practice_coding',
    maxOutputTokens: 4096,
  });

  const parsed = extractJsonObject(output);

  return {
    problemTitle: plan.title,
    problemStatement: parsed.problemStatement || plan.questionFocus || plan.description || plan.title,
    instructions: parsed.instructions || '',
    htmlStarter: parsed.htmlStarter || '',
    cssStarter: parsed.cssStarter || '',
    javascriptStarter: parsed.javascriptStarter || '',
    hints: asArray(parsed.hints),
    visibleTestCases: normalizeTestCases(parsed.visibleTestCases),
    hiddenTestCases: normalizeTestCases(parsed.hiddenTestCases),
    expectedOutputDescription: parsed.expectedOutputDescription || '',
    solutionExplanation: parsed.solutionExplanation || '',
    referenceHtml: parsed.referenceHtml || '',
    referenceCss: parsed.referenceCss || '',
    referenceJavascript: parsed.referenceJavascript || '',
    passingThreshold: Number(parsed.passingThreshold) || 100,
  };
}

module.exports = {
  generatePracticePlanFromAi,
  generatePracticeQuizQuestions,
  generatePracticeCodingChallenge,
  normalizePracticeQuizQuestion,
  validatePracticePlan,
  QUIZ_QUESTION_TYPES,
};
