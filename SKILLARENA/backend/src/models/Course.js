const mongoose = require('mongoose');
const { CONTENT_STATUSES, COURSE_LEVELS } = require('../constants/enums');

const courseStatsSchema = new mongoose.Schema(
  {
    enrollmentCount: { type: Number, default: 0 },
    completionCount: { type: Number, default: 0 },
    moduleCount: { type: Number, default: 0 },
    lessonCount: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    bannerUrl: {
      type: String,
      trim: true,
    },
    previewVideoUrl: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    skillIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    level: {
      type: String,
      enum: COURSE_LEVELS,
      default: 'BEGINNER',
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
    estimatedMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionXpReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    prerequisites: {
      type: [String],
      default: [],
    },
    learningOutcomes: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: 'DRAFT',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    contentVersion: {
      type: Number,
      default: 1,
    },
    stats: {
      type: courseStatsSchema,
      default: () => ({}),
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

courseSchema.index({ categoryId: 1 });
courseSchema.index({ skillIds: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ isFeatured: 1 });
courseSchema.index({ title: 'text', shortDescription: 'text' });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
