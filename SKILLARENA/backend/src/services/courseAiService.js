const ALLOWED_LESSON_TYPES = ['ARTICLE', 'VIDEO', 'QUIZ', 'CODING'];

function buildCourseOutlinePrompt({ title, brief, categories = [] }) {
  const categoryList = categories.length
    ? categories.map((category) => category.name).join(', ')
    : 'Web Development, Programming, Design, Business';

  return `You are an expert curriculum designer for Skill Arena.

Return ONE JSON object — course OUTLINE only (no articleHtml, no quiz questions, no coding starter code).

Course topic: ${title}
Admin notes: ${brief || 'General professional course suitable for the title.'}
Categories (pick one or propose a new 2-4 word name): ${categoryList}

Structure requirements:
- 4 modules (5 if the topic is broad or advanced)
- Each module: 4 to 5 lessons mixing ARTICLE, QUIZ, CODING, and VIDEO
- At least 2 CODING lessons across the full course (HTML/CSS/JavaScript)
- At least 1 QUIZ per module
- Progressive difficulty from module 1 to the last
- Every lesson must have: type, title, description, durationMinutes, completionXpReward
- Do NOT include articleHtml, questions, htmlStarter, or other heavy content — outline only

Top-level keys: title, shortDescription, description (2-3 paragraphs), categoryName, level, estimatedMinutes, completionXpReward, skillName, modules.
Each module: title, description, lessons[].`;
}

function buildCompactOutlinePrompt({ title, brief, categories = [] }) {
  const categoryList = categories.length
    ? categories.map((category) => category.name).join(', ')
    : 'Web Development, Programming';

  return `Return ONE JSON course OUTLINE only. No lesson body content.

Topic: ${title}
Notes: ${brief || title}
Categories: ${categoryList}

- 3 modules, 4 lessons each
- Mix ARTICLE, QUIZ, CODING, VIDEO
- At least 1 CODING lesson in the course
- Each lesson: type, title, description, durationMinutes, completionXpReward only`;
}

function buildArticlePrompt(lesson, context) {
  return `Write a complete Markdown lesson article (450-650 words) for:

Course: ${context.courseTitle}
Module: ${context.moduleTitle}
Lesson: ${lesson.title}
Level: ${context.level}
Summary: ${lesson.description || ''}

Include:
- Clear headings (##, ###)
- Bullet lists where helpful
- At least one fenced code example
- A "Key takeaways" section at the end

Return ONLY the Markdown article. No JSON. No markdown code fences wrapping the whole article.`;
}

function buildQuizPrompt(lesson, context) {
  return `Create 4 multiple-choice quiz questions for:

Course: ${context.courseTitle}
Module: ${context.moduleTitle}
Lesson: ${lesson.title}
Summary: ${lesson.description || ''}

Return JSON only:
{
  "questions": [
    { "prompt": "Question?", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "Why" }
  ]
}

Use "prompt" and "correctIndex" (0-3). Each question must have exactly 4 options.`;
}

function buildCodingPrompt(lesson, context) {
  return `Create a coding challenge for:

Course: ${context.courseTitle}
Module: ${context.moduleTitle}
Lesson: ${lesson.title}
Summary: ${lesson.description || ''}

HTML/CSS/JavaScript only. Return JSON only:
{
  "problemStatement": "...",
  "instructions": "...",
  "htmlStarter": "...",
  "cssStarter": "...",
  "javascriptStarter": "...",
  "hints": ["hint1", "hint2"],
  "visibleTestCases": [
    { "type": "ELEMENT_EXISTS", "selector": "h1", "label": "Has heading" }
  ],
  "hiddenTestCases": [
    { "type": "ELEMENT_COUNT", "selector": "h1", "expected": 1 }
  ]
}

Keep starter code concise. Escape quotes inside JSON strings.`;
}

function stripMarkdownFences(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : raw;
}

function repairJsonText(text) {
  return String(text || '')
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
}

function findBalancedJsonBounds(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { start, end: index };
    }
  }
  return null;
}

function closeTruncatedJson(text) {
  let candidate = text.slice(text.indexOf('{'));
  const stack = [];
  let inString = false;
  let escape = false;

  for (let index = 0; index < candidate.length; index += 1) {
    const char = candidate[index];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{' || char === '[') stack.push(char);
    else if (char === '}' && stack[stack.length - 1] === '{') stack.pop();
    else if (char === ']' && stack[stack.length - 1] === '[') stack.pop();
  }

  if (inString) candidate += '"';
  while (stack.length) {
    const open = stack.pop();
    candidate += open === '{' ? '}' : ']';
  }
  return candidate;
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('AI returned empty output.');

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = repairJsonText(fenced ? fenced[1].trim() : raw);

  let bounds = findBalancedJsonBounds(candidate);
  if (!bounds) {
    candidate = repairJsonText(closeTruncatedJson(candidate));
    bounds = findBalancedJsonBounds(candidate);
  }
  if (!bounds) {
    throw new Error('AI did not return valid JSON for the course plan.');
  }

  candidate = candidate.slice(bounds.start, bounds.end + 1);

  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(repairJsonText(candidate));
    } catch {
      throw new Error('AI did not return valid JSON for the course plan.');
    }
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

function normalizeQuizQuestion(question = {}) {
  const prompt =
    question.prompt ||
    question.question ||
    question.text ||
    question.title ||
    '';
  const options = Array.isArray(question.options)
    ? question.options.map((option) => String(option))
    : Array.isArray(question.choices)
      ? question.choices.map((option) => String(option))
      : [];

  let correctIndex =
    typeof question.correctIndex === 'number' ? question.correctIndex : -1;

  if (correctIndex < 0 && typeof question.answer === 'number') {
    correctIndex = question.answer;
  }

  if (correctIndex < 0 && question.correctAnswer != null) {
    const answer = String(question.correctAnswer).trim().toLowerCase();
    correctIndex = options.findIndex(
      (option) => String(option).trim().toLowerCase() === answer,
    );
    if (correctIndex < 0 && /^[0-3]$/.test(String(question.correctAnswer))) {
      correctIndex = Number(question.correctAnswer);
    }
  }

  if (correctIndex < 0 && question.correctOption != null) {
    correctIndex = Number(question.correctOption);
  }

  return {
    prompt: String(prompt).trim(),
    options,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    explanation: question.explanation || question.rationale || '',
  };
}

function normalizeTestCase(testCase) {
  if (!testCase || typeof testCase !== 'object') return null;

  if (testCase.type) {
    return {
      type: testCase.type,
      selector: testCase.selector || testCase.target || 'body',
      label: testCase.label || testCase.name || testCase.description || 'Requirement',
      expected: testCase.expected ?? testCase.expectedCount ?? testCase.value,
      text: testCase.text || testCase.expectedText,
    };
  }

  const label =
    testCase.name ||
    testCase.label ||
    testCase.expectedOutput ||
    testCase.description ||
    'Requirement met';

  return {
    type: 'ELEMENT_EXISTS',
    selector: testCase.selector || 'body',
    label: String(label).slice(0, 160),
  };
}

function normalizeTestCases(raw) {
  return asArray(raw).map(normalizeTestCase).filter(Boolean);
}

function inferLessonType(lesson = {}) {
  const explicit = String(lesson.type || '').toUpperCase();
  if (ALLOWED_LESSON_TYPES.includes(explicit)) return explicit;

  const title = String(lesson.title || '').toLowerCase();
  if (lesson.questions?.length || lesson.quizQuestions?.length || title.includes('quiz')) {
    return 'QUIZ';
  }
  if (
    lesson.htmlStarter ||
    lesson.cssStarter ||
    lesson.javascriptStarter ||
    lesson.problemStatement ||
    lesson.starterCode ||
    title.includes('coding') ||
    title.includes('challenge')
  ) {
    return 'CODING';
  }
  if (lesson.videoUrl !== undefined || title.includes('video')) return 'VIDEO';
  return 'ARTICLE';
}

function buildFallbackArticleHtml(title, description) {
  return `# ${title}\n\n${description || 'Lesson overview.'}\n\n## What you will learn\n\n- Core concepts for this topic\n- Practical examples and patterns\n- How to apply the ideas in exercises\n\n## Summary\n\nReview the key points and continue to the next lesson when ready.\n`;
}

function buildFallbackQuizQuestions(title) {
  return [
    {
      prompt: `What is the main focus of "${title}"?`,
      options: ['Core concepts', 'Unrelated trivia', 'Advanced math only', 'None of the above'],
      correctIndex: 0,
      explanation: 'This lesson focuses on the core concepts introduced in the module.',
    },
    {
      prompt: 'Which approach best reinforces learning from this lesson?',
      options: ['Practice and review', 'Skip exercises', 'Ignore examples', 'Memorize without context'],
      correctIndex: 0,
      explanation: 'Practice and review help solidify understanding.',
    },
    {
      prompt: 'What should you do after completing this lesson?',
      options: ['Apply the concepts in exercises', 'Stop learning', 'Skip the quiz', 'Delete your notes'],
      correctIndex: 0,
      explanation: 'Applying concepts in exercises builds practical skill.',
    },
    {
      prompt: 'Why are quizzes included in this module?',
      options: ['To check understanding', 'To replace practice', 'To skip reading', 'To reduce XP'],
      correctIndex: 0,
      explanation: 'Quizzes help verify that you understood the material.',
    },
  ];
}

function buildFallbackCodingContent(courseTitle, lessonTitle) {
  return {
    problemStatement: `Build a small HTML/CSS page demonstrating concepts from "${lessonTitle}" in ${courseTitle}.`,
    instructions: 'Use semantic HTML. Add basic styling. Ensure required elements are present.',
    htmlStarter: `<!-- ${lessonTitle} -->\n<main>\n  <h1></h1>\n  <p></p>\n</main>\n`,
    cssStarter: 'main { padding: 1rem; }\n',
    javascriptStarter: '',
    hints: ['Start with semantic HTML structure', 'Add clear headings and paragraphs'],
    visibleTestCases: [
      { type: 'ELEMENT_EXISTS', selector: 'main', label: 'Uses a main element' },
      { type: 'ELEMENT_EXISTS', selector: 'h1', label: 'Includes a heading' },
    ],
    hiddenTestCases: [{ type: 'ELEMENT_COUNT', selector: 'p', expected: 1 }],
    passingThreshold: 100,
  };
}

function buildFallbackCodingLessonEntry(courseTitle) {
  return {
    type: 'CODING',
    title: 'Capstone Practice',
    description: `Apply everything learned in ${courseTitle}.`,
    durationMinutes: 30,
    completionXpReward: 40,
    problemTitle: 'Capstone Practice',
    ...buildFallbackCodingContent(courseTitle, 'Capstone Practice'),
  };
}

function ensureCodingLesson(modules, courseTitle) {
  const hasCoding = modules.some((module) =>
    module.lessons.some((lesson) => lesson.type === 'CODING'),
  );
  if (hasCoding) return modules;

  const targetModule = modules[modules.length - 1] || modules[0];
  if (!targetModule) return modules;

  targetModule.lessons.push(buildFallbackCodingLessonEntry(courseTitle));
  return modules;
}

function normalizeLesson(lesson, index) {
  if (!lesson?.title?.trim()) {
    throw new Error(`Lesson ${index + 1} is missing a title.`);
  }

  const type = inferLessonType(lesson);
  const rawQuestions =
    lesson.questions || lesson.quizQuestions || lesson.mcqQuestions || [];

  return {
    type,
    title: lesson.title.trim(),
    description: lesson.description?.trim() || '',
    durationMinutes: Number(lesson.durationMinutes) || 10,
    completionXpReward: Number(lesson.completionXpReward) || 15,
    articleHtml: lesson.articleHtml || lesson.content || lesson.markdown || '',
    videoUrl: lesson.videoUrl ?? '',
    passingPercentage: Number(lesson.passingPercentage) || 70,
    questions: asArray(rawQuestions).map(normalizeQuizQuestion),
    problemTitle: lesson.problemTitle || lesson.title,
    problemStatement:
      lesson.problemStatement ||
      lesson.problemDescription ||
      lesson.description ||
      '',
    instructions: lesson.instructions || lesson.steps || '',
    htmlStarter:
      lesson.htmlStarter ||
      lesson.starterHtml ||
      lesson.starterCode?.html ||
      lesson.starterCode?.HTML ||
      '',
    cssStarter: lesson.cssStarter || lesson.starterCss || lesson.starterCode?.css || '',
    javascriptStarter:
      lesson.javascriptStarter ||
      lesson.jsStarter ||
      lesson.starterCode?.javascript ||
      lesson.starterCode?.js ||
      '',
    hints: asArray(lesson.hints).filter(Boolean),
    visibleTestCases: normalizeTestCases(
      lesson.visibleTestCases || lesson.visibleTestCase || lesson.sampleTestCases,
    ),
    hiddenTestCases: normalizeTestCases(
      lesson.hiddenTestCases || lesson.hiddenTestCase,
    ),
    passingThreshold: Number(lesson.passingThreshold) || 100,
    expectedOutputDescription: lesson.expectedOutputDescription || '',
    solutionExplanation: lesson.solutionExplanation || '',
    referenceHtml: lesson.referenceHtml || '',
    referenceCss: lesson.referenceCss || '',
    referenceJavascript: lesson.referenceJavascript || '',
  };
}

function validateCoursePlan(plan) {
  if (!plan?.title?.trim()) throw new Error('AI course plan is missing a title.');
  if (!plan?.shortDescription?.trim()) throw new Error('AI course plan is missing a short description.');
  if (!plan?.description?.trim()) throw new Error('AI course plan is missing a description.');
  if (!Array.isArray(plan.modules) || !plan.modules.length) {
    throw new Error('AI course plan must include at least one module.');
  }

  let modules = plan.modules.map((module, moduleIndex) => {
    if (!module?.title?.trim()) {
      throw new Error(`Module ${moduleIndex + 1} is missing a title.`);
    }
    if (!Array.isArray(module.lessons) || !module.lessons.length) {
      throw new Error(`Module "${module.title}" must include at least one lesson.`);
    }

    const lessons = module.lessons.map((lesson, lessonIndex) => {
      const normalized = normalizeLesson(lesson, lessonIndex);
      if (normalized.type === 'QUIZ' && normalized.questions.length < 2) {
        normalized.questions = buildFallbackQuizQuestions(normalized.title);
      }
      if (normalized.type === 'ARTICLE' && !normalized.articleHtml.trim()) {
        normalized.articleHtml = buildFallbackArticleHtml(normalized.title, normalized.description);
      }
      if (normalized.type === 'CODING') {
        if (!normalized.problemStatement.trim()) {
          normalized.problemStatement =
            normalized.description ||
            `Complete the ${normalized.title} coding exercise.`;
        }
        if (!normalized.htmlStarter && !normalized.cssStarter && !normalized.javascriptStarter) {
          Object.assign(normalized, buildFallbackCodingContent(plan.title, normalized.title));
        }
        if (!normalized.visibleTestCases.length) {
          normalized.visibleTestCases = [
            { type: 'ELEMENT_EXISTS', selector: 'body', label: 'Page renders content' },
          ];
        }
      }
      return normalized;
    });

    return {
      title: module.title.trim(),
      description: module.description?.trim() || '',
      lessons,
    };
  });

  modules = ensureCodingLesson(modules, plan.title.trim());

  if (!plan.categoryName?.trim()) {
    throw new Error('AI course plan is missing a category.');
  }

  return {
    title: plan.title.trim(),
    shortDescription: plan.shortDescription.trim(),
    description: plan.description.trim(),
    categoryName: plan.categoryName.trim(),
    level: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(plan.level)
      ? plan.level
      : 'BEGINNER',
    estimatedMinutes: Number(plan.estimatedMinutes) || 0,
    completionXpReward: Number(plan.completionXpReward) || 200,
    skillName: plan.skillName?.trim() || plan.title.split(' ')[0],
    modules,
  };
}

function validateOutlineStructure(plan) {
  if (!plan?.title?.trim()) throw new Error('AI course plan is missing a title.');
  if (!plan?.shortDescription?.trim()) throw new Error('AI course plan is missing a short description.');
  if (!plan?.description?.trim()) throw new Error('AI course plan is missing a description.');
  if (!Array.isArray(plan.modules) || !plan.modules.length) {
    throw new Error('AI course plan must include at least one module.');
  }
  if (!plan.categoryName?.trim()) {
    throw new Error('AI course plan is missing a category.');
  }

  const modules = plan.modules.map((module, moduleIndex) => {
    if (!module?.title?.trim()) {
      throw new Error(`Module ${moduleIndex + 1} is missing a title.`);
    }
    if (!Array.isArray(module.lessons) || !module.lessons.length) {
      throw new Error(`Module "${module.title}" must include at least one lesson.`);
    }

    const lessons = module.lessons.map((lesson, lessonIndex) => {
      if (!lesson?.title?.trim()) {
        throw new Error(`Lesson ${lessonIndex + 1} in "${module.title}" is missing a title.`);
      }
      const type = inferLessonType(lesson);
      if (!ALLOWED_LESSON_TYPES.includes(type)) {
        throw new Error(`Unsupported lesson type in "${lesson.title}".`);
      }
      return {
        type,
        title: lesson.title.trim(),
        description: lesson.description?.trim() || '',
        durationMinutes: Number(lesson.durationMinutes) || 10,
        completionXpReward: Number(lesson.completionXpReward) || 15,
      };
    });

    return {
      title: module.title.trim(),
      description: module.description?.trim() || '',
      lessons,
    };
  });

  return {
    title: plan.title.trim(),
    shortDescription: plan.shortDescription.trim(),
    description: plan.description.trim(),
    categoryName: plan.categoryName.trim(),
    level: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(plan.level)
      ? plan.level
      : 'BEGINNER',
    estimatedMinutes: Number(plan.estimatedMinutes) || 0,
    completionXpReward: Number(plan.completionXpReward) || 200,
    skillName: plan.skillName?.trim() || plan.title.split(' ')[0],
    modules,
  };
}

function shouldRetryOutline(error) {
  const message = error?.message || '';
  return (
    message.includes('valid JSON') ||
    message.includes('JSON') ||
    message.includes('empty output') ||
    message.includes('AI course plan') ||
    message.includes('Module ') ||
    message.includes('Lesson ')
  );
}

function emitProgress(onProgress, payload) {
  if (typeof onProgress === 'function') {
    onProgress(payload);
  }
}

async function generateCourseOutline(payload, userId, onProgress) {
  const { generateAiText } = require('./aiService');
  const attempts = [
    { buildPrompt: buildCourseOutlinePrompt, maxOutputTokens: 8192 },
    { buildPrompt: buildCompactOutlinePrompt, maxOutputTokens: 4096 },
  ];

  emitProgress(onProgress, {
    step: 'outline',
    message: 'Planning course structure…',
  });

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const output = await generateAiText(attempt.buildPrompt(payload), {
        userId,
        type: 'course_plan',
        maxOutputTokens: attempt.maxOutputTokens,
      });
      const parsed = extractJsonObject(output);
      const outline = validateOutlineStructure(parsed);
      const lessonTotal = outline.modules.reduce((count, module) => count + module.lessons.length, 0);

      emitProgress(onProgress, {
        step: 'outline',
        message: `Outline ready — ${outline.modules.length} modules, ${lessonTotal} lessons`,
        moduleTotal: outline.modules.length,
        lessonTotal,
        modules: outline.modules.map((module) => ({
          title: module.title,
          lessons: module.lessons.map((lesson) => ({
            type: lesson.type,
            title: lesson.title,
          })),
        })),
      });

      return outline;
    } catch (error) {
      lastError = error;
      if (!shouldRetryOutline(error)) throw error;
      console.warn('[courseAiService] Outline attempt failed, retrying:', error.message);
      emitProgress(onProgress, {
        step: 'outline',
        message: 'Retrying outline…',
      });
    }
  }

  throw lastError || new Error('AI did not return a valid course outline.');
}

async function enrichArticleLesson(lesson, context, userId) {
  const { generateAiText } = require('./aiService');
  try {
    const output = await generateAiText(buildArticlePrompt(lesson, context), {
      userId,
      type: 'generic',
      maxOutputTokens: 4096,
    });
    const articleHtml = stripMarkdownFences(output);
    if (articleHtml.length < 120) throw new Error('Article too short.');
    return { ...lesson, articleHtml };
  } catch (error) {
    console.warn(`[courseAiService] Article "${lesson.title}" fallback:`, error.message);
    return { ...lesson, articleHtml: buildFallbackArticleHtml(lesson.title, lesson.description) };
  }
}

async function enrichQuizLesson(lesson, context, userId) {
  const { generateAiText } = require('./aiService');
  try {
    const output = await generateAiText(buildQuizPrompt(lesson, context), {
      userId,
      type: 'course_module_content',
      maxOutputTokens: 2048,
    });
    const parsed = extractJsonObject(output);
    const questions = asArray(parsed.questions).map(normalizeQuizQuestion);
    if (questions.length < 2) throw new Error('Not enough quiz questions.');
    return { ...lesson, questions };
  } catch (error) {
    console.warn(`[courseAiService] Quiz "${lesson.title}" fallback:`, error.message);
    return { ...lesson, questions: buildFallbackQuizQuestions(lesson.title) };
  }
}

async function enrichCodingLesson(lesson, context, userId) {
  const { generateAiText } = require('./aiService');
  try {
    const output = await generateAiText(buildCodingPrompt(lesson, context), {
      userId,
      type: 'course_module_content',
      maxOutputTokens: 4096,
    });
    const parsed = extractJsonObject(output);
    return {
      ...lesson,
      problemTitle: lesson.title,
      problemStatement: parsed.problemStatement || lesson.description,
      instructions: parsed.instructions || '',
      htmlStarter: parsed.htmlStarter || '',
      cssStarter: parsed.cssStarter || '',
      javascriptStarter: parsed.javascriptStarter || '',
      hints: asArray(parsed.hints),
      visibleTestCases: normalizeTestCases(parsed.visibleTestCases),
      hiddenTestCases: normalizeTestCases(parsed.hiddenTestCases),
      passingThreshold: Number(parsed.passingThreshold) || 100,
    };
  } catch (error) {
    console.warn(`[courseAiService] Coding "${lesson.title}" fallback:`, error.message);
    return { ...lesson, problemTitle: lesson.title, ...buildFallbackCodingContent(context.courseTitle, lesson.title) };
  }
}

async function enrichLesson(lesson, context, userId) {
  if (lesson.type === 'ARTICLE') return enrichArticleLesson(lesson, context, userId);
  if (lesson.type === 'QUIZ') return enrichQuizLesson(lesson, context, userId);
  if (lesson.type === 'CODING') return enrichCodingLesson(lesson, context, userId);
  if (lesson.type === 'VIDEO') {
    return {
      ...lesson,
      videoUrl: '',
      description:
        lesson.description ||
        `Video walkthrough for ${lesson.title}. Add a video URL when ready.`,
    };
  }
  return lesson;
}

async function generateCoursePlanFromAi(payload, userId, options = {}) {
  const onProgress = options.onProgress;
  const outline = await generateCourseOutline(payload, userId, onProgress);
  const enrichedModules = [];
  const lessonTotal = outline.modules.reduce((count, module) => count + module.lessons.length, 0);
  let lessonCounter = 0;

  emitProgress(onProgress, {
    step: 'writing',
    message: 'Writing lesson content…',
    lessonTotal,
    moduleTotal: outline.modules.length,
  });

  for (let moduleIndex = 0; moduleIndex < outline.modules.length; moduleIndex += 1) {
    const module = outline.modules[moduleIndex];
    const context = {
      courseTitle: outline.title,
      courseBrief: outline.description,
      level: outline.level,
      moduleTitle: module.title,
      moduleIndex,
      moduleTotal: outline.modules.length,
    };

    emitProgress(onProgress, {
      step: 'writing',
      phase: 'module',
      moduleIndex,
      moduleTotal: outline.modules.length,
      moduleTitle: module.title,
      message: `Module ${moduleIndex + 1}/${outline.modules.length}: ${module.title}`,
    });

    console.info(
      `[courseAiService] Module ${moduleIndex + 1}/${outline.modules.length}: ${module.title} (${module.lessons.length} lessons)`,
    );

    const lessons = [];
    for (let lessonIndex = 0; lessonIndex < module.lessons.length; lessonIndex += 1) {
      const lesson = module.lessons[lessonIndex];
      lessonCounter += 1;

      emitProgress(onProgress, {
        step: 'writing',
        phase: 'lesson',
        moduleIndex,
        moduleTotal: outline.modules.length,
        moduleTitle: module.title,
        lessonIndex,
        moduleLessonCount: module.lessons.length,
        lessonCounter,
        lessonTotal,
        lessonType: lesson.type,
        lessonTitle: lesson.title,
        message: `Writing lesson ${lessonCounter}/${lessonTotal}: ${lesson.title}`,
      });

      console.info(
        `[courseAiService] Writing lesson ${lessonCounter}/${lessonTotal}: [${lesson.type}] ${lesson.title}`,
      );

      lessons.push(await enrichLesson(lesson, context, userId));

      emitProgress(onProgress, {
        step: 'writing',
        phase: 'lesson_done',
        moduleIndex,
        lessonIndex,
        lessonCounter,
        lessonTotal,
        lessonType: lesson.type,
        lessonTitle: lesson.title,
      });
    }

    enrichedModules.push({ ...module, lessons });
  }

  return validateCoursePlan({
    ...outline,
    modules: enrichedModules,
  });
}

module.exports = {
  buildCourseOutlinePrompt,
  extractJsonObject,
  validateCoursePlan,
  normalizeQuizQuestion,
  generateCoursePlanFromAi,
};
