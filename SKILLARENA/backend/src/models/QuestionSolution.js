const mongoose = require('mongoose');

const referenceSolutionSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    code: { type: String, required: true },
  },
  { _id: false },
);

const hiddenTestCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    points: { type: Number, default: 1, min: 0 },
  },
  { _id: false },
);

const codingSolutionSchema = new mongoose.Schema(
  {
    referenceSolutions: { type: [referenceSolutionSchema], default: [] },
    hiddenTestCases: { type: [hiddenTestCaseSchema], default: [] },
  },
  { _id: false },
);

const questionSolutionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      unique: true,
    },
    correctOptionIds: {
      type: [String],
      default: [],
    },
    acceptedTextAnswers: {
      type: [String],
      default: [],
    },
    explanation: {
      type: String,
    },
    codingSolution: {
      type: codingSolutionSchema,
    },
  },
  {
    timestamps: true,
  },
);

const QuestionSolution = mongoose.model('QuestionSolution', questionSolutionSchema);

module.exports = QuestionSolution;
