const Category = require('../models/Category');
const Skill = require('../models/Skill');
const Course = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const Lesson = require('../models/Lesson');
const Assessment = require('../models/Assessment');
const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const BlogPost = require('../models/BlogPost');
const User = require('../models/User');
const UserStats = require('../models/UserStats');
const Resume = require('../models/Resume');
const Enrollment = require('../models/Enrollment');
const LessonProgress = require('../models/LessonProgress');
const Battle = require('../models/Battle');
const DailyChallenge = require('../models/DailyChallenge');
const MatchmakingTicket = require('../models/MatchmakingTicket');
const { slugify, uniqueSlug } = require('../utils/slugify');
const { USER_ROLES, USER_STATUSES } = require('../constants/enums');
const { rankFromLevel, calculateLevelProgress } = require('../utils/level');

const formatCourse = (course) => ({
  id: course._id.toString(),
  title: course.title,
  slug: course.slug,
  shortDescription: course.shortDescription,
  description: course.description,
  categoryId: course.categoryId?._id?.toString() || course.categoryId?.toString(),
  categoryName: course.categoryId?.name || null,
  level: course.level,
  status: course.status,
  moduleCount: course.stats?.moduleCount ?? 0,
  lessonCount: course.stats?.lessonCount ?? 0,
  ratingAverage: course.stats?.ratingAverage ?? 0,
  publishedAt: course.publishedAt,
  createdAt: course.createdAt,
  updatedAt: course.updatedAt,
});

const formatModule = (moduleDoc) => ({
  id: moduleDoc._id.toString(),
  courseId: moduleDoc.courseId.toString(),
  title: moduleDoc.title,
  description: moduleDoc.description || '',
  order: moduleDoc.order,
  status: moduleDoc.status,
  lessonCount: moduleDoc.lessonCount ?? 0,
});

const formatLesson = (lesson) => ({
  id: lesson._id.toString(),
  courseId: lesson.courseId.toString(),
  moduleId: lesson.moduleId.toString(),
  title: lesson.title,
  slug: lesson.slug,
  description: lesson.description || '',
  type: lesson.type,
  order: lesson.order,
  durationMinutes: lesson.durationMinutes,
  status: lesson.status,
  content: lesson.content,
  assessmentId: lesson.assessmentId?.toString() || null,
});

const syncCourseStats = async (courseId) => {
  const [moduleCount, lessonCount] = await Promise.all([
    CourseModule.countDocuments({ courseId, status: 'ACTIVE' }),
    Lesson.countDocuments({ courseId, status: { $ne: 'ARCHIVED' } }),
  ]);

  await Course.findByIdAndUpdate(courseId, {
    $set: {
      'stats.moduleCount': moduleCount,
      'stats.lessonCount': lessonCount,
    },
  });
};

const deleteQuestionsIfOrphaned = async (questionIds) => {
  const uniqueIds = [...new Set(questionIds.map((id) => id.toString()))];
  if (!uniqueIds.length) return;

  await Promise.all(
    uniqueIds.map(async (questionId) => {
      const stillUsed = await Assessment.countDocuments({ 'questions.questionId': questionId });
      if (stillUsed) return;

      await Promise.all([
        QuestionSolution.deleteMany({ questionId }),
        Question.findByIdAndDelete(questionId),
      ]);
    }),
  );
};

const deleteAssessmentRecord = async (assessment) => {
  const questionIds = assessment.questions.map((entry) => entry.questionId);
  const assessmentId = assessment._id;

  await Promise.all([
    AssessmentAttempt.deleteMany({ assessmentId }),
    DailyChallenge.updateMany({ assessmentId }, { $unset: { assessmentId: 1 } }),
    Assessment.findByIdAndDelete(assessmentId),
  ]);

  await deleteQuestionsIfOrphaned(questionIds);
};

const deleteLessonsAndResources = async (lessonIds) => {
  if (!lessonIds.length) return;

  const assessments = await Assessment.find({ lessonId: { $in: lessonIds } });

  await LessonProgress.deleteMany({ lessonId: { $in: lessonIds } });

  for (const assessment of assessments) {
    await deleteAssessmentRecord(assessment);
  }

  await Lesson.deleteMany({ _id: { $in: lessonIds } });
};

const formatBlogPost = (post, includeContent = false) => ({
  id: post._id.toString(),
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  content: includeContent ? post.content : undefined,
  coverImageUrl: post.coverImageUrl || null,
  authorId: post.authorId?._id?.toString() || post.authorId?.toString(),
  authorName: post.authorId?.name || null,
  status: post.status,
  publishedAt: post.publishedAt,
  tags: post.tags || [],
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

const formatAssessment = (assessment) => ({
  id: assessment._id.toString(),
  title: assessment.title,
  description: assessment.description,
  type: assessment.type,
  mode: assessment.mode,
  skillId: assessment.skillId?._id?.toString() || assessment.skillId?.toString(),
  skillName: assessment.skillId?.name || null,
  difficulty: assessment.difficulty,
  questionCount: assessment.questions?.length ?? 0,
  xpReward: assessment.xpReward,
  status: assessment.status,
  createdAt: assessment.createdAt,
  updatedAt: assessment.updatedAt,
});

const getOverview = async () => {
  const [courseCount, publishedCourseCount, practiceCount, questionCount] = await Promise.all([
    Course.countDocuments(),
    Course.countDocuments({ status: 'PUBLISHED' }),
    Assessment.countDocuments({ type: 'PRACTICE' }),
    Question.countDocuments(),
  ]);

  return {
    courseCount,
    publishedCourseCount,
    practiceCount,
    questionCount,
  };
};

const listCategories = async () => {
  let categories = await Category.find({ status: 'ACTIVE' }).sort({ sortOrder: 1, name: 1 });

  if (categories.length === 0) {
    const created = await Category.create({
      name: 'Web Development',
      slug: 'web-development',
      description: 'Default learning category',
      sortOrder: 1,
      status: 'ACTIVE',
    });

    const skill = await Skill.findOne({ status: 'ACTIVE' });
    if (!skill) {
      await Skill.create({
        categoryId: created._id,
        name: 'General Skills',
        slug: 'general-skills',
        description: 'Default skill area',
        status: 'ACTIVE',
      });
    }

    categories = [created];
  }

  return categories.map((category) => ({
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
  }));
};

const formatCategory = (category) => ({
  id: category._id.toString(),
  name: category.name,
  slug: category.slug,
});

const createCategory = async (payload) => {
  const name = payload.name?.trim();
  if (!name) {
    throw new Error('Category name is required.');
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Category.findOne({
    name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    status: 'ACTIVE',
  });
  if (existing) {
    return formatCategory(existing);
  }

  const latest = await Category.findOne({ status: 'ACTIVE' }).sort({ sortOrder: -1 }).select('sortOrder');
  const slug = await uniqueSlug(Category, slugify(name));
  const category = await Category.create({
    name,
    slug,
    description: payload.description?.trim() || '',
    sortOrder: (latest?.sortOrder ?? 0) + 1,
    status: 'ACTIVE',
  });

  return formatCategory(category);
};

const listSkills = async () => {
  let skills = await Skill.find({ status: 'ACTIVE' }).sort({ name: 1 });

  if (skills.length === 0) {
    const category = await Category.findOne({ status: 'ACTIVE' });
    if (category) {
      const created = await Skill.create({
        categoryId: category._id,
        name: 'General Skills',
        slug: 'general-skills',
        description: 'Default skill area',
        status: 'ACTIVE',
      });
      skills = [created];
    }
  }

  return skills.map((skill) => ({
    id: skill._id.toString(),
    name: skill.name,
    slug: skill.slug,
    categoryId: skill.categoryId?.toString(),
  }));
};

const formatSkill = (skill) => ({
  id: skill._id.toString(),
  name: skill.name,
  slug: skill.slug,
  categoryId: skill.categoryId?.toString(),
});

const getDefaultCategoryId = async () => {
  const categories = await listCategories();
  if (!categories.length) {
    throw new Error('No category available for skills.');
  }
  return categories[0].id;
};

const createSkill = async (payload) => {
  const name = payload.name?.trim();
  if (!name) {
    throw new Error('Skill name is required.');
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Skill.findOne({
    name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    status: 'ACTIVE',
  });
  if (existing) {
    return formatSkill(existing);
  }

  let categoryId = payload.categoryId;
  if (!categoryId) {
    categoryId = await getDefaultCategoryId();
  } else {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error('Category not found.');
    }
  }

  const slug = await uniqueSlug(Skill, slugify(name));
  const skill = await Skill.create({
    categoryId,
    name,
    slug,
    description: payload.description?.trim() || '',
    status: 'ACTIVE',
  });

  return formatSkill(skill);
};

const deleteSkill = async (skillId) => {
  const skill = await Skill.findOne({ _id: skillId, status: 'ACTIVE' });
  if (!skill) {
    throw new Error('Skill not found.');
  }

  const [
    assessmentCount,
    questionCount,
    courseCount,
    battleCount,
    dailyChallengeCount,
    matchmakingCount,
  ] = await Promise.all([
    Assessment.countDocuments({ skillId }),
    Question.countDocuments({ skillId }),
    Course.countDocuments({ skillIds: skillId }),
    Battle.countDocuments({ skillId }),
    DailyChallenge.countDocuments({ skillId }),
    MatchmakingTicket.countDocuments({ skillId }),
  ]);

  const usage = [
    { label: 'practice set(s)', count: assessmentCount },
    { label: 'question(s)', count: questionCount },
    { label: 'course(s)', count: courseCount },
    { label: 'battle(s)', count: battleCount },
    { label: 'daily challenge(s)', count: dailyChallengeCount },
    { label: 'matchmaking ticket(s)', count: matchmakingCount },
  ].filter((item) => item.count > 0);

  if (usage.length) {
    const summary = usage.map((item) => `${item.count} ${item.label}`).join(', ');
    throw new Error(`Cannot delete skill. It is used by ${summary}.`);
  }

  await Skill.findByIdAndDelete(skillId);
  return { id: skillId, name: skill.name };
};

const listCourses = async () => {
  const courses = await Course.find()
    .populate('categoryId', 'name')
    .sort({ updatedAt: -1 });

  return courses.map(formatCourse);
};

const createCourse = async (adminId, payload) => {
  const { title, shortDescription, description, categoryId, level, status } = payload;

  if (!title?.trim() || !shortDescription?.trim() || !description?.trim() || !categoryId) {
    throw new Error('Title, descriptions, and category are required.');
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error('Category not found.');
  }

  const baseSlug = slugify(payload.slug || title);
  const slug = await uniqueSlug(Course, baseSlug);

  const course = await Course.create({
    title: title.trim(),
    slug,
    shortDescription: shortDescription.trim(),
    description: description.trim(),
    categoryId,
    skillIds: payload.skillIds || [],
    instructorId: adminId,
    level: level || 'BEGINNER',
    estimatedMinutes: payload.estimatedMinutes || 0,
    completionXpReward: payload.completionXpReward || 0,
    status: status || 'DRAFT',
    publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
  });

  const populated = await Course.findById(course._id).populate('categoryId', 'name');
  return formatCourse(populated);
};

const updateCourse = async (courseId, payload) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found.');
  }

  if (payload.title) course.title = payload.title.trim();
  if (payload.shortDescription) course.shortDescription = payload.shortDescription.trim();
  if (payload.description) course.description = payload.description.trim();
  if (payload.categoryId) course.categoryId = payload.categoryId;
  if (payload.level) course.level = payload.level;
  if (payload.status) {
    course.status = payload.status;
    if (payload.status === 'PUBLISHED' && !course.publishedAt) {
      course.publishedAt = new Date();
    }
  }

  if (payload.slug) {
    course.slug = await uniqueSlug(Course, slugify(payload.slug), course._id);
  }

  await course.save();
  const populated = await Course.findById(course._id).populate('categoryId', 'name');
  return formatCourse(populated);
};

const deleteCourse = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found.');
  }

  const assessments = await Assessment.find({ courseId }).select('_id questions.questionId');
  const assessmentIds = assessments.map((item) => item._id);
  const assessmentQuestionIds = assessments.flatMap((item) =>
    item.questions.map((entry) => entry.questionId),
  );

  await Promise.all([
    LessonProgress.deleteMany({ courseId }),
    Enrollment.deleteMany({ courseId }),
    Lesson.deleteMany({ courseId }),
    CourseModule.deleteMany({ courseId }),
    Assessment.deleteMany({ _id: { $in: assessmentIds } }),
    Question.deleteMany({
      $or: [{ courseId }, { _id: { $in: assessmentQuestionIds } }],
    }),
    Course.findByIdAndDelete(courseId),
  ]);

  return { id: courseId };
};

const listAssessments = async (type = 'PRACTICE') => {
  const assessments = await Assessment.find({ type })
    .populate('skillId', 'name')
    .sort({ updatedAt: -1 });

  return assessments.map(formatAssessment);
};

const createPracticeAssessment = async (adminId, payload) => {
  const { title, description, skillId, difficulty, mode, xpReward, status } = payload;

  if (!title?.trim() || !skillId) {
    throw new Error('Title and skill are required.');
  }

  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Skill not found.');
  }

  const assessment = await Assessment.create({
    title: title.trim(),
    description: description?.trim() || '',
    type: 'PRACTICE',
    mode: mode || 'QUIZ',
    skillId,
    difficulty: difficulty || 'MIXED',
    xpReward: xpReward || 25,
    status: status || 'DRAFT',
    createdBy: adminId,
  });

  const populated = await Assessment.findById(assessment._id).populate('skillId', 'name');
  return formatAssessment(populated);
};

const updateAssessment = async (assessmentId, payload) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    throw new Error('Assessment not found.');
  }

  if (payload.title) assessment.title = payload.title.trim();
  if (payload.description !== undefined) assessment.description = payload.description.trim();
  if (payload.skillId) assessment.skillId = payload.skillId;
  if (payload.difficulty) assessment.difficulty = payload.difficulty;
  if (payload.mode) assessment.mode = payload.mode;
  if (payload.xpReward !== undefined) assessment.xpReward = payload.xpReward;
  if (payload.status) assessment.status = payload.status;

  await assessment.save();
  const populated = await Assessment.findById(assessment._id).populate('skillId', 'name');
  return formatAssessment(populated);
};

const createQuestion = async (adminId, payload) => {
  const { prompt, skillId, difficulty, options, correctOptionId, explanation } = payload;

  if (!prompt?.trim() || !skillId || !options?.length || !correctOptionId) {
    throw new Error('Prompt, skill, options, and correct answer are required.');
  }

  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Skill not found.');
  }

  const question = await Question.create({
    type: 'SINGLE_CHOICE',
    skillId,
    difficulty: difficulty || 'EASY',
    prompt: prompt.trim(),
    options: options.map((option, index) => ({
      optionId: option.optionId || `opt-${index + 1}`,
      text: option.text.trim(),
    })),
    status: 'PUBLISHED',
    createdBy: adminId,
  });

  await QuestionSolution.create({
    questionId: question._id,
    correctOptionIds: [correctOptionId],
    explanation: explanation?.trim() || '',
  });

  return {
    id: question._id.toString(),
    prompt: question.prompt,
    skillId: question.skillId.toString(),
    difficulty: question.difficulty,
    options: question.options,
    status: question.status,
  };
};

const addQuestionToAssessment = async (assessmentId, payload) => {
  const { questionId, points } = payload;
  const assessment = await Assessment.findById(assessmentId);

  if (!assessment) {
    throw new Error('Assessment not found.');
  }

  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found.');
  }

  const alreadyLinked = assessment.questions.some(
    (entry) => entry.questionId.toString() === questionId,
  );

  if (alreadyLinked) {
    throw new Error('Question is already linked to this assessment.');
  }

  assessment.questions.push({
    questionId,
    order: assessment.questions.length,
    points: points || question.defaultPoints || 10,
  });

  await assessment.save();
  const populated = await Assessment.findById(assessment._id).populate('skillId', 'name');
  return formatAssessment(populated);
};

const listCourseModules = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found.');
  }

  const modules = await CourseModule.find({ courseId }).sort({ order: 1 });
  const lessonCounts = await Lesson.aggregate([
    { $match: { courseId: course._id, status: { $ne: 'ARCHIVED' } } },
    { $group: { _id: '$moduleId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(lessonCounts.map((row) => [row._id.toString(), row.count]));

  return modules.map((moduleDoc) =>
    formatModule({
      ...moduleDoc.toObject(),
      lessonCount: countMap.get(moduleDoc._id.toString()) ?? 0,
    }),
  );
};

const createModule = async (courseId, payload) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found.');
  }

  if (!payload.title?.trim()) {
    throw new Error('Module title is required.');
  }

  const existingCount = await CourseModule.countDocuments({ courseId });
  const order = payload.order ?? existingCount;

  const moduleDoc = await CourseModule.create({
    courseId,
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    order,
    status: payload.status || 'ACTIVE',
  });

  await syncCourseStats(courseId);
  return formatModule({ ...moduleDoc.toObject(), lessonCount: 0 });
};

const listModuleLessons = async (courseId, moduleId) => {
  const moduleDoc = await CourseModule.findOne({ _id: moduleId, courseId });
  if (!moduleDoc) {
    throw new Error('Module not found.');
  }

  const lessons = await Lesson.find({ courseId, moduleId }).sort({ order: 1 });
  return lessons.map(formatLesson);
};

const createLesson = async (courseId, moduleId, payload) => {
  const moduleDoc = await CourseModule.findOne({ _id: moduleId, courseId });
  if (!moduleDoc) {
    throw new Error('Module not found.');
  }

  if (!payload.title?.trim() || !payload.type) {
    throw new Error('Lesson title and type are required.');
  }

  const lessonCount = await Lesson.countDocuments({ moduleId });
  const order = payload.order ?? lessonCount;
  const baseSlug = slugify(payload.slug || payload.title);
  const slug = await uniqueSlug(Lesson, baseSlug);

  const lesson = await Lesson.create({
    courseId,
    moduleId,
    title: payload.title.trim(),
    slug,
    description: payload.description?.trim() || '',
    type: payload.type,
    content: payload.content || {},
    durationMinutes: payload.durationMinutes || 0,
    order,
    completionXpReward: payload.completionXpReward || 10,
    status: payload.status || 'DRAFT',
    isPreview: Boolean(payload.isPreview),
  });

  await syncCourseStats(courseId);
  return formatLesson(lesson);
};

const updateLesson = async (lessonId, payload) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new Error('Lesson not found.');
  }

  if (payload.title) lesson.title = payload.title.trim();
  if (payload.description !== undefined) lesson.description = payload.description.trim();
  if (payload.type) lesson.type = payload.type;
  if (payload.content) lesson.content = payload.content;
  if (payload.durationMinutes !== undefined) lesson.durationMinutes = payload.durationMinutes;
  if (payload.completionXpReward !== undefined) {
    lesson.completionXpReward = payload.completionXpReward;
  }
  if (payload.status) lesson.status = payload.status;
  if (payload.isPreview !== undefined) lesson.isPreview = payload.isPreview;

  if (payload.slug) {
    lesson.slug = await uniqueSlug(Lesson, slugify(payload.slug), lesson._id);
  }

  await lesson.save();
  await syncCourseStats(lesson.courseId);
  return formatLesson(lesson);
};

const createLessonQuiz = async (adminId, lessonId, payload) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new Error('Lesson not found.');
  }

  if (!payload.title?.trim()) {
    throw new Error('Quiz title is required.');
  }

  const assessment = await Assessment.create({
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    type: 'LESSON_QUIZ',
    mode: payload.mode || 'QUIZ',
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    lessonId: lesson._id,
    difficulty: payload.difficulty || 'MIXED',
    xpReward: payload.xpReward || 15,
    status: payload.status || 'DRAFT',
    createdBy: adminId,
  });

  lesson.type = 'QUIZ';
  lesson.assessmentId = assessment._id;
  await lesson.save();

  const populated = await Assessment.findById(assessment._id).populate('skillId', 'name');
  return {
    lesson: formatLesson(lesson),
    assessment: formatAssessment(populated),
  };
};

const deleteModule = async (courseId, moduleId) => {
  const moduleDoc = await CourseModule.findOne({ _id: moduleId, courseId });
  if (!moduleDoc) {
    throw new Error('Module not found.');
  }

  const lessons = await Lesson.find({ courseId, moduleId }).select('_id');
  await deleteLessonsAndResources(lessons.map((lesson) => lesson._id));
  await CourseModule.findByIdAndDelete(moduleId);
  await syncCourseStats(courseId);

  return { id: moduleId, courseId: courseId.toString() };
};

const deleteLesson = async (lessonId) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new Error('Lesson not found.');
  }

  await deleteLessonsAndResources([lesson._id]);
  await syncCourseStats(lesson.courseId);

  return {
    id: lessonId,
    courseId: lesson.courseId.toString(),
    moduleId: lesson.moduleId.toString(),
  };
};

const getAssessment = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId).populate('skillId', 'name');
  if (!assessment) {
    throw new Error('Assessment not found.');
  }

  const orderedEntries = [...assessment.questions].sort((a, b) => a.order - b.order);
  const questionIds = orderedEntries.map((entry) => entry.questionId);
  const [questions, solutions] = await Promise.all([
    Question.find({ _id: { $in: questionIds } }),
    QuestionSolution.find({ questionId: { $in: questionIds } }),
  ]);

  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));
  const solutionMap = new Map(
    solutions.map((solution) => [solution.questionId.toString(), solution]),
  );

  const formattedQuestions = orderedEntries
    .map((entry) => {
      const question = questionMap.get(entry.questionId.toString());
      if (!question) return null;
      const solution = solutionMap.get(entry.questionId.toString());
      return {
        id: question._id.toString(),
        prompt: question.prompt,
        difficulty: question.difficulty,
        options: question.options,
        correctOptionId: solution?.correctOptionIds?.[0] || null,
        explanation: solution?.explanation || '',
        points: entry.points,
        order: entry.order,
      };
    })
    .filter(Boolean);

  return {
    ...formatAssessment(assessment),
    courseId: assessment.courseId?.toString() || null,
    moduleId: assessment.moduleId?.toString() || null,
    lessonId: assessment.lessonId?.toString() || null,
    questions: formattedQuestions,
  };
};

const deleteAssessment = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    throw new Error('Assessment not found.');
  }

  if (assessment.lessonId) {
    await Lesson.findByIdAndUpdate(assessment.lessonId, {
      $unset: { assessmentId: 1 },
    });
  }

  await deleteAssessmentRecord(assessment);

  return {
    id: assessmentId,
    lessonId: assessment.lessonId?.toString() || null,
    courseId: assessment.courseId?.toString() || null,
  };
};

const removeQuestionFromAssessment = async (assessmentId, questionId) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    throw new Error('Assessment not found.');
  }

  const linked = assessment.questions.some(
    (entry) => entry.questionId.toString() === questionId.toString(),
  );
  if (!linked) {
    throw new Error('Question is not linked to this assessment.');
  }

  assessment.questions = assessment.questions
    .filter((entry) => entry.questionId.toString() !== questionId.toString())
    .map((entry, index) => ({
      questionId: entry.questionId,
      order: index,
      points: entry.points,
    }));

  await assessment.save();
  await deleteQuestionsIfOrphaned([questionId]);

  const populated = await Assessment.findById(assessmentId).populate('skillId', 'name');
  return getAssessment(populated._id);
};

const listBlogPosts = async () => {
  const posts = await BlogPost.find()
    .populate('authorId', 'name')
    .sort({ updatedAt: -1 });
  return posts.map((post) => formatBlogPost(post, true));
};

const createBlogPost = async (adminId, payload) => {
  const { title, excerpt, content, coverImageUrl, status, tags } = payload;

  if (!title?.trim() || !excerpt?.trim() || !content?.trim()) {
    throw new Error('Title, excerpt, and content are required.');
  }

  const baseSlug = slugify(payload.slug || title);
  const slug = await uniqueSlug(BlogPost, baseSlug);

  const post = await BlogPost.create({
    title: title.trim(),
    slug,
    excerpt: excerpt.trim(),
    content: content.trim(),
    coverImageUrl: coverImageUrl?.trim() || '',
    authorId: adminId,
    status: status || 'DRAFT',
    publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
  });

  const populated = await BlogPost.findById(post._id).populate('authorId', 'name');
  return formatBlogPost(populated, true);
};

const updateBlogPost = async (postId, payload) => {
  const post = await BlogPost.findById(postId);
  if (!post) {
    throw new Error('Blog post not found.');
  }

  if (payload.title) post.title = payload.title.trim();
  if (payload.excerpt) post.excerpt = payload.excerpt.trim();
  if (payload.content) post.content = payload.content.trim();
  if (payload.coverImageUrl !== undefined) post.coverImageUrl = payload.coverImageUrl.trim();
  if (payload.tags) post.tags = payload.tags.filter(Boolean);
  if (payload.status) {
    post.status = payload.status;
    if (payload.status === 'PUBLISHED' && !post.publishedAt) {
      post.publishedAt = new Date();
    }
  }

  if (payload.slug) {
    post.slug = await uniqueSlug(BlogPost, slugify(payload.slug), post._id);
  }

  await post.save();
  const populated = await BlogPost.findById(post._id).populate('authorId', 'name');
  return formatBlogPost(populated, true);
};

const deleteBlogPost = async (postId) => {
  const post = await BlogPost.findById(postId);
  if (!post) {
    throw new Error('Blog post not found.');
  }

  await BlogPost.deleteOne({ _id: post._id });
  return { id: post._id.toString(), title: post.title };
};

const formatAdminUserSummary = (user, stats) => {
  const base = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || null,
    role: user.role,
    status: user.status,
    onboardingCompleted: user.onboardingCompleted,
    lastActiveAt: user.lastActiveAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (user.role === 'ADMIN' || !stats) {
    return base;
  }

  const progress = calculateLevelProgress(stats.totalXp);

  return {
    ...base,
    xp: stats.totalXp,
    level: progress.level,
    currentStreak: stats.currentStreak,
    coursesEnrolled: stats.coursesEnrolled,
    battlesWon: stats.battlesWon,
    rank: rankFromLevel(progress.level),
  };
};

const listUsers = async (query = {}) => {
  const { search, role, status } = query;
  const filter = {};

  if (role && role !== 'ALL') {
    filter.role = role;
  }

  if (status && status !== 'ALL') {
    filter.status = status;
  } else {
    filter.status = { $ne: 'DELETED' };
  }

  if (search?.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .select(
      'name email avatarUrl role status onboardingCompleted lastActiveAt createdAt updatedAt',
    )
    .sort({ createdAt: -1 })
    .limit(250);

  const studentIds = users.filter((user) => user.role !== 'ADMIN').map((user) => user._id);
  const statsList = studentIds.length
    ? await UserStats.find({ userId: { $in: studentIds } })
    : [];
  const statsMap = new Map(statsList.map((entry) => [entry.userId.toString(), entry]));

  return users.map((user) => formatAdminUserSummary(user, statsMap.get(user._id.toString())));
};

const getUser = async (userId) => {
  const user = await User.findById(userId).select(
    'name email avatarUrl role status learningGoal onboardingCompleted lastActiveAt createdAt updatedAt',
  );

  if (!user) {
    throw new Error('User not found');
  }

  let stats = null;
  let resumeCount = 0;
  let enrollmentCount = 0;

  if (user.role !== 'ADMIN') {
    [stats, resumeCount, enrollmentCount] = await Promise.all([
      UserStats.findOne({ userId: user._id }),
      Resume.countDocuments({ userId: user._id }),
      Enrollment.countDocuments({ userId: user._id }),
    ]);
  }

  const summary = formatAdminUserSummary(user, stats);

  return {
    ...summary,
    learningGoal: user.learningGoal || '',
    resumeCount,
    enrollmentCount,
    stats: stats
      ? {
          totalXp: stats.totalXp,
          level: stats.level,
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          coursesEnrolled: stats.coursesEnrolled,
          coursesCompleted: stats.coursesCompleted,
          lessonsCompleted: stats.lessonsCompleted,
          battlesWon: stats.battlesWon,
          battlesPlayed: stats.battlesPlayed,
          assessmentsCompleted: stats.assessmentsCompleted,
        }
      : null,
  };
};

const updateUser = async (targetUserId, actingAdminId, payload) => {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  const actingId = actingAdminId.toString();
  const targetId = user._id.toString();

  if (targetId === actingId) {
    if (payload.status && payload.status !== 'ACTIVE') {
      throw new Error('You cannot block or delete your own account.');
    }
    if (payload.role && payload.role !== 'ADMIN') {
      throw new Error('You cannot change your own admin role.');
    }
  }

  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) {
      throw new Error('Name is required.');
    }
    user.name = name;
  }

  if (payload.role !== undefined) {
    if (!USER_ROLES.includes(payload.role)) {
      throw new Error('Invalid role.');
    }
    user.role = payload.role;
  }

  if (payload.status !== undefined) {
    if (!USER_STATUSES.includes(payload.status)) {
      throw new Error('Invalid status.');
    }
    user.status = payload.status;
  }

  await user.save();

  const stats = user.role !== 'ADMIN' ? await UserStats.findOne({ userId: user._id }) : null;
  return formatAdminUserSummary(user, stats);
};

const deleteUser = async (targetUserId, actingAdminId) => {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user._id.toString() === actingAdminId.toString()) {
    throw new Error('You cannot delete your own account.');
  }

  if (user.role === 'ADMIN') {
    throw new Error('Admin accounts cannot be deleted. Change the role first if needed.');
  }

  if (user.status === 'DELETED') {
    throw new Error('This user is already deleted.');
  }

  user.status = 'DELETED';
  await user.save();

  return { id: user._id.toString(), name: user.name, email: user.email };
};

module.exports = {
  getOverview,
  listCategories,
  createCategory,
  listSkills,
  createSkill,
  deleteSkill,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  listCourseModules,
  createModule,
  listModuleLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  createLessonQuiz,
  deleteModule,
  listAssessments,
  getAssessment,
  createPracticeAssessment,
  updateAssessment,
  deleteAssessment,
  createQuestion,
  addQuestionToAssessment,
  removeQuestionFromAssessment,
  listBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
};
