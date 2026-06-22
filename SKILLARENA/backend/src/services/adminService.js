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
const XPTransaction = require('../models/XPTransaction');
const Resume = require('../models/Resume');
const Enrollment = require('../models/Enrollment');
const LessonProgress = require('../models/LessonProgress');
const Battle = require('../models/Battle');
const DailyChallenge = require('../models/DailyChallenge');
const MatchmakingTicket = require('../models/MatchmakingTicket');
const { slugify, uniqueSlug } = require('../utils/slugify');
const { USER_ROLES, USER_STATUSES } = require('../constants/enums');
const { rankFromLevel, calculateLevelProgress } = require('../utils/level');
const lessonProgressService = require('./lessonProgressService');
const { generateCoursePlanFromAi } = require('./courseAiService');
const {
  generatePracticePlanFromAi,
  generatePracticeQuizQuestions,
  generatePracticeCodingChallenge,
} = require('./practiceAiService');
const {
  resolvePracticeSeriesForCreate,
  applyPracticeSeriesToAssessment,
  getPracticeSeriesParts,
  collectQuestionPromptsFromAssessments,
} = require('./practiceSeriesService');

const formatCourse = (course) => ({
  id: course._id.toString(),
  title: course.title,
  slug: course.slug,
  shortDescription: course.shortDescription,
  description: course.description,
  thumbnailUrl: course.thumbnailUrl || '',
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
  passingPercentage: assessment.passingPercentage ?? 70,
  status: assessment.status,
  seriesRootId: assessment.seriesRootId?.toString() || null,
  seriesPart: assessment.seriesPart || 1,
  seriesBaseTitle: assessment.seriesBaseTitle || null,
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

const deleteCategory = async (categoryId) => {
  const category = await Category.findOne({ _id: categoryId, status: 'ACTIVE' });
  if (!category) {
    throw new Error('Category not found.');
  }

  const courseCount = await Course.countDocuments({ categoryId: category._id });
  if (courseCount > 0) {
    throw new Error(
      `Cannot remove "${category.name}" — ${courseCount} course${courseCount === 1 ? '' : 's'} still use it.`,
    );
  }

  await Category.findByIdAndDelete(category._id);
  return { id: categoryId, name: category.name };
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
    thumbnailUrl: payload.thumbnailUrl?.trim() || '',
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
  if (payload.thumbnailUrl !== undefined) course.thumbnailUrl = payload.thumbnailUrl.trim();
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

  if (!title?.trim()) {
    throw new Error('Title is required.');
  }

  const seriesContext = await resolvePracticeSeriesForCreate(title.trim());
  let resolvedSkillId = skillId;

  if (!resolvedSkillId && seriesContext.rootAssessment?.skillId) {
    resolvedSkillId = seriesContext.rootAssessment.skillId;
  }

  if (!resolvedSkillId) {
    throw new Error('Skill is required.');
  }

  const skill = await Skill.findById(resolvedSkillId);
  if (!skill) {
    throw new Error('Skill not found.');
  }

  const assessment = await Assessment.create({
    title: title.trim(),
    description: description?.trim() || '',
    type: 'PRACTICE',
    mode: mode || seriesContext.rootAssessment?.mode || 'QUIZ',
    skillId: resolvedSkillId,
    difficulty: difficulty || seriesContext.rootAssessment?.difficulty || 'MIXED',
    xpReward: xpReward || 25,
    status: status || 'DRAFT',
    createdBy: adminId,
  });

  await applyPracticeSeriesToAssessment(assessment, seriesContext);

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
  if (payload.passingPercentage !== undefined) assessment.passingPercentage = payload.passingPercentage;
  if (payload.status) assessment.status = payload.status;

  await assessment.save();
  const populated = await Assessment.findById(assessment._id).populate('skillId', 'name');
  return formatAssessment(populated);
};

const createQuestion = async (adminId, payload) => {
  const {
    prompt,
    skillId,
    difficulty,
    options,
    correctOptionId,
    correctOptionIds,
    explanation,
    type,
  } = payload;

  const questionType = type || 'SINGLE_CHOICE';
  const resolvedCorrectIds = Array.isArray(correctOptionIds) && correctOptionIds.length
    ? correctOptionIds
    : correctOptionId
      ? [correctOptionId]
      : [];

  if (!prompt?.trim() || !skillId || !options?.length || !resolvedCorrectIds.length) {
    throw new Error('Prompt, skill, options, and correct answer are required.');
  }

  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Skill not found.');
  }

  const question = await Question.create({
    type: questionType,
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
    correctOptionIds: resolvedCorrectIds,
    explanation: explanation?.trim() || '',
  });

  return {
    id: question._id.toString(),
    prompt: question.prompt,
    skillId: question.skillId.toString(),
    difficulty: question.difficulty,
    type: question.type,
    options: question.options,
    status: question.status,
  };
};

const updateQuestion = async (questionId, payload) => {
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found.');
  }
  if (question.type === 'CODING') {
    throw new Error('Use the coding lesson editor to update coding questions.');
  }

  if (payload.prompt?.trim()) question.prompt = payload.prompt.trim();
  if (payload.difficulty) question.difficulty = payload.difficulty;
  if (Array.isArray(payload.options) && payload.options.length) {
    question.options = payload.options.map((option, index) => ({
      optionId: option.optionId || `opt-${index + 1}`,
      text: String(option.text || '').trim(),
    })).filter((option) => option.text);
  }

  await question.save();

  const solution = await QuestionSolution.findOne({ questionId: question._id });
  if (solution) {
    if (payload.correctOptionId) {
      solution.correctOptionIds = [payload.correctOptionId];
    }
    if (payload.explanation !== undefined) {
      solution.explanation = payload.explanation.trim();
    }
    await solution.save();
  }

  const updatedSolution = await QuestionSolution.findOne({ questionId: question._id });
  return {
    id: question._id.toString(),
    prompt: question.prompt,
    skillId: question.skillId.toString(),
    difficulty: question.difficulty,
    options: question.options,
    correctOptionId: updatedSolution?.correctOptionIds?.[0] || null,
    explanation: updatedSolution?.explanation || '',
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

  if (payload.status === 'PUBLISHED' && lesson.type === 'CODING') {
    await validateCodingLessonForPublish(lesson);
  }

  if (payload.slug) {
    lesson.slug = await uniqueSlug(Lesson, slugify(payload.slug), lesson._id);
  }

  await lesson.save();
  await syncCourseStats(lesson.courseId);

  if (payload.status === 'PUBLISHED' || payload.status === 'ARCHIVED') {
    const enrollments = await Enrollment.find({ courseId: lesson.courseId, status: { $in: ['ACTIVE', 'COMPLETED'] } });
    await Promise.all(
      enrollments.map((enrollment) =>
        lessonProgressService.recalculateEnrollment(enrollment.userId, lesson.courseId),
      ),
    );
  }

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
    passingPercentage: payload.passingPercentage ?? 70,
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

const CODING_LANGUAGES = ['HTML', 'CSS', 'JavaScript'];

function parseTestCases(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function buildStarterCode(payload) {
  const entries = [];
  if (payload.htmlStarter?.trim()) {
    entries.push({ language: 'HTML', code: payload.htmlStarter });
  }
  if (payload.cssStarter?.trim()) {
    entries.push({ language: 'CSS', code: payload.cssStarter });
  }
  if (payload.javascriptStarter?.trim()) {
    entries.push({ language: 'JavaScript', code: payload.javascriptStarter });
  }
  return entries;
}

function buildReferenceSolutions(payload) {
  const entries = [];
  if (payload.referenceHtml?.trim()) {
    entries.push({ language: 'HTML', code: payload.referenceHtml });
  }
  if (payload.referenceCss?.trim()) {
    entries.push({ language: 'CSS', code: payload.referenceCss });
  }
  if (payload.referenceJavascript?.trim()) {
    entries.push({ language: 'JavaScript', code: payload.referenceJavascript });
  }
  return entries;
}

function extractReferenceCode(referenceSolutions = []) {
  return referenceSolutions.reduce(
    (acc, item) => {
      const key = item.language.toLowerCase();
      if (key.includes('html')) acc.html = item.code;
      else if (key.includes('css')) acc.css = item.code;
      else if (key.includes('java')) acc.javascript = item.code;
      return acc;
    },
    { html: '', css: '', javascript: '' },
  );
}

async function validateCodingLessonForPublish(lesson) {
  if (lesson.type !== 'CODING') return;

  const errors = [];
  if (!lesson.title?.trim()) errors.push('Title is required.');
  if (!lesson.completionXpReward && lesson.completionXpReward !== 0) {
    errors.push('Completion XP reward is required.');
  }
  if (!lesson.assessmentId) {
    errors.push('Assessment is required.');
    throw new Error(`Cannot publish coding lesson: ${errors.join(' ')}`);
  }

  const assessment = await Assessment.findById(lesson.assessmentId);
  if (!assessment) errors.push('Assessment not found.');

  const entry = assessment?.questions?.[0];
  if (!entry) errors.push('Coding question is required.');

  const question = entry ? await Question.findById(entry.questionId) : null;
  if (!question || question.type !== 'CODING') {
    errors.push('A CODING question must be linked.');
  } else {
    if (!question.prompt?.trim()) errors.push('Problem statement is required.');
    const starter = question.codingDetails?.starterCode || [];
    if (!starter.length) errors.push('At least one starter code field is required.');
    const visibleTests =
      question.codingDetails?.visibleTestCases?.length ||
      question.codingDetails?.sampleTestCases?.length;
    if (!visibleTests) errors.push('At least one test case is required.');
  }

  const solution = question ? await QuestionSolution.findOne({ questionId: question._id }) : null;
  if (!solution) errors.push('Question solution is required.');

  if (errors.length) {
    throw new Error(`Cannot publish coding lesson: ${errors.join(' ')}`);
  }
}

const createLessonCoding = async (adminId, lessonId, payload) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found.');

  const course = await Course.findById(lesson.courseId);
  const skillId = payload.skillId || course?.skillIds?.[0];
  if (!skillId) throw new Error('Skill is required for coding questions.');

  const skill = await Skill.findById(skillId);
  if (!skill) throw new Error('Skill not found.');

  if (!payload.problemStatement?.trim()) {
    throw new Error('Problem statement is required.');
  }

  const visibleTestCases = parseTestCases(payload.visibleTestCases || payload.sampleTestCases);
  const hiddenTestCases = parseTestCases(payload.hiddenTestCases);
  const starterCode = buildStarterCode(payload);

  if (!starterCode.length) {
    throw new Error('At least one starter code field is required.');
  }

  let assessment = null;
  let question = null;

  try {
    assessment = await Assessment.create({
      title: payload.problemTitle?.trim() || `${lesson.title} Challenge`,
      description: payload.instructions?.trim() || '',
      type: 'LESSON_QUIZ',
      mode: 'CODING',
      courseId: lesson.courseId,
      moduleId: lesson.moduleId,
      lessonId: lesson._id,
      difficulty: payload.difficulty || 'MEDIUM',
      xpReward: payload.xpReward || lesson.completionXpReward || 15,
      passingPercentage: payload.passingThreshold ?? 100,
      status: payload.status || 'DRAFT',
      createdBy: adminId,
    });

    question = await Question.create({
      type: 'CODING',
      skillId,
      courseId: lesson.courseId,
      difficulty: payload.difficulty || 'MEDIUM',
      title: payload.problemTitle?.trim() || lesson.title,
      prompt: payload.problemStatement.trim(),
      codingDetails: {
        supportedLanguages: CODING_LANGUAGES,
        starterCode,
        instructions: payload.instructions?.trim() || '',
        expectedOutputDescription: payload.expectedOutputDescription?.trim() || '',
        hints: (payload.hints || []).filter(Boolean),
        visibleTestCases,
        sampleTestCases: visibleTestCases,
      },
      status: payload.status || 'DRAFT',
      createdBy: adminId,
    });

    await QuestionSolution.create({
      questionId: question._id,
      explanation: payload.solutionExplanation?.trim() || '',
      codingSolution: {
        referenceSolutions: buildReferenceSolutions(payload),
        hiddenTestCases,
      },
    });

    assessment.questions.push({
      questionId: question._id,
      order: 0,
      points: payload.points || 100,
    });
    await assessment.save();

    lesson.type = 'CODING';
    lesson.assessmentId = assessment._id;
    if (payload.completionXpReward !== undefined) {
      lesson.completionXpReward = payload.completionXpReward;
    }
    await lesson.save();
  } catch (error) {
    if (question?._id) {
      await QuestionSolution.deleteMany({ questionId: question._id });
      await Question.findByIdAndDelete(question._id);
    }
    if (assessment?._id) {
      await Assessment.findByIdAndDelete(assessment._id);
    }
    throw error;
  }

  const populated = await Assessment.findById(assessment._id).populate('skillId', 'name');
  return {
    lesson: formatLesson(lesson),
    assessment: formatAssessment(populated),
    questionId: question._id.toString(),
  };
};

const getLessonCoding = async (lessonId) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson || lesson.type !== 'CODING') throw new Error('Coding lesson not found.');

  const assessment = lesson.assessmentId
    ? await Assessment.findById(lesson.assessmentId)
    : null;
  const entry = assessment?.questions?.[0];
  const question = entry ? await Question.findById(entry.questionId) : null;
  const solution = question ? await QuestionSolution.findOne({ questionId: question._id }) : null;

  const starter = (question?.codingDetails?.starterCode || []).reduce(
    (acc, item) => {
      const key = item.language.toLowerCase();
      if (key.includes('html')) acc.html = item.code;
      else if (key.includes('css')) acc.css = item.code;
      else if (key.includes('java')) acc.javascript = item.code;
      return acc;
    },
    { html: '', css: '', javascript: '' },
  );

  const reference = (solution?.codingSolution?.referenceSolutions || []).reduce(
    (acc, item) => {
      const key = item.language.toLowerCase();
      if (key.includes('html')) acc.html = item.code;
      else if (key.includes('css')) acc.css = item.code;
      else if (key.includes('java')) acc.javascript = item.code;
      return acc;
    },
    { html: '', css: '', javascript: '' },
  );

  return {
    lesson: formatLesson(lesson),
    assessment: assessment ? formatAssessment(assessment) : null,
    coding: question
      ? {
          questionId: question._id.toString(),
          problemTitle: question.title || '',
          problemStatement: question.prompt,
          instructions: question.codingDetails?.instructions || '',
          expectedOutputDescription: question.codingDetails?.expectedOutputDescription || '',
          hints: question.codingDetails?.hints || [],
          htmlStarter: starter.html,
          cssStarter: starter.css,
          javascriptStarter: starter.javascript,
          visibleTestCases: question.codingDetails?.visibleTestCases || [],
          sampleTestCases: question.codingDetails?.sampleTestCases || [],
          hiddenTestCases: solution?.codingSolution?.hiddenTestCases || [],
          passingThreshold: assessment?.passingPercentage ?? 100,
          solutionExplanation: solution?.explanation || '',
          referenceHtml: reference.html,
          referenceCss: reference.css,
          referenceJavascript: reference.javascript,
        }
      : null,
  };
};

const updateLessonCoding = async (adminId, lessonId, payload) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson || lesson.type !== 'CODING') throw new Error('Coding lesson not found.');

  if (!lesson.assessmentId) {
    return createLessonCoding(adminId, lessonId, payload);
  }

  const assessment = await Assessment.findById(lesson.assessmentId);
  const entry = assessment?.questions?.[0];
  const question = entry ? await Question.findById(entry.questionId) : null;
  if (!question) throw new Error('Coding question not found.');

  const visibleTestCases = parseTestCases(
    payload.visibleTestCases ?? payload.sampleTestCases ?? question.codingDetails?.visibleTestCases,
  );
  const hiddenTestCases = parseTestCases(
    payload.hiddenTestCases ?? (await QuestionSolution.findOne({ questionId: question._id }))
      ?.codingSolution?.hiddenTestCases,
  );

  if (payload.problemTitle !== undefined) question.title = payload.problemTitle.trim();
  if (payload.problemStatement !== undefined) question.prompt = payload.problemStatement.trim();
  if (payload.instructions !== undefined) {
    question.codingDetails.instructions = payload.instructions.trim();
  }
  if (payload.expectedOutputDescription !== undefined) {
    question.codingDetails.expectedOutputDescription = payload.expectedOutputDescription.trim();
  }
  if (payload.hints !== undefined) {
    question.codingDetails.hints = (payload.hints || []).filter(Boolean);
  }

  const starterCode = buildStarterCode({
    htmlStarter: payload.htmlStarter,
    cssStarter: payload.cssStarter,
    javascriptStarter: payload.javascriptStarter,
  });
  if (starterCode.length) {
    question.codingDetails.starterCode = starterCode;
  }
  if (visibleTestCases.length) {
    question.codingDetails.visibleTestCases = visibleTestCases;
    question.codingDetails.sampleTestCases = visibleTestCases;
  }

  await question.save();

  let solution = await QuestionSolution.findOne({ questionId: question._id });
  if (!solution) {
    solution = await QuestionSolution.create({ questionId: question._id });
  }
  if (payload.solutionExplanation !== undefined) {
    solution.explanation = payload.solutionExplanation.trim();
  }
  if (hiddenTestCases.length || payload.referenceHtml || payload.referenceCss || payload.referenceJavascript) {
    solution.codingSolution = solution.codingSolution || {};
    if (hiddenTestCases.length) {
      solution.codingSolution.hiddenTestCases = hiddenTestCases;
    }
    const refs = buildReferenceSolutions(payload);
    if (refs.length) solution.codingSolution.referenceSolutions = refs;
    await solution.save();
  }

  if (payload.passingThreshold !== undefined) {
    assessment.passingPercentage = payload.passingThreshold;
  }
  if (payload.problemTitle !== undefined) {
    assessment.title = payload.problemTitle.trim();
  }
  if (payload.title !== undefined && payload.title.trim()) {
    lesson.title = payload.title.trim();
  }
  if (payload.description !== undefined) {
    lesson.description = payload.description.trim();
  }
  if (payload.durationMinutes !== undefined) {
    lesson.durationMinutes = payload.durationMinutes;
  }
  if (payload.status) {
    lesson.status = payload.status;
  }
  await assessment.save();

  if (
    payload.title !== undefined ||
    payload.description !== undefined ||
    payload.durationMinutes !== undefined ||
    payload.status ||
    payload.completionXpReward !== undefined
  ) {
    if (payload.completionXpReward !== undefined) {
      lesson.completionXpReward = payload.completionXpReward;
    }
    await lesson.save();
  } else if (payload.completionXpReward !== undefined) {
    lesson.completionXpReward = payload.completionXpReward;
    await lesson.save();
  }

  return getLessonCoding(lessonId);
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
      const correctOptionIds = solution?.correctOptionIds || [];
      const baseQuestion = {
        id: question._id.toString(),
        type: question.type,
        prompt: question.prompt,
        title: question.title || '',
        difficulty: question.difficulty,
        options: question.options || [],
        correctOptionId: correctOptionIds[0] || null,
        correctOptionIds,
        explanation: solution?.explanation || '',
        points: entry.points,
        order: entry.order,
      };

      if (question.type === 'CODING') {
        const details = question.codingDetails || {};
        const codingSolution = solution?.codingSolution || {};
        const reference = extractReferenceCode(codingSolution.referenceSolutions || []);
        return {
          ...baseQuestion,
          instructions: details.instructions || '',
          expectedOutputDescription: details.expectedOutputDescription || '',
          hints: details.hints || [],
          visibleTestCases: details.visibleTestCases?.length
            ? details.visibleTestCases
            : details.sampleTestCases || [],
          hiddenTestCases: codingSolution.hiddenTestCases || [],
          starterCode: details.starterCode || [],
          referenceHtml: reference.html,
          referenceCss: reference.css,
          referenceJavascript: reference.javascript,
        };
      }

      return baseQuestion;
    })
    .filter(Boolean);

  return {
    ...formatAssessment(assessment),
    courseId: assessment.courseId?.toString() || null,
    moduleId: assessment.moduleId?.toString() || null,
    lessonId: assessment.lessonId?.toString() || null,
    questions: formattedQuestions,
    seriesParts: await getPracticeSeriesParts(assessment),
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

const XP_SOURCE_LABELS = {
  LESSON_COMPLETION: 'Lesson completion',
  COURSE_COMPLETION: 'Course completion',
  QUIZ: 'Quiz',
  PRACTICE: 'Practice',
  DAILY_CHALLENGE: 'Daily challenge',
  BATTLE_WIN: 'Battle victory',
  BATTLE_PARTICIPATION: 'Battle participation',
  STREAK: 'Streak bonus',
  ACHIEVEMENT: 'Achievement',
  ADMIN: 'Admin adjustment',
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

const getUserXpHistory = async (userId) => {
  const user = await User.findById(userId).select('name email role');
  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'ADMIN') {
    return {
      userId: user._id.toString(),
      userName: user.name,
      totalXp: 0,
      summaryBySource: [],
      entries: [],
    };
  }

  const [stats, transactions] = await Promise.all([
    UserStats.findOne({ userId: user._id }),
    XPTransaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(500).lean(),
  ]);

  const summaryMap = new Map();

  for (const transaction of transactions) {
    const key = transaction.sourceType;
    const current = summaryMap.get(key) || {
      sourceType: key,
      sourceLabel: XP_SOURCE_LABELS[key] || key,
      earned: 0,
      reversed: 0,
      net: 0,
      count: 0,
    };

    if (transaction.transactionType === 'EARN' || transaction.amount > 0) {
      current.earned += Math.max(0, transaction.amount);
    } else {
      current.reversed += Math.abs(transaction.amount);
    }
    current.net += transaction.amount;
    current.count += 1;
    summaryMap.set(key, current);
  }

  const summaryBySource = [...summaryMap.values()]
    .filter((row) => row.net !== 0 || row.count > 0)
    .sort((a, b) => b.net - a.net);

  return {
    userId: user._id.toString(),
    userName: user.name,
    totalXp: stats?.totalXp ?? 0,
    summaryBySource,
    entries: transactions.map((transaction) => ({
      id: transaction._id.toString(),
      date: transaction.createdAt,
      transactionType: transaction.transactionType,
      sourceType: transaction.sourceType,
      sourceLabel: XP_SOURCE_LABELS[transaction.sourceType] || transaction.sourceType,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      description: transaction.description || '',
    })),
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

async function resolveSkillForCourse(categoryId, skillName, adminId) {
  const normalized = skillName?.trim();
  if (!normalized) return null;

  const existing = await Skill.findOne({
    categoryId,
    name: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    status: 'ACTIVE',
  });
  if (existing) return existing;

  return Skill.create({
    categoryId,
    name: normalized,
    slug: await uniqueSlug(Skill, slugify(normalized)),
    description: `${normalized} skills for course content.`,
    status: 'ACTIVE',
  });
}

async function materializeLesson(adminId, courseId, moduleId, skillId, lessonDef) {
  const basePayload = {
    title: lessonDef.title,
    description: lessonDef.description,
    type: lessonDef.type,
    durationMinutes: lessonDef.durationMinutes,
    completionXpReward: lessonDef.completionXpReward,
    status: 'DRAFT',
  };

  if (lessonDef.type === 'ARTICLE') {
    return createLesson(courseId, moduleId, {
      ...basePayload,
      content: { articleHtml: lessonDef.articleHtml || `# ${lessonDef.title}\n\n${lessonDef.description}` },
    });
  }

  if (lessonDef.type === 'VIDEO') {
    return createLesson(courseId, moduleId, {
      ...basePayload,
      content: { videoUrl: lessonDef.videoUrl || '' },
    });
  }

  const lesson = await createLesson(courseId, moduleId, basePayload);

  if (lessonDef.type === 'QUIZ') {
    const quizSetup = await createLessonQuiz(adminId, lesson.id, {
      title: `${lessonDef.title} Quiz`,
      passingPercentage: lessonDef.passingPercentage,
      status: 'DRAFT',
    });

    for (const questionDef of lessonDef.questions) {
      const options = questionDef.options.slice(0, 4).map((text, index) => ({
        optionId: `opt-${index + 1}`,
        text: String(text),
      }));
      while (options.length < 4) {
        options.push({
          optionId: `opt-${options.length + 1}`,
          text: `Option ${options.length + 1}`,
        });
      }
      const correctIndex = Math.min(
        Math.max(Number(questionDef.correctIndex) || 0, 0),
        options.length - 1,
      );
      const question = await createQuestion(adminId, {
        prompt: questionDef.prompt,
        skillId,
        difficulty: 'EASY',
        options,
        correctOptionId: options[correctIndex].optionId,
        explanation: questionDef.explanation || '',
      });
      await addQuestionToAssessment(quizSetup.assessment.id, { questionId: question.id });
    }

    return quizSetup.lesson;
  }

  if (lessonDef.type === 'CODING') {
    await createLessonCoding(adminId, lesson.id, {
      skillId,
      problemTitle: lessonDef.problemTitle,
      problemStatement: lessonDef.problemStatement,
      instructions: lessonDef.instructions,
      htmlStarter: lessonDef.htmlStarter,
      cssStarter: lessonDef.cssStarter,
      javascriptStarter: lessonDef.javascriptStarter,
      hints: lessonDef.hints,
      visibleTestCases: lessonDef.visibleTestCases,
      hiddenTestCases: lessonDef.hiddenTestCases,
      passingThreshold: lessonDef.passingThreshold,
      expectedOutputDescription: lessonDef.expectedOutputDescription,
      solutionExplanation: lessonDef.solutionExplanation,
      referenceHtml: lessonDef.referenceHtml,
      referenceCss: lessonDef.referenceCss,
      referenceJavascript: lessonDef.referenceJavascript,
      completionXpReward: lessonDef.completionXpReward,
      status: 'DRAFT',
    });
    const updated = await Lesson.findById(lesson.id);
    return formatLesson(updated);
  }

  return lesson;
}

async function createPracticeCodingQuestion(adminId, assessmentId, payload) {
  const assessment = await Assessment.findOne({ _id: assessmentId, type: 'PRACTICE' });
  if (!assessment) {
    throw new Error('Practice set not found.');
  }

  const skillId = payload.skillId || assessment.skillId;
  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Skill not found.');
  }

  if (!payload.problemStatement?.trim()) {
    throw new Error('Problem statement is required.');
  }

  const visibleTestCases = parseTestCases(payload.visibleTestCases || payload.sampleTestCases);
  const hiddenTestCases = parseTestCases(payload.hiddenTestCases);
  const starterCode = buildStarterCode(payload);

  if (!starterCode.length) {
    throw new Error('At least one starter code field is required.');
  }

  const question = await Question.create({
    type: 'CODING',
    skillId,
    difficulty: payload.difficulty || assessment.difficulty || 'MEDIUM',
    title: payload.problemTitle?.trim() || assessment.title,
    prompt: payload.problemStatement.trim(),
    codingDetails: {
      supportedLanguages: CODING_LANGUAGES,
      starterCode,
      instructions: payload.instructions?.trim() || '',
      expectedOutputDescription: payload.expectedOutputDescription?.trim() || '',
      hints: (payload.hints || []).filter(Boolean),
      visibleTestCases,
      sampleTestCases: visibleTestCases,
    },
    status: 'PUBLISHED',
    createdBy: adminId,
  });

  await QuestionSolution.create({
    questionId: question._id,
    explanation: payload.solutionExplanation?.trim() || '',
    codingSolution: {
      referenceSolutions: buildReferenceSolutions(payload),
      hiddenTestCases,
    },
  });

  assessment.questions.push({
    questionId: question._id,
    order: assessment.questions.length,
    points: payload.points || 100,
  });

  if (payload.passingThreshold != null) {
    assessment.passingPercentage = payload.passingThreshold;
  }

  await assessment.save();
  const populated = await Assessment.findById(assessment._id).populate('skillId', 'name');
  return formatAssessment(populated);
}

async function generatePracticeWithAI(adminId, payload) {
  const briefInput = payload.description?.trim() || payload.brief?.trim() || payload.content?.trim();
  const titleInput = payload.title?.trim();
  const adminMode = String(payload.mode || 'QUIZ').toUpperCase();
  const adminQuestionType = String(payload.questionType || 'SINGLE_CHOICE').toUpperCase();

  if (!briefInput) {
    throw new Error('Provide content or a brief for the AI to plan from.');
  }

  if (!payload.assessmentId && !['QUIZ', 'CODING'].includes(adminMode)) {
    throw new Error('Select a practice type: Quiz or Coding.');
  }

  let assessmentRecord = null;

  if (payload.assessmentId) {
    assessmentRecord = await Assessment.findOne({
      _id: payload.assessmentId,
      type: 'PRACTICE',
    });
    if (!assessmentRecord) {
      throw new Error('Practice set not found.');
    }
  }

  const resolvedMode = assessmentRecord?.mode || adminMode;
  const resolvedQuestionType = resolvedMode === 'QUIZ' ? adminQuestionType : null;

  let seriesContext = null;
  if (!assessmentRecord && titleInput) {
    seriesContext = await resolvePracticeSeriesForCreate(titleInput);
  }

  let existingQuestionPrompts = [];
  if (assessmentRecord) {
    existingQuestionPrompts = await collectQuestionPromptsFromAssessments([assessmentRecord.toObject()]);
  }

  const skills = await Skill.find({ status: 'ACTIVE' }).select('name').lean();
  const plan = await generatePracticePlanFromAi(
    {
      content: briefInput,
      title: titleInput || assessmentRecord?.title,
      skills,
      addingToExisting: Boolean(assessmentRecord),
      existingMode: assessmentRecord?.mode || adminMode,
      existingQuestionCount: assessmentRecord?.questions?.length || 0,
      adminMode: resolvedMode,
      questionType: resolvedQuestionType,
      seriesPart: seriesContext?.seriesPart,
      seriesBaseTitle: seriesContext?.baseTitle,
      isSeriesContinuation: seriesContext?.isContinuation,
      existingQuestionPrompts: [
        ...(seriesContext?.priorQuestionPrompts || []),
        ...existingQuestionPrompts,
      ],
    },
    adminId,
  );

  if (!assessmentRecord && !seriesContext) {
    seriesContext = await resolvePracticeSeriesForCreate(titleInput || plan.title);
  }

  if (!assessmentRecord && seriesContext?.priorQuestionPrompts?.length) {
    existingQuestionPrompts = seriesContext.priorQuestionPrompts;
  }

  let skillId = assessmentRecord?.skillId?.toString();
  if (!skillId && seriesContext?.rootAssessment?.skillId) {
    skillId = seriesContext.rootAssessment.skillId.toString();
  }
  if (!skillId) {
    const skillResult = await createSkill({ name: plan.skillName });
    skillId = skillResult.id;
  }

  const skill = await Skill.findById(skillId);
  if (!skill) {
    throw new Error('Could not resolve a skill for this practice set.');
  }

  const mode = resolvedMode;
  const questionCountBefore = assessmentRecord?.questions?.length || 0;

  if (!assessmentRecord) {
    assessmentRecord = await Assessment.create({
      title: titleInput || plan.title,
      description: plan.description || briefInput,
      type: 'PRACTICE',
      mode: seriesContext?.rootAssessment?.mode || mode,
      skillId: skill._id,
      difficulty: plan.difficulty,
      xpReward: plan.xpReward,
      passingPercentage: plan.passingPercentage,
      status: 'DRAFT',
      createdBy: adminId,
    });

    if (seriesContext) {
      await applyPracticeSeriesToAssessment(assessmentRecord, seriesContext);
    } else {
      await applyPracticeSeriesToAssessment(assessmentRecord, {
        baseTitle: assessmentRecord.title,
        seriesPart: 1,
        seriesRootId: null,
        isContinuation: false,
        rootAssessment: null,
      });
    }
  }

  const aiPlan = {
    ...plan,
    title: assessmentRecord.title,
    mode,
    questionType: resolvedQuestionType,
    questionCount: mode === 'CODING' ? 1 : plan.questionCount,
    questionFocus: plan.questionFocus || briefInput,
    skillName: skill.name,
    seriesPart: assessmentRecord.seriesPart || seriesContext?.seriesPart || 1,
    seriesBaseTitle: assessmentRecord.seriesBaseTitle || seriesContext?.baseTitle || null,
    isSeriesContinuation: Boolean(seriesContext?.isContinuation),
    existingQuestionPrompts,
  };

  if (mode === 'CODING') {
    if (assessmentRecord.questions?.length) {
      throw new Error('This practice set already has a coding challenge. Remove it first or create a new set.');
    }

    const coding = await generatePracticeCodingChallenge(aiPlan, adminId);
    await createPracticeCodingQuestion(adminId, assessmentRecord._id, {
      ...coding,
      skillId: skill._id,
      difficulty: aiPlan.difficulty === 'MIXED' ? 'MEDIUM' : aiPlan.difficulty,
    });
  } else {
    const generatedQuestions = await generatePracticeQuizQuestions(aiPlan, adminId);
    const questionDifficulty =
      aiPlan.difficulty === 'MIXED' ? 'MEDIUM' : aiPlan.difficulty;
    const questionType = aiPlan.questionType || 'SINGLE_CHOICE';

    for (const questionDef of generatedQuestions) {
      const optionLimit = questionType === 'MULTIPLE_CHOICE' ? 5 : questionType === 'TRUE_FALSE' ? 2 : 4;
      const options = questionDef.options.slice(0, optionLimit).map((text, index) => ({
        optionId: `opt-${index + 1}`,
        text: String(text).trim(),
      }));

      let correctOptionIds = [];
      if (questionType === 'MULTIPLE_CHOICE') {
        correctOptionIds = (questionDef.correctIndices || [])
          .map((index) => options[index]?.optionId)
          .filter(Boolean);
        if (correctOptionIds.length < 2 && options[0]) {
          correctOptionIds = [options[0].optionId, options[1]?.optionId].filter(Boolean);
        }
      } else {
        const correctIndex = Math.min(
          Math.max(Number(questionDef.correctIndex) || 0, 0),
          options.length - 1,
        );
        correctOptionIds = [options[correctIndex].optionId];
      }

      const question = await createQuestion(adminId, {
        prompt: questionDef.prompt,
        skillId: skill._id,
        difficulty: questionDifficulty,
        type: questionType,
        options,
        correctOptionIds,
        explanation: questionDef.explanation || '',
      });
      await addQuestionToAssessment(assessmentRecord._id, { questionId: question.id });
    }
  }

  const populated = await Assessment.findById(assessmentRecord._id).populate('skillId', 'name');
  const totalQuestionCount = populated.questions.length;
  const addedQuestionCount = totalQuestionCount - questionCountBefore;

  return {
    assessment: formatAssessment(populated),
    questionCount: addedQuestionCount,
    totalQuestionCount,
    plan: {
      title: aiPlan.title,
      mode: aiPlan.mode,
      questionType: aiPlan.questionType,
      difficulty: aiPlan.difficulty,
      questionCount: addedQuestionCount,
    },
    series: populated.seriesPart > 1 || seriesContext?.isContinuation
      ? {
          isContinuation: true,
          seriesPart: populated.seriesPart,
          seriesBaseTitle: populated.seriesBaseTitle,
          avoidedQuestionCount: existingQuestionPrompts.length,
        }
      : null,
  };
}

const generateCourseWithAI = async (adminId, payload, options = {}) => {
  const onProgress = options.onProgress;
  const titleInput = payload.title?.trim();
  const briefInput = payload.brief?.trim();

  if (!briefInput && !titleInput) {
    throw new Error('Provide a course title or description for the AI to plan from.');
  }

  const categories = await listCategories();
  const plan = await generateCoursePlanFromAi(
    {
      title: titleInput || briefInput,
      brief: briefInput || titleInput,
      categories,
    },
    adminId,
    { onProgress },
  );

  if (onProgress) {
    onProgress({
      step: 'saving',
      message: 'Saving course to database…',
      moduleTotal: plan.modules.length,
      lessonTotal: plan.modules.reduce((count, module) => count + module.lessons.length, 0),
    });
  }

  const category = await createCategory({ name: plan.categoryName });
  const categoryId = category.id;
  const skill = await resolveSkillForCourse(categoryId, plan.skillName, adminId);
  if (!skill) throw new Error('Could not resolve a skill for this course.');

  let courseRecord = null;
  try {
    courseRecord = await createCourse(adminId, {
      title: titleInput || plan.title,
      shortDescription: plan.shortDescription,
      description: plan.description,
      categoryId,
      level: plan.level,
      skillIds: [skill._id],
      estimatedMinutes: plan.estimatedMinutes,
      completionXpReward: plan.completionXpReward,
      status: 'DRAFT',
    });

    let lessonTotal = 0;
    let moduleTotal = 0;

    for (let moduleIndex = 0; moduleIndex < plan.modules.length; moduleIndex += 1) {
      const moduleDef = plan.modules[moduleIndex];
      moduleTotal += 1;

      if (onProgress) {
        onProgress({
          step: 'saving',
          phase: 'module',
          moduleIndex,
          moduleTotal: plan.modules.length,
          moduleTitle: moduleDef.title,
          message: `Saving module ${moduleTotal}/${plan.modules.length}: ${moduleDef.title}`,
        });
      }

      const moduleDoc = await createModule(courseRecord.id, {
        title: moduleDef.title,
        description: moduleDef.description,
        status: 'ACTIVE',
      });

      for (const lessonDef of moduleDef.lessons) {
        lessonTotal += 1;
        await materializeLesson(adminId, courseRecord.id, moduleDoc.id, skill._id, lessonDef);
      }
    }

    if (!plan.estimatedMinutes) {
      await Course.findByIdAndUpdate(courseRecord.id, {
        estimatedMinutes: plan.modules.reduce(
          (sum, module) =>
            sum + module.lessons.reduce((inner, lesson) => inner + (lesson.durationMinutes || 0), 0),
          0,
        ),
      });
    }

    await syncCourseStats(courseRecord.id);
    const populated = await Course.findById(courseRecord.id).populate('categoryId', 'name');

    return {
      course: formatCourse(populated),
      summary: {
        modulesCreated: moduleTotal,
        lessonsCreated: lessonTotal,
        skillName: skill.name,
        categoryName: category.name,
        level: plan.level,
        aiTitle: plan.title,
      },
    };
  } catch (error) {
    if (courseRecord?.id) {
      try {
        await deleteCourse(courseRecord.id);
      } catch {
        /* best-effort rollback */
      }
    }
    throw error;
  }
};

module.exports = {
  getOverview,
  listCategories,
  createCategory,
  deleteCategory,
  listSkills,
  createSkill,
  deleteSkill,
  listCourses,
  createCourse,
  generateCourseWithAI,
  updateCourse,
  deleteCourse,
  listCourseModules,
  createModule,
  listModuleLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  createLessonQuiz,
  createLessonCoding,
  getLessonCoding,
  updateLessonCoding,
  validateCodingLessonForPublish,
  deleteModule,
  listAssessments,
  getAssessment,
  createPracticeAssessment,
  generatePracticeWithAI,
  createPracticeCodingQuestion,
  updateAssessment,
  deleteAssessment,
  createQuestion,
  updateQuestion,
  addQuestionToAssessment,
  removeQuestionFromAssessment,
  listBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listUsers,
  getUser,
  getUserXpHistory,
  updateUser,
  deleteUser,
};
