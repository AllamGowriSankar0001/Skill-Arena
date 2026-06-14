const mongoose = require('mongoose');
const { LESSON_PROGRESS_STATUSES } = require('../constants/enums');

const lessonProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
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
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    status: {
      type: String,
      enum: LESSON_PROGRESS_STATUSES,
      default: 'NOT_STARTED',
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastVideoPositionSeconds: {
      type: Number,
      min: 0,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    attemptsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    firstStartedAt: {
      type: Date,
    },
    lastAccessedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ userId: 1, courseId: 1 });
lessonProgressSchema.index({ enrollmentId: 1, status: 1 });

const LessonProgress = mongoose.model('LessonProgress', lessonProgressSchema);

module.exports = LessonProgress;
