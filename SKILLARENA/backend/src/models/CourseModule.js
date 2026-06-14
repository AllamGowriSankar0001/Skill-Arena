const mongoose = require('mongoose');
const { ACTIVE_STATUSES } = require('../constants/enums');

const courseModuleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ACTIVE_STATUSES,
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  },
);

courseModuleSchema.index({ courseId: 1, order: 1 }, { unique: true });
courseModuleSchema.index({ courseId: 1 });

const CourseModule = mongoose.model('CourseModule', courseModuleSchema);

module.exports = CourseModule;
