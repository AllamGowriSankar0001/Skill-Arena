const mongoose = require('mongoose');
const {
  ATTEMPT_CONTEXT_TYPES,
  ATTEMPT_STATUSES,
} = require('../constants/enums');

const attemptQuestionOrderSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const codeAnswerSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    code: { type: String, required: true },
  },
  { _id: false },
);

const executionResultSchema = new mongoose.Schema(
  {
    passedTestCases: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
    executionTimeMs: { type: Number },
    error: { type: String },
  },
  { _id: false },
);

const attemptAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    selectedOptionIds: { type: [String], default: [] },
    textAnswer: { type: String },
    codeAnswer: { type: codeAnswerSchema },
    isCorrect: { type: Boolean },
    score: { type: Number, default: 0, min: 0 },
    maxScore: { type: Number, default: 0, min: 0 },
    executionResult: { type: executionResultSchema },
    answeredAt: { type: Date },
  },
  { _id: false },
);

const assessmentAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
    },
    contextType: {
      type: String,
      enum: ATTEMPT_CONTEXT_TYPES,
      required: true,
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    status: {
      type: String,
      enum: ATTEMPT_STATUSES,
      default: 'IN_PROGRESS',
    },
    questionOrder: {
      type: [attemptQuestionOrderSchema],
      default: [],
    },
    answers: {
      type: [attemptAnswerSchema],
      default: [],
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    correctAnswerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    wrongAnswerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    skippedAnswerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    xpAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    evaluatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

assessmentAttemptSchema.index({ userId: 1, assessmentId: 1 });
assessmentAttemptSchema.index({ userId: 1, contextType: 1, createdAt: -1 });
assessmentAttemptSchema.index({ contextType: 1, contextId: 1 });
assessmentAttemptSchema.index({ status: 1 });

const AssessmentAttempt = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);

module.exports = AssessmentAttempt;
