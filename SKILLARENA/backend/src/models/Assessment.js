const mongoose = require('mongoose');
const {
  ASSESSMENT_TYPES,
  ASSESSMENT_MODES,
  DIFFICULTIES,
  CONTENT_STATUSES,
} = require('../constants/enums');

const assessmentQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ASSESSMENT_TYPES,
      required: true,
    },
    mode: {
      type: String,
      enum: ASSESSMENT_MODES,
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      default: 'MIXED',
    },
    questions: {
      type: [assessmentQuestionSchema],
      default: [],
    },
    durationSeconds: {
      type: Number,
      min: 0,
    },
    passingPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    attemptsAllowed: {
      type: Number,
      min: 1,
    },
    shuffleQuestions: {
      type: Boolean,
      default: true,
    },
    shuffleOptions: {
      type: Boolean,
      default: true,
    },
    xpReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: 'DRAFT',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seriesRootId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
    },
    seriesPart: {
      type: Number,
      min: 1,
      default: 1,
    },
    seriesBaseTitle: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

assessmentSchema.index({ type: 1 });
assessmentSchema.index({ courseId: 1 });
assessmentSchema.index({ lessonId: 1 });
assessmentSchema.index({ skillId: 1 });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ seriesRootId: 1, seriesPart: 1 });
assessmentSchema.index({ seriesBaseTitle: 1, type: 1 });

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;
