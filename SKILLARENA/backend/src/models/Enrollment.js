const mongoose = require('mongoose');
const { ENROLLMENT_STATUSES } = require('../constants/enums');

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    status: {
      type: String,
      enum: ENROLLMENT_STATUSES,
      default: 'ACTIVE',
    },
    currentModuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
    },
    currentLessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    completedLessonCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLessons: {
      type: Number,
      default: 0,
      min: 0,
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalTimeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    courseVersion: {
      type: Number,
      default: 1,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
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

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ userId: 1, status: 1 });
enrollmentSchema.index({ userId: 1, lastAccessedAt: -1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;
