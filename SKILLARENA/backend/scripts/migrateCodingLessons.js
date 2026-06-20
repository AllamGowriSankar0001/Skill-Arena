const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const {
  Course,
  Lesson,
  Assessment,
  Question,
  QuestionSolution,
} = require('../src/models');

const CODING_LANGUAGES = ['HTML', 'CSS', 'JavaScript'];

const DEFAULT_CODING = {
  problemTitle: 'Build a greeting card',
  problemStatement:
    'Create an HTML page with a centered heading that says "Welcome to Skill Arena" and style it with CSS.',
  instructions: 'Use an h1 element and center the text with CSS text-align.',
  htmlStarter: '<!-- Write your HTML here -->\n<h1>Welcome to Skill Arena</h1>',
  cssStarter: '/* Write your CSS here */\nh1 {\n  \n}',
  javascriptStarter: '// Optional JavaScript\n',
  visibleTestCases: [
    { type: 'ELEMENT_EXISTS', selector: 'h1', label: 'Has h1 element' },
    {
      type: 'TEXT_CONTAINS',
      selector: 'h1',
      expected: 'Welcome to Skill Arena',
      label: 'Heading text',
    },
    {
      type: 'STYLE_EQUALS',
      selector: 'h1',
      property: 'text-align',
      expected: 'center',
      label: 'Centered heading',
    },
  ],
  hiddenTestCases: [
    { type: 'ELEMENT_COUNT', selector: 'h1', expected: 1, label: 'Single heading' },
  ],
  hints: ['Start with a basic h1 tag.', 'Use text-align: center in your CSS rule for h1.'],
  referenceHtml: '<h1>Welcome to Skill Arena</h1>',
  referenceCss: 'h1 { text-align: center; }',
  referenceJavascript: '',
  solutionExplanation: 'A single h1 with text-align:center satisfies all requirements.',
  passingThreshold: 100,
};

async function migrateCodingLessons() {
  await connectDB();

  const codingLessons = await Lesson.find({ type: 'CODING' });
  let migrated = 0;
  let skipped = 0;

  for (const lesson of codingLessons) {
    if (lesson.assessmentId) {
      skipped += 1;
      continue;
    }

    const course = await Course.findById(lesson.courseId);
    const skillId = course?.skillIds?.[0];
    if (!skillId) {
      console.warn(`Skipping ${lesson.title} — course has no skill.`);
      if (lesson.status === 'PUBLISHED') {
        lesson.status = 'DRAFT';
        await lesson.save();
      }
      continue;
    }

    const data = DEFAULT_CODING;

    const assessment = await Assessment.create({
      title: data.problemTitle,
      description: data.instructions,
      type: 'LESSON_QUIZ',
      mode: 'CODING',
      courseId: lesson.courseId,
      moduleId: lesson.moduleId,
      lessonId: lesson._id,
      difficulty: 'MEDIUM',
      xpReward: lesson.completionXpReward || 45,
      passingPercentage: data.passingThreshold,
      status: lesson.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      createdBy: course.instructorId,
    });

    const question = await Question.create({
      type: 'CODING',
      skillId,
      courseId: lesson.courseId,
      difficulty: 'MEDIUM',
      title: data.problemTitle,
      prompt: data.problemStatement,
      codingDetails: {
        supportedLanguages: CODING_LANGUAGES,
        starterCode: [
          { language: 'HTML', code: data.htmlStarter },
          { language: 'CSS', code: data.cssStarter },
          { language: 'JavaScript', code: data.javascriptStarter },
        ],
        instructions: data.instructions,
        hints: data.hints,
        visibleTestCases: data.visibleTestCases,
        sampleTestCases: data.visibleTestCases,
      },
      status: lesson.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      createdBy: course.instructorId,
    });

    await QuestionSolution.create({
      questionId: question._id,
      explanation: data.solutionExplanation,
      codingSolution: {
        referenceSolutions: [
          { language: 'HTML', code: data.referenceHtml },
          { language: 'CSS', code: data.referenceCss },
          { language: 'JavaScript', code: data.referenceJavascript },
        ],
        hiddenTestCases: data.hiddenTestCases,
      },
    });

    assessment.questions.push({ questionId: question._id, order: 0, points: 100 });
    await assessment.save();

    lesson.assessmentId = assessment._id;
    await lesson.save();
    migrated += 1;
    console.log(`Migrated coding lesson: ${lesson.title}`);
  }

  console.log(`Done. Migrated ${migrated}, skipped ${skipped} (already had assessment).`);
  await mongoose.disconnect();
}

migrateCodingLessons().catch((error) => {
  console.error(error);
  process.exit(1);
});
