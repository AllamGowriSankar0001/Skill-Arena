const mongoose = require('mongoose');
const { QUESTION_TYPES, DIFFICULTIES, CONTENT_STATUSES } = require('../constants/enums');

const questionOptionSchema = new mongoose.Schema(
  {
    optionId: { type: String, required: true },
    text: { type: String, required: true },
    imageUrl: { type: String, trim: true },
  },
  { _id: false },
);

const starterCodeSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    code: { type: String, required: true },
  },
  { _id: false },
);

const sampleTestCaseSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true },
    selector: { type: String, trim: true },
    attribute: { type: String, trim: true },
    property: { type: String, trim: true },
    variable: { type: String, trim: true },
    expected: { type: mongoose.Schema.Types.Mixed },
    label: { type: String, trim: true },
    points: { type: Number, default: 1, min: 0 },
    input: { type: String },
    expectedOutput: { type: String },
  },
  { _id: false },
);

const codingDetailsSchema = new mongoose.Schema(
  {
    supportedLanguages: { type: [String], default: [] },
    starterCode: { type: [starterCodeSchema], default: [] },
    functionName: { type: String, trim: true },
    constraints: { type: [String], default: [] },
    inputFormat: { type: String },
    outputFormat: { type: String },
    instructions: { type: String },
    expectedOutputDescription: { type: String },
    hints: { type: [String], default: [] },
    sampleTestCases: { type: [sampleTestCaseSchema], default: [] },
    visibleTestCases: { type: [sampleTestCaseSchema], default: [] },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES.filter((d) => d !== 'MIXED'),
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    options: {
      type: [questionOptionSchema],
      default: [],
    },
    codingDetails: {
      type: codingDetailsSchema,
    },
    tags: {
      type: [String],
      default: [],
    },
    defaultPoints: {
      type: Number,
      default: 10,
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
  },
  {
    timestamps: true,
  },
);

questionSchema.index({ skillId: 1, difficulty: 1, status: 1 });
questionSchema.index({ courseId: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ type: 1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
