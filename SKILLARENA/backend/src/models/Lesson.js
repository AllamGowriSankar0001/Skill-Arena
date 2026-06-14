const mongoose = require('mongoose');
const { CONTENT_STATUSES, LESSON_TYPES } = require('../constants/enums');

const lessonContentSchema = new mongoose.Schema(
  {
    videoUrl: { type: String, trim: true },
    articleHtml: { type: String },
    resourceUrls: { type: [String], default: [] },
    downloadableFiles: { type: [String], default: [] },
  },
  { _id: false },
);

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: LESSON_TYPES,
      required: true,
    },
    content: {
      type: lessonContentSchema,
      default: () => ({}),
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    completionXpReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
    },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: 'DRAFT',
    },
  },
  {
    timestamps: true,
  },
);

lessonSchema.index({ moduleId: 1, order: 1 }, { unique: true });
lessonSchema.index({ courseId: 1 });
lessonSchema.index({ moduleId: 1 });
lessonSchema.index({ status: 1 });

const Lesson = mongoose.model('Lesson', lessonSchema);

module.exports = Lesson;
