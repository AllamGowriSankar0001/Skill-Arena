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
  Question,
  QuestionSolution,
} = require('../src/models');

async function seedCommunityPosts(authorId) {
  const CommunityPost = require('../src/models/CommunityPost');
  if (!authorId) return;

  const count = await CommunityPost.countDocuments();
  if (count > 0) return;

  await CommunityPost.insertMany([
    {
      authorId,
      postType: 'DISCUSSION',
      category: 'CODING',
      title: 'Best way to prep for JS battles?',
      content:
        'I keep losing early-round JS duels even though I finish lessons fine. Do you drill practice sets first, or jump straight into ranked? Curious what worked for people who climbed Gold.',
      likeCount: 12,
      commentCount: 4,
    },
    {
      authorId,
      postType: 'WIN',
      category: 'BATTLES',
      title: 'First 3v3 squad win!',
      content:
        'Our squad finally synced roles — one on speed, one on accuracy, one on clutch tie-breakers. Down 2-1 and came back in the final round. Replay link below if anyone wants pointers.',
      linkUrl: 'https://skillarena.com/replays/demo-squad-win',
      likeCount: 28,
      commentCount: 7,
    },
    {
      authorId,
      postType: 'REPLAY',
      category: 'CODING',
      title: 'Close coding duel — array methods',
      content:
        'Shared a replay from a 1v1 where both of us missed the optimal map/filter chain. Good learning moment — happy to get roasted in the comments.',
      linkUrl: 'https://skillarena.com/replays/demo-coding-duel',
      likeCount: 19,
      commentCount: 3,
    },
    {
      authorId,
      postType: 'QUESTION',
      category: 'DESIGN',
      content:
        'Anyone running a design study lounge this week? Looking for folks doing Figma + accessibility modules together before the seasonal bracket.',
      likeCount: 8,
      commentCount: 2,
    },
    {
      authorId,
      postType: 'EVENT',
      category: 'GENERAL',
      title: 'Community Challenge Week — sign-ups open',
      content:
        'Seasonal challenge week starts Monday. Squad up, complete daily drills, and earn limited badges. Drop your squad name below if you are LFG.',
      likeCount: 34,
      commentCount: 11,
    },
    {
      authorId,
      postType: 'RESOURCE',
      category: 'CAREER',
      title: 'Resume tips thread',
      content:
        'Just shipped my resume through the Skill Arena builder and got callbacks. Sharing the structure that helped — ask anything about projects vs certifications.',
      likeCount: 15,
      commentCount: 5,
    },
  ]);

  console.log('- Community: sample posts created');
}

async function seed() {
  await connectDB();

  const admin = await User.findOne({ role: 'STUDENT' }).sort({ createdAt: 1 });
  const instructorId = admin?._id;

  const existingCourses = await Course.countDocuments();
  if (existingCourses > 0) {
    await seedCommunityPosts(instructorId);
    console.log('Seed skipped — platform content already exists.');
    await mongoose.disconnect();
    return;
  }

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

  const practiceSets = await Assessment.insertMany([
    {
      title: 'JavaScript Quick Drill',
      description: 'Five fast multiple-choice questions to warm up.',
      type: 'PRACTICE',
      mode: 'QUIZ',
      skillId: jsSkill._id,
      difficulty: 'EASY',
      xpReward: 30,
      passingPercentage: 70,
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
      passingPercentage: 75,
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
      passingPercentage: 70,
      status: 'PUBLISHED',
      createdBy: instructorId,
    },
    {
      title: 'Build a Profile Card',
      description: 'Create a responsive profile card with HTML, CSS, and JavaScript.',
      type: 'PRACTICE',
      mode: 'CODING',
      skillId: jsSkill._id,
      difficulty: 'MEDIUM',
      xpReward: 50,
      passingPercentage: 100,
      status: 'PUBLISHED',
      createdBy: instructorId,
    },
  ]);

  const mcqBank = [
    {
      prompt: 'Which keyword declares a block-scoped variable in JavaScript?',
      options: [
        { optionId: 'opt-1', text: 'var' },
        { optionId: 'opt-2', text: 'let' },
        { optionId: 'opt-3', text: 'define' },
        { optionId: 'opt-4', text: 'static' },
      ],
      correctOptionId: 'opt-2',
      explanation: '`let` creates block-scoped variables, unlike `var`.',
    },
    {
      prompt: 'What does `Array.prototype.map()` return?',
      options: [
        { optionId: 'opt-1', text: 'The original array mutated in place' },
        { optionId: 'opt-2', text: 'A new array with transformed values' },
        { optionId: 'opt-3', text: 'A boolean indicating success' },
        { optionId: 'opt-4', text: 'The first matching element' },
      ],
      correctOptionId: 'opt-2',
      explanation: '`map` always returns a new array without mutating the source array.',
    },
    {
      prompt: 'Which method creates a shallow copy of an array?',
      options: [
        { optionId: 'opt-1', text: 'Array.push()' },
        { optionId: 'opt-2', text: 'Array.slice()' },
        { optionId: 'opt-3', text: 'Array.sort()' },
        { optionId: 'opt-4', text: 'Array.pop()' },
      ],
      correctOptionId: 'opt-2',
      explanation: '`slice()` returns a shallow copy; spread syntax `[...arr]` works too.',
    },
    {
      prompt: 'What is JSX in React?',
      options: [
        { optionId: 'opt-1', text: 'A JavaScript database driver' },
        { optionId: 'opt-2', text: 'A syntax extension that looks like HTML in JavaScript' },
        { optionId: 'opt-3', text: 'A CSS preprocessor' },
        { optionId: 'opt-4', text: 'A testing library' },
      ],
      correctOptionId: 'opt-2',
      explanation: 'JSX is syntactic sugar compiled to `React.createElement` calls.',
    },
    {
      prompt: 'In React, props are best described as…',
      options: [
        { optionId: 'opt-1', text: 'Internal mutable state' },
        { optionId: 'opt-2', text: 'Read-only inputs passed from parent to child' },
        { optionId: 'opt-3', text: 'Global variables on `window`' },
        { optionId: 'opt-4', text: 'Database connection strings' },
      ],
      correctOptionId: 'opt-2',
      explanation: 'Props flow down the component tree and should be treated as immutable.',
    },
    {
      prompt: 'Which array method filters elements based on a predicate?',
      options: [
        { optionId: 'opt-1', text: 'reduce' },
        { optionId: 'opt-2', text: 'filter' },
        { optionId: 'opt-3', text: 'forEach' },
        { optionId: 'opt-4', text: 'join' },
      ],
      correctOptionId: 'opt-2',
      explanation: '`filter` returns all elements for which the callback returns a truthy value.',
    },
    {
      prompt: 'What hook stores local component state in a function component?',
      options: [
        { optionId: 'opt-1', text: 'useMemo' },
        { optionId: 'opt-2', text: 'useState' },
        { optionId: 'opt-3', text: 'useRef' },
        { optionId: 'opt-4', text: 'useContext' },
      ],
      correctOptionId: 'opt-2',
      explanation: '`useState` returns a state value and an updater function.',
    },
  ];

  async function attachMcqToAssessment(assessment, prompts, skillId) {
    const entries = [];
    for (let index = 0; index < prompts.length; index += 1) {
      const item = prompts[index];
      const question = await Question.create({
        type: 'SINGLE_CHOICE',
        skillId,
        difficulty: assessment.difficulty,
        prompt: item.prompt,
        options: item.options,
        status: 'PUBLISHED',
        createdBy: instructorId,
      });
      await QuestionSolution.create({
        questionId: question._id,
        correctOptionIds: [item.correctOptionId],
        explanation: item.explanation,
      });
      entries.push({ questionId: question._id, order: index, points: 10 });
    }
    assessment.questions = entries;
    await assessment.save();
  }

  await attachMcqToAssessment(practiceSets[0], mcqBank.slice(0, 3), jsSkill._id);
  await attachMcqToAssessment(practiceSets[1], mcqBank.slice(1, 5), jsSkill._id);
  await attachMcqToAssessment(practiceSets[2], mcqBank.slice(3, 6), reactSkill._id);

  const codingQuestion = await Question.create({
    type: 'CODING',
    skillId: jsSkill._id,
    difficulty: 'MEDIUM',
    title: 'Profile Card',
    prompt: 'Build a profile card with a name, role, and a button that updates the greeting in the preview.',
    codingDetails: {
      supportedLanguages: ['HTML', 'CSS', 'JavaScript'],
      starterCode: [
        { language: 'HTML', code: '<div class="card">\n  <h1 id="name">Your Name</h1>\n  <p id="role">Your Role</p>\n  <button id="cta">Say hello</button>\n  <p id="greeting"></p>\n</div>' },
        { language: 'CSS', code: '.card {\n  padding: 1rem;\n  border-radius: 0.75rem;\n  background: #fff;\n  max-width: 16rem;\n}\n\nbutton {\n  margin-top: 0.5rem;\n}' },
        { language: 'JavaScript', code: "const button = document.querySelector('#cta');\nconst greeting = document.querySelector('#greeting');\n\nbutton.addEventListener('click', () => {\n  greeting.textContent = 'Hello from Skill Arena!';\n});" },
      ],
      instructions: 'Style the card and wire the button so the greeting appears when clicked.',
      expectedOutputDescription: 'Clicking the button should set the greeting text.',
      hints: ['Use querySelector to grab the button and greeting elements.'],
      visibleTestCases: [
        { type: 'dom', selector: '.card', label: 'Profile card container exists' },
        { type: 'dom', selector: '#cta', label: 'Call-to-action button exists' },
      ],
      sampleTestCases: [
        { type: 'dom', selector: '.card', label: 'Profile card container exists' },
        { type: 'dom', selector: '#cta', label: 'Call-to-action button exists' },
      ],
    },
    status: 'PUBLISHED',
    createdBy: instructorId,
  });

  await QuestionSolution.create({
    questionId: codingQuestion._id,
    explanation: 'A valid solution renders a card, button, and updates greeting text on click.',
    codingSolution: {
      hiddenTestCases: [
        { type: 'dom', selector: '#greeting', label: 'Greeting element exists' },
      ],
    },
  });

  practiceSets[3].questions = [{ questionId: codingQuestion._id, order: 0, points: 100 }];
  await practiceSets[3].save();

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
  await seedCommunityPosts(instructorId);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
