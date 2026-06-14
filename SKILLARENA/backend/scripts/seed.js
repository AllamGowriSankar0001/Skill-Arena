const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const {
  User,
  Category,
  Skill,
  Course,
  CourseModule,
  Lesson,
  DailyChallenge,
  Assessment,
  Achievement,
} = require('../src/models');

async function seed() {
  await connectDB();

  const existingCourses = await Course.countDocuments();
  if (existingCourses > 0) {
    console.log('Seed skipped — platform content already exists.');
    await mongoose.disconnect();
    return;
  }

  const admin = await User.findOne({ role: 'STUDENT' }).sort({ createdAt: 1 });
  const instructorId = admin?._id;

  if (!instructorId) {
    console.log('Seed skipped — create a user account first, then run npm run seed.');
    await mongoose.disconnect();
    return;
  }

  const category = await Category.create({
    name: 'Web Development',
    slug: 'web-development',
    description: 'Build modern web applications.',
    sortOrder: 1,
    status: 'ACTIVE',
  });

  const jsSkill = await Skill.create({
    categoryId: category._id,
    name: 'JavaScript',
    slug: 'javascript',
    description: 'Core JavaScript programming skills.',
    status: 'ACTIVE',
  });

  const reactSkill = await Skill.create({
    categoryId: category._id,
    name: 'React',
    slug: 'react',
    description: 'Component-based UI development.',
    status: 'ACTIVE',
  });

  const nodeSkill = await Skill.create({
    categoryId: category._id,
    name: 'Node.js',
    slug: 'nodejs',
    description: 'Server-side JavaScript runtime.',
    status: 'ACTIVE',
  });

  const jsCourse = await Course.create({
    title: 'JavaScript Fundamentals',
    slug: 'javascript-fundamentals',
    shortDescription: 'Master the core building blocks of modern JavaScript.',
    description:
      'Learn variables, functions, arrays, objects, async patterns, and the foundations you need before battles and projects.',
    categoryId: category._id,
    skillIds: [jsSkill._id],
    instructorId,
    level: 'BEGINNER',
    estimatedMinutes: 480,
    completionXpReward: 250,
    learningOutcomes: [
      'Write clean JavaScript functions and control flow',
      'Work with arrays, objects, and modern syntax',
      'Understand promises and async/await',
    ],
    status: 'PUBLISHED',
    isFeatured: true,
    stats: {
      enrollmentCount: 0,
      moduleCount: 3,
      lessonCount: 6,
      ratingAverage: 4.8,
      ratingCount: 128,
    },
    publishedAt: new Date(),
  });

  const reactCourse = await Course.create({
    title: 'React for Beginners',
    slug: 'react-for-beginners',
    shortDescription: 'Build interactive UIs with components, props, and state.',
    description: 'A structured path from JSX basics to reusable React components.',
    categoryId: category._id,
    skillIds: [reactSkill._id],
    instructorId,
    level: 'BEGINNER',
    estimatedMinutes: 360,
    completionXpReward: 200,
    status: 'PUBLISHED',
    isFeatured: true,
    stats: {
      moduleCount: 2,
      lessonCount: 4,
      ratingAverage: 4.7,
      ratingCount: 96,
    },
    publishedAt: new Date(),
  });

  const nodeCourse = await Course.create({
    title: 'Node.js Essentials',
    slug: 'nodejs-essentials',
    shortDescription: 'Create APIs and backend services with Node.js and Express.',
    description: 'Learn how to build backend routes, connect databases, and serve data.',
    categoryId: category._id,
    skillIds: [nodeSkill._id],
    instructorId,
    level: 'INTERMEDIATE',
    estimatedMinutes: 420,
    completionXpReward: 220,
    status: 'PUBLISHED',
    stats: {
      moduleCount: 2,
      lessonCount: 4,
      ratingAverage: 4.6,
      ratingCount: 74,
    },
    publishedAt: new Date(),
  });

  const jsModule1 = await CourseModule.create({
    courseId: jsCourse._id,
    title: 'JavaScript Basics',
    order: 0,
    status: 'ACTIVE',
  });

  const jsModule2 = await CourseModule.create({
    courseId: jsCourse._id,
    title: 'Functions & Logic',
    order: 1,
    status: 'ACTIVE',
  });

  const jsModule3 = await CourseModule.create({
    courseId: jsCourse._id,
    title: 'Async JavaScript',
    order: 2,
    status: 'ACTIVE',
  });

  const jsLessons = await Lesson.insertMany([
    {
      courseId: jsCourse._id,
      moduleId: jsModule1._id,
      title: 'Variables and Data Types',
      slug: 'variables-and-data-types',
      type: 'ARTICLE',
      order: 0,
      durationMinutes: 20,
      completionXpReward: 25,
      status: 'PUBLISHED',
    },
    {
      courseId: jsCourse._id,
      moduleId: jsModule1._id,
      title: 'Arrays and Objects',
      slug: 'arrays-and-objects',
      type: 'VIDEO',
      order: 1,
      durationMinutes: 25,
      completionXpReward: 25,
      status: 'PUBLISHED',
    },
    {
      courseId: jsCourse._id,
      moduleId: jsModule2._id,
      title: 'Functions Deep Dive',
      slug: 'functions-deep-dive',
      type: 'ARTICLE',
      order: 0,
      durationMinutes: 30,
      completionXpReward: 30,
      status: 'PUBLISHED',
    },
    {
      courseId: jsCourse._id,
      moduleId: jsModule2._id,
      title: 'Conditionals and Loops Quiz',
      slug: 'conditionals-and-loops-quiz',
      type: 'QUIZ',
      order: 1,
      durationMinutes: 15,
      completionXpReward: 35,
      status: 'PUBLISHED',
    },
    {
      courseId: jsCourse._id,
      moduleId: jsModule3._id,
      title: 'Promises and Async/Await',
      slug: 'promises-and-async-await',
      type: 'VIDEO',
      order: 0,
      durationMinutes: 35,
      completionXpReward: 40,
      status: 'PUBLISHED',
    },
    {
      courseId: jsCourse._id,
      moduleId: jsModule3._id,
      title: 'Async Patterns Practice',
      slug: 'async-patterns-practice',
      type: 'CODING',
      order: 1,
      durationMinutes: 40,
      completionXpReward: 45,
      status: 'PUBLISHED',
    },
  ]);

  await Assessment.insertMany([
    {
      title: 'JavaScript Quick Drill',
      description: 'Five fast multiple-choice questions to warm up.',
      type: 'PRACTICE',
      mode: 'QUIZ',
      skillId: jsSkill._id,
      difficulty: 'EASY',
      xpReward: 30,
      status: 'PUBLISHED',
      createdBy: instructorId,
    },
    {
      title: 'Array Methods Challenge',
      description: 'Practice map, filter, and reduce with real prompts.',
      type: 'PRACTICE',
      mode: 'MIXED',
      skillId: jsSkill._id,
      difficulty: 'MEDIUM',
      xpReward: 45,
      status: 'PUBLISHED',
      createdBy: instructorId,
    },
    {
      title: 'React Components Quiz',
      description: 'Check your understanding of props, state, and JSX.',
      type: 'PRACTICE',
      mode: 'QUIZ',
      skillId: reactSkill._id,
      difficulty: 'EASY',
      xpReward: 35,
      status: 'PUBLISHED',
      createdBy: instructorId,
    },
  ]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  await DailyChallenge.create({
    title: 'Complete 5 JavaScript questions',
    description: 'Answer five JavaScript practice questions today.',
    challengeType: 'ANSWER_QUESTIONS',
    skillId: jsSkill._id,
    targetValue: 5,
    xpReward: 50,
    startAt: start,
    endAt: end,
    status: 'ACTIVE',
  });

  await Achievement.insertMany([
    {
      code: 'FIRST_LESSON',
      name: 'First Steps',
      description: 'Complete your first lesson.',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=first-lesson',
      category: 'LEARNING',
      criteria: { metric: 'LESSONS_COMPLETED', requiredValue: 1 },
      xpReward: 20,
      status: 'ACTIVE',
    },
    {
      code: 'FIRST_WIN',
      name: 'Arena Debut',
      description: 'Win your first battle.',
      iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=first-win',
      category: 'BATTLE',
      criteria: { metric: 'BATTLES_WON', requiredValue: 1 },
      xpReward: 50,
      status: 'ACTIVE',
    },
  ]);

  console.log('Seed complete.');
  console.log(`- Courses: JavaScript Fundamentals, React for Beginners, Node.js Essentials`);
  console.log(`- JS lessons: ${jsLessons.length}`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
